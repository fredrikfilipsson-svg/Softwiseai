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
  | "other";

export const VENDOR_LABELS: Record<VendorType, string> = {
  oracle: "Oracle",
  ibm: "IBM",
  microsoft: "Microsoft",
  workday: "Workday",
  sap: "SAP",
  salesforce: "Salesforce",
  other: "Other",
};

export type ProjectStatus = "won" | "lost" | "pending";

export interface FinanceProject {
  id: string;
  clientName: string;
  vendorType: VendorType;
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
