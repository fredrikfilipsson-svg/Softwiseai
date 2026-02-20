/**
 * CSV Parser for Oracle LMS Collection files.
 * Handles quoted fields, commas inside quotes, and standard Oracle CSV exports.
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse a CSV string into structured data */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM (byte-order mark) that Windows CSV files often have
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Auto-detect delimiter: check first line for tab or semicolon usage
  const firstLine = text.split(/\r?\n/, 1)[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  let delimiter = ",";
  if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";

  const lines = splitCSVLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toUpperCase().replace(/^["']+|["']+$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === 0 || (values.length === 1 && values[0].trim() === "")) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
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
  const upper = filename.toUpperCase();
  for (const [pattern, table] of Object.entries(KNOWN_FILES)) {
    if (upper === pattern.toUpperCase()) return table;
  }
  // Fuzzy: try to match without extension or with partial name
  for (const [pattern, table] of Object.entries(KNOWN_FILES)) {
    const base = pattern.replace(".csv", "").toUpperCase();
    if (upper.includes(base)) return table;
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
