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

/** Parse a CSV string into structured data */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM (byte-order mark) that Windows CSV files often have
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

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

  const rawHeaderLine = allLines[headerIndex];
  const delimiter = detectDelimiter(rawHeaderLine);

  // Parse the header line
  let headers: string[];
  if (delimiter === "WHITESPACE") {
    // Fixed-width / whitespace-separated (e.g. SQL*Plus output)
    headers = rawHeaderLine.trim().split(/\s{2,}|\t+/).map((h) => h.trim().toUpperCase());
  } else {
    headers = parseCSVLine(rawHeaderLine, delimiter).map((h) =>
      h.trim().toUpperCase().replace(/^["']+|["']+$/g, "")
    );
  }

  // Clean headers: remove any empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop();
  }

  const rows: Record<string, string>[] = [];

  // Skip any separator line right after headers (SQL*Plus style: "------  ------")
  let dataStart = headerIndex + 1;
  if (dataStart < allLines.length && isMetadataLine(allLines[dataStart])) {
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
      // For fixed-width, try to align with header positions
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

/** Known file names from Oracle LMS EBS collection and which table they represent */
export const KNOWN_FILES: Record<string, string> = {
  "FND_APPLICATION.csv": "FND_APPLICATION",
  "FND_APPLICATION_TL.csv": "FND_APPLICATION_TL",
  "FND_PRODUCT_INSTALLATIONS.csv": "FND_PRODUCT_INSTALLATIONS",
  "FND_RESPONSIBILITY.csv": "FND_RESPONSIBILITY",
  "FND_RESPONSIBILITY_TL.csv": "FND_RESPONSIBILITY_TL",
  "FND_USER.csv": "FND_USER",
  "FND_USER_RESP_GROUPS.csv": "FND_USER_RESP_GROUPS",
  "FND_USER_RESP_GROUPS_ALL.csv": "FND_USER_RESP_GROUPS",
  "FND_USER_RESPONSIBILITY.csv": "FND_USER_RESPONSIBILITY",
  "FND_LOGINS.csv": "FND_LOGINS",
  "FND_LOGIN_RESPONSIBILITIES.csv": "FND_LOGIN_RESPONSIBILITIES",
  "FND_RESP_FUNCTIONS.csv": "FND_RESP_FUNCTIONS",
  "FND_FORM_FUNCTIONS.csv": "FND_FORM_FUNCTIONS",
  "FND_FORM_FUNCTIONS_TL.csv": "FND_FORM_FUNCTIONS_TL",
  "FND_MENU_ENTRIES.csv": "FND_MENU_ENTRIES",
  "FND_MENU_ENTRIES_TL.csv": "FND_MENU_ENTRIES_TL",
  "FND_MENUS.csv": "FND_MENUS",
  "FND_MENUS_TL.csv": "FND_MENUS_TL",
  "FND_SECURITY_GROUPS.csv": "FND_SECURITY_GROUPS",
  "ICX_SESSIONS.csv": "ICX_SESSIONS",
  "OE_ORDER_HEADERS_ALL.csv": "OE_ORDER_HEADERS_ALL",
  "OE_ORDER_LINES_ALL.csv": "OE_ORDER_LINES_ALL",
  "OE_ORDER_SOURCES.csv": "OE_ORDER_SOURCES",
  "WF_LOCAL_USER_ROLES.csv": "WF_LOCAL_USER_ROLES",
  "WF_USER_ROLE_ASSIGNMENTS.csv": "WF_USER_ROLE_ASSIGNMENTS",
};

/** Identify which Oracle table a filename corresponds to */
export function identifyFile(filename: string): string | null {
  // Only process CSV files
  if (!filename.toLowerCase().endsWith(".csv")) return null;

  const upper = filename.toUpperCase();

  // Exact match first
  for (const [pattern, table] of Object.entries(KNOWN_FILES)) {
    if (upper === pattern.toUpperCase()) return table;
  }

  // Match by base name: the file base (without extension) must start with
  // or exactly equal the known table base name, followed by nothing,
  // a dot, underscore+digits, or space — but NOT more alpha characters.
  // This prevents FND_USER_RESP_GROUPS.csv from matching FND_USER.
  const fileBase = upper.replace(/\.CSV$/i, "");
  for (const [pattern, table] of Object.entries(KNOWN_FILES)) {
    const knownBase = pattern.replace(".csv", "").toUpperCase();
    if (fileBase === knownBase) return table;
    // Allow prefix match only if followed by non-alpha (e.g. _ALL, _V, _20240101)
    if (fileBase.startsWith(knownBase) && !/[A-Z]/.test(fileBase[knownBase.length] || "")) {
      return table;
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
