/**
 * CSV Parser for Oracle LMS Collection files.
 * Handles: quoted fields, commas inside quotes, BOM, pipe-delimited,
 * tab-delimited, semicolon-delimited, SQL*Plus spool format,
 * and leading metadata/comment lines.
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

/** Lines that are metadata / comments — not data */
function isMetadataLine(line: string): boolean {
  const t = line.trim();
  if (t === "") return true;
  if (t.startsWith("--")) return true;
  if (t.startsWith("#")) return true;
  if (/^REM\s/i.test(t)) return true;
  if (/^SQL>/i.test(t)) return true;
  if (/^SET\s/i.test(t)) return true;
  if (/^SPOOL\s/i.test(t)) return true;
  if (/^PROMPT\s/i.test(t)) return true;
  if (/^\/\s*$/.test(t)) return true; // lone forward-slash (SQL*Plus run command)
  // Line of only dashes and spaces (SQL*Plus column separator)
  if (/^[-\s]+$/.test(t) && t.includes("-")) return true;
  // Line of only dashes, spaces, and plus signs (SQL*Plus with pipes)
  if (/^[-+\s]+$/.test(t)) return true;
  // Line of only equals and spaces (another separator style)
  if (/^[=\s]+$/.test(t) && t.includes("=")) return true;
  // "X rows selected" footer
  if (/^\d+ rows? selected/i.test(t)) return true;
  // "no rows selected"
  if (/^no rows selected/i.test(t)) return true;
  // "Elapsed:" timing line
  if (/^Elapsed:/i.test(t)) return true;
  // PL/SQL procedure
  if (/^PL\/SQL procedure/i.test(t)) return true;
  return false;
}

/** Count delimiter characters in a line (outside quotes) */
function countDelimiters(line: string): number {
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
  return headers.some(h => KNOWN_ORACLE_COLUMNS.has(h));
}

/** Check if a line looks like a title/table-name rather than a real header row */
function isTitleLine(line: string, nextLine?: string): boolean {
  const t = line.trim();
  // Single word with no delimiters — likely a table name
  if (/^[A-Za-z_$#0-9.]+$/.test(t)) return true;
  // If next line has significantly more delimiters, this is a title
  if (nextLine) {
    const thisDelims = countDelimiters(t);
    const nextDelims = countDelimiters(nextLine.trim());
    if (thisDelims <= 1 && nextDelims >= 2) return true;
  }
  return false;
}

/** Detect the best delimiter for a header line */
function detectDelimiter(line: string): string {
  // Count potential delimiters (outside of quotes)
  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch in counts) {
      counts[ch]++;
    }
  }

  // Pick the delimiter with the most occurrences
  let best = ",";
  let bestCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }

  // If no delimiter found at all, fall back to whitespace splitting
  if (bestCount === 0) return "WHITESPACE";
  return best;
}

/** Parse header line into cleaned, uppercased names */
function parseHeaderLine(rawLine: string, delimiter: string): string[] {
  if (delimiter === "WHITESPACE") {
    return rawLine.trim().split(/\s{2,}|\t+/).map((h) => h.trim().toUpperCase());
  }
  return parseCSVLine(rawLine, delimiter).map((h) =>
    h.trim().toUpperCase().replace(/^["']+|["']+$/g, "")
  );
}

/** Parse a CSV string into structured data */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM (byte-order mark) that Windows CSV files often have
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  // Strip null bytes (UTF-16 artifacts when read as UTF-8)
  text = text.replace(/\x00/g, "");

  // Split into raw lines first (respecting quoted fields)
  const allLines = splitCSVLines(text);
  if (allLines.length === 0) {
    return { headers: [], rows: [], rawHeaderLine: "", detectedDelimiter: ",", skippedLines: 0 };
  }

  // Skip metadata/comment/separator lines at the top to find the real header
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

  // Validate: if headers don't contain any known Oracle columns AND there's a next line,
  // try the next line as the real header (handles extra title/description lines)
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

  // Clean headers: remove any empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop();
  }

  const rows: Record<string, string>[] = [];

  // Skip any separator lines right after headers (SQL*Plus style: "------  ------")
  let dataStart = headerIndex + 1;
  while (dataStart < allLines.length && isMetadataLine(allLines[dataStart])) {
    dataStart++;
  }

  for (let i = dataStart; i < allLines.length; i++) {
    const line = allLines[i];

    // Skip metadata lines in the middle too
    if (isMetadataLine(line)) continue;

    // Stop at SQL*Plus "X rows selected" footer
    if (/^\d+ rows? selected/i.test(line.trim())) break;

    let values: string[];
    if (delimiter === "WHITESPACE") {
      values = splitFixedWidth(rawHeaderLine, line);
    } else {
      values = parseCSVLine(line, delimiter);
    }

    if (values.length === 0 || (values.length === 1 && values[0].trim() === "")) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        row[headers[j]] = (values[j] ?? "").trim();
      }
    }
    rows.push(row);
  }

  return { headers, rows, rawHeaderLine, detectedDelimiter: delimiter, skippedLines: headerIndex };
}

/** Split fixed-width output based on header column positions */
function splitFixedWidth(headerLine: string, dataLine: string): string[] {
  // Find column boundaries by looking at spaces in the header
  const boundaries: number[] = [0];
  let inWord = false;
  for (let i = 0; i < headerLine.length; i++) {
    const isSpace = headerLine[i] === " " || headerLine[i] === "\t";
    if (inWord && isSpace) {
      // Check if this is a multi-space gap (column boundary)
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
  // Accept .csv, .txt, and .dat files
  if (!lower.endsWith(".csv") && !lower.endsWith(".txt") && !lower.endsWith(".dat")) return null;

  // Strip extension and uppercase for matching
  const fileBase = filename.replace(/\.(csv|txt|dat)$/i, "").toUpperCase().trim();

  // Sort by longest key first to avoid partial matches (e.g. FND_USER vs FND_USER_RESP_GROUPS)
  const sortedEntries = Object.entries(KNOWN_FILES).sort((a, b) => b[0].length - a[0].length);

  // 1. Exact match on base name
  for (const [knownBase, table] of sortedEntries) {
    if (fileBase === knownBase.toUpperCase()) return table;
  }

  // 2. Strip common numeric/date prefixes like "01_", "001_", "20240101_"
  const strippedBase = fileBase.replace(/^\d+[_\-\s]+/, "");
  for (const [knownBase, table] of sortedEntries) {
    if (strippedBase === knownBase.toUpperCase()) return table;
  }

  // 3. Suffix match: file ends with known table name (e.g. "LMS_FND_APPLICATION")
  for (const [knownBase, table] of sortedEntries) {
    const upper = knownBase.toUpperCase();
    if (fileBase.endsWith(upper) && (fileBase.length === upper.length || !/[A-Z]/.test(fileBase[fileBase.length - upper.length - 1] || ""))) {
      return table;
    }
  }

  // 4. Prefix match: file starts with known table name, followed by non-alpha
  for (const [knownBase, table] of sortedEntries) {
    const upper = knownBase.toUpperCase();
    if (fileBase.startsWith(upper) && !/[A-Z]/.test(fileBase[upper.length] || "")) {
      return table;
    }
    if (strippedBase.startsWith(upper) && !/[A-Z]/.test(strippedBase[upper.length] || "")) {
      return table;
    }
  }

  // 5. Substring match: known table name appears bounded by non-alpha chars
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
