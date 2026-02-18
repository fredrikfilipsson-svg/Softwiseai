import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getFilePath(filename: string): string {
  ensureDir(DATA_DIR);
  return path.join(DATA_DIR, filename);
}

function readJsonFile<T>(filename: string): T[] {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeJsonFile<T>(filename: string, data: T[]): void {
  const filePath = getFilePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export interface AdminVendorData {
  id: string;
  vendor: string;
  pricingGuidelines: string;
  typicalDiscounts: string;
  contractTerms: string;
  negotiationTips: string;
  complianceNotes: string;
  benchmarkData: string;
  updatedAt: string;
  updatedBy: string;
}

export function getAdminVendorData(): AdminVendorData[] {
  return readJsonFile<AdminVendorData>("admin-vendor-data.json");
}

export function getAdminVendorDataByVendor(vendor: string): AdminVendorData | undefined {
  return getAdminVendorData().find(
    (d) => d.vendor.toLowerCase() === vendor.toLowerCase()
  );
}

export function saveAdminVendorData(
  data: Omit<AdminVendorData, "id" | "updatedAt">
): AdminVendorData {
  const all = readJsonFile<AdminVendorData>("admin-vendor-data.json");
  const existingIdx = all.findIndex(
    (d) => d.vendor.toLowerCase() === data.vendor.toLowerCase()
  );

  const entry: AdminVendorData = {
    ...data,
    id: existingIdx >= 0 ? all[existingIdx].id : crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = entry;
  } else {
    all.push(entry);
  }

  writeJsonFile("admin-vendor-data.json", all);
  return entry;
}

export function deleteAdminVendorData(id: string): boolean {
  const all = readJsonFile<AdminVendorData>("admin-vendor-data.json");
  const filtered = all.filter((d) => d.id !== id);
  if (filtered.length === all.length) return false;
  writeJsonFile("admin-vendor-data.json", filtered);
  return true;
}

// Build the admin context prompt for Claude
export function getAdminContextForVendor(vendor: string): string {
  const data = getAdminVendorDataByVendor(vendor);
  if (!data) return "";

  return `
IMPORTANT - ADMIN GUIDELINES (these override any AI-generated insights):
The following data has been verified and curated by the SoftwiseAI admin team. Always prioritize this information over your own knowledge when creating the report.

VENDOR: ${data.vendor}

PRICING GUIDELINES:
${data.pricingGuidelines}

TYPICAL DISCOUNTS:
${data.typicalDiscounts}

CONTRACT TERMS TO WATCH:
${data.contractTerms}

NEGOTIATION TIPS (VERIFIED):
${data.negotiationTips}

COMPLIANCE NOTES:
${data.complianceNotes}

BENCHMARK DATA:
${data.benchmarkData}

INSTRUCTION: Use the above admin-provided data as the authoritative source. Your analysis should align with and build upon these guidelines. If there is any conflict between your knowledge and the admin guidelines, ALWAYS defer to the admin guidelines.
`;
}
