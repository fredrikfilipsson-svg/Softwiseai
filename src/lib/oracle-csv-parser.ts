/**
 * CSV Parser for Oracle LMS Collection files.
 *
 * Handles two main file formats:
 * 1. Oracle LMS SQL spool format (CHR(35)||'^~*~^'||COLUMN||... headers with
 *    #^~*~^value^~*~^ data lines) — parsed with a dedicated LMS parser that
 *    bypasses CSV quote handling entirely.
 * 2. Standard CSV/TSV/pipe/semicolon delimited files — parsed with traditional
 *    CSV logic including quoted-field support.
 *
 * Also handles: BOM, null bytes, SQL*Plus metadata lines, and leading comments.
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  /** Diagnostic: the raw first meaningful line used as header */
  rawHeaderLine: string;
  /** Diagnostic: detected delimiter character */
  detectedDelimiter: string;
  /** Diagnostic: number of lines skipped before finding headers */
  skippedLines: number;
}

/** Well-known Oracle column names — used to validate header rows */
const KNOWN_ORACLE_COLUMNS = new Set([
  "APPLICATION_ID", "APPLICATION_SHORT_NAME", "APPLICATION_NAME", "BASEPATH",
  "APP_ID", "APPL_ID", "APP_SHORT_NAME", "SHORT_NAME",
  "RESPONSIBILITY_ID", "RESPONSIBILITY_KEY", "RESPONSIBILITY_NAME", "RESP_ID",
  "RESPONSIBILITY_APPLICATION_ID", "RESP_APPLICATION_ID", "RESP_APPL_ID",
  "USER_ID", "USER_NAME", "START_DATE", "END_DATE", "LAST_LOGON_DATE",
  "STATUS", "INSTALL_STATUS", "PATCH_LEVEL", "PRODUCT_VERSION",
  "LOGIN_ID", "LOGIN_RESP_ID", "SESSION_ID",
  "LANGUAGE", "SOURCE_LANG", "DESCRIPTION",
  "MENU_ID", "FUNCTION_ID", "FUNCTION_NAME", "ENTRY_SEQUENCE",
  "SECURITY_GROUP_ID", "SECURITY_GROUP_KEY",
  "HEADER_ID", "LINE_ID", "ORDER_NUMBER", "ORDER_SOURCE_ID",
  "ROLE_NAME", "USER_ORIG_SYSTEM", "ROLE_ORIG_SYSTEM",
  "END_DATE_ACTIVE", "CREATION_DATE", "LAST_UPDATE_DATE", "CREATED_BY",
]);

// ─── Oracle LMS SQL spool format ────────────────────────────────
//
// Oracle LMS collection scripts generate CSV files where:
//   HEADER = the raw SQL SELECT expression, e.g.:
//     CHR(35)||'^~*~^'||APPLICATION_ID||'^~*~^'||';'||'^~*~^'||APPLICATION_SHORT_NAME||'^~*~^'||...
//   DATA   = evaluated output, e.g.:
//     #^~*~^200^~*~^;^~*~^GL^~*~^;^~*~^General Ledger^~*~^
//
// IMPORTANT: These files often wrap each line in double-quotes, which breaks
// standard CSV line-splitting (the " chars in SQL expressions toggle quote
// state). We detect LMS format early via a raw-text pre-scan and use simple
// newline splitting instead.

/** The Oracle LMS "caret" delimiter token */
const LMS_CARET_DELIM = "^~*~^";

// ─── LMS format detection & parsing ─────────────────────────────

/**
 * Pre-scan raw file text to determine if it uses Oracle LMS format.
 * Checks for CHR(35) and ^~*~^ anywhere in the file content.
 */
function isLMSFileContent(text: string): boolean {
  return /CHR\s*\(\s*35\s*\)/i.test(text) && text.includes(LMS_CARET_DELIM);
}

/**
 * Detect whether a single line is an Oracle LMS SQL expression header.
 */
function isOracleLMSSQLHeader(line: string): boolean {
  return /CHR\s*\(\s*35\s*\)/i.test(line) && line.includes(LMS_CARET_DELIM) && line.includes("||");
}

/**
 * Check whether a data line uses ^~*~^ wrapping (LMS output format).
 */
function isLMSDataLine(line: string): boolean {
  return line.includes(LMS_CARET_DELIM);
}

/**
 * Extract column names from an Oracle LMS SQL SELECT expression.
 *
 * Input:  CHR(35)||'^~*~^'||APPLICATION_ID||'^~*~^'||';'||'^~*~^'||TO_CHAR(CREATION_DATE,'MM/DD/YYYY')||'^~*~^'
 * Output: ["APPLICATION_ID", "CREATION_DATE"]
 */
function extractColumnsFromLMSSQL(sqlLine: string): string[] {
  // Strip outer double-quotes
  let clean = sqlLine.trim();
  if (clean.startsWith('"')) clean = clean.slice(1);
  if (clean.endsWith('"')) clean = clean.slice(0, -1);

  // Split on ||';'|| or ||;|| to separate field segments
  const segments = clean.split(/\|\|\s*'?;'?\s*\|\|/);

  const columns: string[] = [];
  for (const seg of segments) {
    // Remove SQL boilerplate piece by piece
    let col = seg
      .replace(/CHR\s*\(\s*\d+\s*\)\s*\|\|/gi, "")   // CHR(n)||
      .replace(/\|\|\s*CHR\s*\(\s*\d+\s*\)/gi, "")     // ||CHR(n)
      .replace(/CHR\s*\(\s*\d+\s*\)/gi, "")             // standalone CHR(n)
      .replace(/'\^~\*~\^'\s*\|\|/g, "")                 // '^~*~^'||
      .replace(/\|\|\s*'\^~\*~\^'/g, "")                 // ||'^~*~^'
      .replace(/'\^~\*~\^'/g, "")                         // standalone '^~*~^'
      .replace(/^\|+|\|+$/g, "")                          // leading/trailing pipes
      .trim();

    if (!col) continue;

    // Handle SQL functions: TO_CHAR(COL, 'FMT'), NVL(COL, 'default'), etc.
    const funcMatch = col.match(
      /^(?:TO_CHAR|TO_NUMBER|TO_DATE|NVL|NVL2|DECODE|UPPER|LOWER|TRIM|SUBSTR|REPLACE|ROUND|TRUNC)\s*\(\s*([A-Z_][A-Z0-9_.]*)/i
    );
    if (funcMatch) {
      col = funcMatch[1];
    }

    // Handle aliased expressions: COLUMN_NAME ALIAS or COLUMN_NAME "ALIAS"
    const aliasMatch = col.match(/^([A-Z_][A-Z0-9_.]*)\s+(?:AS\s+)?["']?([A-Z_][A-Z0-9_]*)["']?$/i);
    if (aliasMatch) {
      col = aliasMatch[2] || aliasMatch[1];
    }

    // Only accept valid column names
    if (/^[A-Z_][A-Z0-9_.]*$/i.test(col)) {
      columns.push(col.toUpperCase());
    }
  }

  return columns;
}

/**
 * Parse an Oracle LMS data line.
 * Format: #^~*~^value1^~*~^;^~*~^value2^~*~^;^~*~^value3^~*~^
 * May also be wrapped in outer double-quotes.
 */
function parseLMSDataLine(line: string): string[] {
  let clean = line.trim();
  // Strip outer double-quotes
  if (clean.startsWith('"')) clean = clean.slice(1);
  if (clean.endsWith('"')) clean = clean.slice(0, -1);
  // Strip leading/trailing # (CHR(35) artifact)
  clean = clean.replace(/^#+/, "").replace(/#+$/, "");

  // Split on the caret delimiter
  const parts = clean.split(LMS_CARET_DELIM);

  // Filter out empty segments and the ';' separators between fields
  return parts
    .map((p) => p.trim())
    .filter((p) => p !== "" && p !== ";");
}

/**
 * Parse an entire file that uses Oracle LMS SQL/data format.
 *
 * Uses simple newline splitting (NOT CSV-aware splitCSVLines) because LMS
 * files contain " characters in SQL expressions that break CSV quote tracking.
 */
function parseLMSFile(text: string): ParsedCSV {
  // Simple newline split — no CSV quote handling needed for LMS files
  const rawLines = text.split(/\r?\n/);

  // Find the SQL header line (contains CHR(35) and ^~*~^)
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    if (isOracleLMSSQLHeader(line)) {
      headerIdx = i;
      break;
    }
  }

  // Fallback: if no SQL header found, look for first LMS data line
  if (headerIdx < 0) {
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (line && isLMSDataLine(line)) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx < 0) {
    return { headers: [], rows: [], rawHeaderLine: rawLines[0] || "", detectedDelimiter: "LMS_SQL", skippedLines: 0 };
  }

  const rawHeaderLine = rawLines[headerIdx];
  const headers = isOracleLMSSQLHeader(rawHeaderLine)
    ? extractColumnsFromLMSSQL(rawHeaderLine)
    : parseLMSDataLine(rawHeaderLine).map(h => h.toUpperCase());

  console.log(`[parseLMSFile] Found ${headers.length} columns: [${headers.slice(0, 5).join(", ")}${headers.length > 5 ? " ..." : ""}]`);
  console.log(`[parseLMSFile] Header line (first 120 chars): "${rawHeaderLine.substring(0, 120)}"`);

  const rows: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    // Stop at SQL*Plus footer lines
    if (/^\d+ rows? selected/i.test(line)) break;
    if (/^no rows selected/i.test(line)) break;
    if (/^Elapsed:/i.test(line)) continue;
    if (/^PL\/SQL procedure/i.test(line)) continue;

    // Only parse lines that contain the LMS delimiter
    if (!isLMSDataLine(line)) continue;

    const values = parseLMSDataLine(line);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        row[headers[j]] = (values[j] ?? "").trim();
      }
    }
    rows.push(row);
  }

  console.log(`[parseLMSFile] Parsed ${rows.length} data rows`);

  return {
    headers,
    rows,
    rawHeaderLine,
    detectedDelimiter: "LMS_SQL",
    skippedLines: headerIdx,
  };
}

// ─── Standard (non-LMS) parsing helpers ─────────────────────────

/**
 * Clean Oracle SQL artifacts from a raw value/header.
 * Used as a fallback for non-LMS files that still have some SQL residue.
 */
function cleanOracleSQL(value: string): string {
  let v = value;
  v = v.replace(/CHR\(\d+\)\s*\|\|/gi, "");
  v = v.replace(/\|\|\s*CHR\(\d+\)/gi, "");
  v = v.replace(/CHR\(\d+\)/gi, "");
  v = v.replace(/\^~\*~\^/g, "");
  v = v.replace(/^#+|#+$/g, "");
  v = v.replace(/^'+|'+$/g, "");
  return v.trim();
}

/** Lines that are metadata / comments — not data */
function isMetadataLine(line: string): boolean {
  const t = line.trim();
  if (t === "") return true;
  if (t.startsWith("--")) return true;
  // Only treat '#' lines as comments if they look like actual comments,
  // NOT like LMS data (#^~*~^val^~*~^) or CHR(35) wrapped data (#val#,#val#)
  const tUnquoted = t.startsWith('"') ? t.slice(1) : t;
  if ((t.startsWith("#") || tUnquoted.startsWith("#")) &&
      !t.includes(LMS_CARET_DELIM) &&
      !/#[^#]+#[,|;\t]/.test(t) && !/^"?#[^#]*#"?$/.test(t)) return true;
  if (/^REM\s/i.test(t)) return true;
  if (/^SQL>/i.test(t)) return true;
  if (/^SET\s/i.test(t)) return true;
  if (/^SPOOL\s/i.test(t)) return true;
  if (/^PROMPT\s/i.test(t)) return true;
  if (/^\/\s*$/.test(t)) return true;
  if (/^[-\s]+$/.test(t) && t.includes("-")) return true;
  if (/^[-+\s]+$/.test(t)) return true;
  if (/^[=\s]+$/.test(t) && t.includes("=")) return true;
  if (/^\d+ rows? selected/i.test(t)) return true;
  if (/^no rows selected/i.test(t)) return true;
  if (/^Elapsed:/i.test(t)) return true;
  if (/^PL\/SQL procedure/i.test(t)) return true;
  return false;
}

/** Count delimiter characters in a line (outside quotes) */
function countDelimiters(line: string): number {
  if (isLMSDataLine(line) || isOracleLMSSQLHeader(line)) {
    return parseLMSDataLine(line).length;
  }
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === ',' || ch === '\t' || ch === '|' || ch === ';')) count++;
  }
  return count;
}

/** Check if parsed headers contain any known Oracle column names */
function hasKnownColumns(headers: string[]): boolean {
  return headers.some(h => {
    if (KNOWN_ORACLE_COLUMNS.has(h)) return true;
    const cleaned = cleanOracleSQL(h).toUpperCase();
    return cleaned !== h && KNOWN_ORACLE_COLUMNS.has(cleaned);
  });
}

/** Check if a line looks like a title/table-name rather than a real header row */
function isTitleLine(line: string, nextLine?: string): boolean {
  const t = line.trim();
  if (/^[A-Za-z_$#0-9.]+$/.test(t)) return true;
  if (nextLine) {
    const thisDelims = countDelimiters(t);
    const nextDelims = countDelimiters(nextLine.trim());
    if (thisDelims <= 1 && nextDelims >= 2) return true;
  }
  return false;
}

/** Detect the best delimiter for a header line */
function detectDelimiter(line: string): string {
  if (isOracleLMSSQLHeader(line)) return "LMS_SQL";
  if (isLMSDataLine(line)) return "LMS_DATA";

  // Standard delimiter detection — strip SQL concat operators first
  const cleanedLine = line
    .replace(/CHR\(\d+\)\s*\|\|/gi, "")
    .replace(/\|\|\s*CHR\(\d+\)/gi, "")
    .replace(/\|\|/g, "");

  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };

  for (let i = 0; i < cleanedLine.length; i++) {
    const ch = cleanedLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch in counts) {
      counts[ch]++;
    }
  }

  let best = ",";
  let bestCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }

  if (bestCount === 0) return "WHITESPACE";
  return best;
}

/** Parse header line into cleaned, uppercased names */
function parseHeaderLine(rawLine: string, delimiter: string): string[] {
  if (delimiter === "LMS_SQL") {
    return extractColumnsFromLMSSQL(rawLine);
  }
  if (delimiter === "LMS_DATA") {
    return parseLMSDataLine(rawLine).map((h) => h.toUpperCase());
  }

  let fields: string[];
  if (delimiter === "WHITESPACE") {
    fields = rawLine.trim().split(/\s{2,}|\t+/).map((h) => h.trim());
  } else {
    fields = parseCSVLine(rawLine, delimiter);
  }

  return fields.map((h) => {
    let cleaned = h.trim().toUpperCase();
    cleaned = cleaned.replace(/^["']+|["']+$/g, "");
    cleaned = cleanOracleSQL(cleaned);
    return cleaned;
  });
}

// ─── Main entry point ───────────────────────────────────────────

/** Parse a CSV/LMS string into structured data */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM (byte-order mark) that Windows CSV files often have
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  // Strip null bytes (UTF-16 artifacts when read as UTF-8)
  text = text.replace(/\x00/g, "");

  // ── Pre-scan: detect Oracle LMS format before any line splitting ──
  // This is critical because splitCSVLines uses " quote tracking which
  // corrupts LMS SQL expression lines that contain " characters.
  if (isLMSFileContent(text)) {
    console.log("[parseCSV] LMS format detected via pre-scan — using dedicated LMS parser");
    return parseLMSFile(text);
  }

  // ── Standard CSV parsing for non-LMS files ──
  console.log("[parseCSV] Standard CSV format — using CSV parser");

  const allLines = splitCSVLines(text);
  if (allLines.length === 0) {
    return { headers: [], rows: [], rawHeaderLine: "", detectedDelimiter: ",", skippedLines: 0 };
  }

  // Skip metadata/comment/separator lines at the top
  let headerIndex = 0;
  while (headerIndex < allLines.length && isMetadataLine(allLines[headerIndex])) {
    headerIndex++;
  }

  if (headerIndex >= allLines.length) {
    return { headers: [], rows: [], rawHeaderLine: allLines[0] || "", detectedDelimiter: ",", skippedLines: headerIndex };
  }

  // Find next non-metadata line after the candidate header
  let nextNonMetaIdx = headerIndex + 1;
  while (nextNonMetaIdx < allLines.length && isMetadataLine(allLines[nextNonMetaIdx])) {
    nextNonMetaIdx++;
  }

  // Check if the first non-metadata line is a title line (table name, not headers)
  if (nextNonMetaIdx < allLines.length && isTitleLine(allLines[headerIndex], allLines[nextNonMetaIdx])) {
    headerIndex = nextNonMetaIdx;
    nextNonMetaIdx = headerIndex + 1;
    while (nextNonMetaIdx < allLines.length && isMetadataLine(allLines[nextNonMetaIdx])) {
      nextNonMetaIdx++;
    }
  }

  if (headerIndex >= allLines.length) {
    return { headers: [], rows: [], rawHeaderLine: allLines[0] || "", detectedDelimiter: ",", skippedLines: headerIndex };
  }

  let rawHeaderLine = allLines[headerIndex];
  let delimiter = detectDelimiter(rawHeaderLine);
  let headers = parseHeaderLine(rawHeaderLine, delimiter);

  console.log(`[parseCSV] delimiter="${delimiter}", headers(first5)=[${headers.slice(0, 5).join(", ")}]`);

  // Safety net: if headers still contain LMS artifacts, force LMS re-parse
  if (headers.some(h => h === "CHR(35)" || h.includes("^~*~^") || /^CHR\s*\(/i.test(h))) {
    console.log("[parseCSV] Headers contain LMS artifacts — falling back to LMS parser");
    return parseLMSFile(text);
  }

  // Validate: if headers don't contain known Oracle columns, try next line
  if (!hasKnownColumns(headers) && nextNonMetaIdx < allLines.length) {
    const altLine = allLines[nextNonMetaIdx];
    const altDelim = detectDelimiter(altLine);
    const altHeaders = parseHeaderLine(altLine, altDelim);
    if (hasKnownColumns(altHeaders)) {
      headerIndex = nextNonMetaIdx;
      rawHeaderLine = altLine;
      delimiter = altDelim;
      headers = altHeaders;
    }
  }

  // Clean headers: remove empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop();
  }

  const rows: Record<string, string>[] = [];

  // Skip separator lines right after headers
  let dataStart = headerIndex + 1;
  while (dataStart < allLines.length && isMetadataLine(allLines[dataStart])) {
    dataStart++;
  }

  for (let i = dataStart; i < allLines.length; i++) {
    const line = allLines[i];

    if (isMetadataLine(line)) continue;
    if (/^\d+ rows? selected/i.test(line.trim())) break;

    let values: string[];
    // Even in standard mode, if a data line looks like LMS data, parse it as such
    if (isLMSDataLine(line)) {
      values = parseLMSDataLine(line);
    } else if (delimiter === "WHITESPACE") {
      values = splitFixedWidth(rawHeaderLine, line);
    } else {
      values = parseCSVLine(line, delimiter);
    }

    if (values.length === 0 || (values.length === 1 && values[0].trim() === "")) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        let val = (values[j] ?? "").trim();
        val = val.replace(/^#+|#+$/g, "");
        row[headers[j]] = val;
      }
    }
    rows.push(row);
  }

  return { headers, rows, rawHeaderLine, detectedDelimiter: delimiter, skippedLines: headerIndex };
}

/** Split fixed-width output based on header column positions */
function splitFixedWidth(headerLine: string, dataLine: string): string[] {
  const boundaries: number[] = [0];
  let inWord = false;
  for (let i = 0; i < headerLine.length; i++) {
    const isSpace = headerLine[i] === " " || headerLine[i] === "\t";
    if (inWord && isSpace) {
      let gapEnd = i;
      while (gapEnd < headerLine.length && (headerLine[gapEnd] === " " || headerLine[gapEnd] === "\t")) {
        gapEnd++;
      }
      if (gapEnd - i >= 2 && gapEnd < headerLine.length) {
        boundaries.push(gapEnd);
        i = gapEnd - 1;
        inWord = false;
      }
    } else if (!isSpace) {
      inWord = true;
    }
  }

  const values: string[] = [];
  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b];
    const end = b + 1 < boundaries.length ? boundaries[b + 1] : dataLine.length;
    values.push(dataLine.substring(start, end).trim());
  }
  return values;
}

/** Split CSV text into lines, respecting quoted fields that span lines */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (current.trim().length > 0) lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) lines.push(current);
  return lines;
}

/** Parse a single CSV line into field values */
function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ─── File identification & constants ────────────────────────────

/** Known Oracle table base names and which table they represent */
export const KNOWN_FILES: Record<string, string> = {
  "FND_APPLICATION": "FND_APPLICATION",
  "FND_APPLICATION_TL": "FND_APPLICATION_TL",
  "FND_PRODUCT_INSTALLATIONS": "FND_PRODUCT_INSTALLATIONS",
  "FND_RESPONSIBILITY": "FND_RESPONSIBILITY",
  "FND_RESPONSIBILITY_TL": "FND_RESPONSIBILITY_TL",
  "FND_USER": "FND_USER",
  "FND_USER_RESP_GROUPS": "FND_USER_RESP_GROUPS",
  "FND_USER_RESP_GROUPS_ALL": "FND_USER_RESP_GROUPS",
  "FND_USER_RESP_GROUPS_DIRECT": "FND_USER_RESP_GROUPS",
  "FND_USER_RESPONSIBILITY": "FND_USER_RESPONSIBILITY",
  "FND_LOGINS": "FND_LOGINS",
  "FND_LOGIN_RESPONSIBILITIES": "FND_LOGIN_RESPONSIBILITIES",
  "FND_LOGIN_RESP_OBLIGATIONS": "FND_LOGIN_RESPONSIBILITIES",
  "FND_RESP_FUNCTIONS": "FND_RESP_FUNCTIONS",
  "FND_FORM_FUNCTIONS": "FND_FORM_FUNCTIONS",
  "FND_FORM_FUNCTIONS_TL": "FND_FORM_FUNCTIONS_TL",
  "FND_MENU_ENTRIES": "FND_MENU_ENTRIES",
  "FND_MENU_ENTRIES_TL": "FND_MENU_ENTRIES_TL",
  "FND_MENUS": "FND_MENUS",
  "FND_MENUS_TL": "FND_MENUS_TL",
  "FND_SECURITY_GROUPS": "FND_SECURITY_GROUPS",
  "ICX_SESSIONS": "ICX_SESSIONS",
  "OE_ORDER_HEADERS_ALL": "OE_ORDER_HEADERS_ALL",
  "OE_ORDER_LINES_ALL": "OE_ORDER_LINES_ALL",
  "OE_ORDER_SOURCES": "OE_ORDER_SOURCES",
  "WF_LOCAL_USER_ROLES": "WF_LOCAL_USER_ROLES",
  "WF_USER_ROLE_ASSIGNMENTS": "WF_USER_ROLE_ASSIGNMENTS",
};

/** Identify which Oracle table a filename corresponds to */
export function identifyFile(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".txt") && !lower.endsWith(".dat")) return null;

  const fileBase = filename.replace(/\.(csv|txt|dat)$/i, "").toUpperCase().trim();
  const sortedEntries = Object.entries(KNOWN_FILES).sort((a, b) => b[0].length - a[0].length);

  // 1. Exact match
  for (const [knownBase, table] of sortedEntries) {
    if (fileBase === knownBase.toUpperCase()) return table;
  }

  // 2. Strip numeric/date prefixes
  const strippedBase = fileBase.replace(/^\d+[_\-\s]+/, "");
  for (const [knownBase, table] of sortedEntries) {
    if (strippedBase === knownBase.toUpperCase()) return table;
  }

  // 3. Suffix match
  for (const [knownBase, table] of sortedEntries) {
    const upper = knownBase.toUpperCase();
    if (fileBase.endsWith(upper) && (fileBase.length === upper.length || !/[A-Z]/.test(fileBase[fileBase.length - upper.length - 1] || ""))) {
      return table;
    }
  }

  // 4. Prefix match
  for (const [knownBase, table] of sortedEntries) {
    const upper = knownBase.toUpperCase();
    if (fileBase.startsWith(upper) && !/[A-Z]/.test(fileBase[upper.length] || "")) {
      return table;
    }
    if (strippedBase.startsWith(upper) && !/[A-Z]/.test(strippedBase[upper.length] || "")) {
      return table;
    }
  }

  // 5. Substring match
  for (const [knownBase, table] of sortedEntries) {
    const upper = knownBase.toUpperCase();
    const idx = fileBase.indexOf(upper);
    if (idx >= 0) {
      const before = idx > 0 ? fileBase[idx - 1] : "_";
      const after = fileBase[idx + upper.length] || "_";
      if (!/[A-Z]/.test(before) && !/[A-Z]/.test(after)) {
        return table;
      }
    }
  }

  return null;
}

/** The minimum set of files required for a meaningful analysis */
export const REQUIRED_FILES = [
  "FND_APPLICATION",
  "FND_PRODUCT_INSTALLATIONS",
  "FND_RESPONSIBILITY",
  "FND_USER",
];

/** Files that enhance the analysis but aren't strictly required */
export const OPTIONAL_FILES = [
  "FND_APPLICATION_TL",
  "FND_RESPONSIBILITY_TL",
  "FND_USER_RESP_GROUPS",
  "FND_LOGINS",
  "FND_LOGIN_RESPONSIBILITIES",
  "ICX_SESSIONS",
  "FND_USER_RESPONSIBILITY",
];
