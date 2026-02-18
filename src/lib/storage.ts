import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  approvedAt?: string;
}

export interface StoredContract {
  id: string;
  vendor: string;
  industry: string;
  contractText: string;
  email?: string;
  createdAt: string;
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

// Access requests
export function saveAccessRequest(req: Omit<AccessRequest, "id" | "status" | "requestedAt">): AccessRequest {
  const requests = readJsonFile<AccessRequest>("access-requests.json");
  const newReq: AccessRequest = {
    ...req,
    id: crypto.randomUUID(),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  requests.push(newReq);
  writeJsonFile("access-requests.json", requests);
  return newReq;
}

export function getAccessRequests(): AccessRequest[] {
  return readJsonFile<AccessRequest>("access-requests.json");
}

export function findAccessByEmail(email: string): AccessRequest | undefined {
  return getAccessRequests().find(
    (r) => r.email.toLowerCase() === email.toLowerCase()
  );
}

export function approveAccessRequest(id: string): AccessRequest | null {
  const requests = readJsonFile<AccessRequest>("access-requests.json");
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx].status = "approved";
  requests[idx].approvedAt = new Date().toISOString();
  writeJsonFile("access-requests.json", requests);
  return requests[idx];
}

// Contracts storage
export function saveContract(data: Omit<StoredContract, "id" | "createdAt">): StoredContract {
  const contracts = readJsonFile<StoredContract>("contracts.json");
  const newContract: StoredContract = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  contracts.push(newContract);
  writeJsonFile("contracts.json", contracts);
  return newContract;
}

export function getContracts(): StoredContract[] {
  return readJsonFile<StoredContract>("contracts.json");
}

// Benchmarking knowledge base
export interface BenchmarkEntry {
  id: string;
  vendor: string;
  industry: string;
  summary: string;
  pricingInsights: string;
  createdAt: string;
}

export function saveBenchmarkEntry(data: Omit<BenchmarkEntry, "id" | "createdAt">): BenchmarkEntry {
  const entries = readJsonFile<BenchmarkEntry>("benchmark-knowledge.json");
  const newEntry: BenchmarkEntry = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  writeJsonFile("benchmark-knowledge.json", entries);
  return newEntry;
}

export function getBenchmarkEntries(vendor?: string, industry?: string): BenchmarkEntry[] {
  const entries = readJsonFile<BenchmarkEntry>("benchmark-knowledge.json");
  return entries.filter((e) => {
    if (vendor && e.vendor.toLowerCase() !== vendor.toLowerCase()) return false;
    if (industry && e.industry.toLowerCase() !== industry.toLowerCase()) return false;
    return true;
  });
}
