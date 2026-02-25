export interface Cost {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "pending" | "sent" | "paid";
}

export type VendorType =
  | "oracle"
  | "ibm"
  | "microsoft"
  | "workday"
  | "sap"
  | "salesforce"
  | "broadcom"
  | "other";

export const VENDOR_LABELS: Record<VendorType, string> = {
  oracle: "Oracle",
  ibm: "IBM",
  microsoft: "Microsoft",
  workday: "Workday",
  sap: "SAP",
  salesforce: "Salesforce",
  broadcom: "Broadcom",
  other: "Other",
};

export const VENDOR_PROJECT_TYPES: Record<VendorType, string[]> = {
  oracle: ["Java", "Audit", "Licensing Review", "ULA", "Negotiation", "Cost Optimization", "Other"],
  ibm: ["Audit Defense", "License Review", "Negotiation", "Other"],
  microsoft: ["EA Renewal", "Negotiation", "Licensing", "Other"],
  workday: ["Negotiation", "Other"],
  sap: ["Rise with SAP", "S/4HANA", "Negotiation", "Other"],
  salesforce: ["Negotiation", "Licensing", "Other"],
  broadcom: ["Negotiation", "Audit", "Other"],
  other: ["Other"],
};

export type LeadSource = "web" | "gartner" | "existing_customer" | "referral" | "ai" | "other";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  web: "Web",
  gartner: "Gartner",
  existing_customer: "Existing Customer",
  referral: "Referral",
  ai: "AI",
  other: "Other",
};

export type ProjectStatus = "won" | "lost" | "pending";

export interface FinanceProject {
  id: string;
  clientName: string;
  vendorType: VendorType;
  projectType: string;
  leadSource: LeadSource;
  revenue: number;
  costs: Cost[];
  invoiceCount: number;
  invoices: Invoice[];
  status: ProjectStatus;
  createdAt: string;
}

export interface YearlyTarget {
  year: number;
  targetRevenue: number;
}
