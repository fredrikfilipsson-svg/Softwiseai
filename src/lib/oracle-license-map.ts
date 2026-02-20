/**
 * Oracle E-Business Suite Application-to-License Product Mapping
 *
 * Maps APPLICATION_SHORT_NAME from FND_APPLICATION to Oracle's
 * commercially licensed product names, license families, and
 * license metric types.
 */

export interface OracleLicenseProduct {
  /** Oracle commercial product name */
  productName: string;
  /** License family / suite this product belongs to */
  family: string;
  /** License metric: "Application User", "Self-Service User", "Processor", etc. */
  metric: string;
  /** Whether this is a base/technology component (not separately licensed) */
  isBase?: boolean;
  /** Oracle part number (where known) */
  partNumber?: string;
}

/** Map from APPLICATION_SHORT_NAME -> license info */
export const ORACLE_LICENSE_MAP: Record<string, OracleLicenseProduct> = {
  // ─── Financials ────────────────────────────────────────────────
  SQLGL: { productName: "Oracle General Ledger", family: "Financials", metric: "Application User" },
  GL: { productName: "Oracle General Ledger", family: "Financials", metric: "Application User" },
  SQLAP: { productName: "Oracle Payables", family: "Financials", metric: "Application User" },
  AP: { productName: "Oracle Payables", family: "Financials", metric: "Application User" },
  AR: { productName: "Oracle Receivables", family: "Financials", metric: "Application User" },
  FA: { productName: "Oracle Assets", family: "Financials", metric: "Application User" },
  CE: { productName: "Oracle Cash Management", family: "Financials", metric: "Application User" },
  IEX: { productName: "Oracle Advanced Collections", family: "Financials", metric: "Application User" },
  OZF: { productName: "Oracle Trade Management", family: "Financials", metric: "Application User" },
  ZX: { productName: "Oracle E-Business Tax", family: "Financials", metric: "Application User" },
  IBY: { productName: "Oracle Payments", family: "Financials", metric: "Application User" },
  FUN: { productName: "Oracle Intercompany", family: "Financials", metric: "Application User" },
  IGI: { productName: "Oracle Public Sector Financials", family: "Financials", metric: "Application User" },
  JL: { productName: "Oracle Financials for Latin America", family: "Financials", metric: "Application User" },
  JE: { productName: "Oracle Financials for EMEA", family: "Financials", metric: "Application User" },
  JA: { productName: "Oracle Financials for Asia/Pacific", family: "Financials", metric: "Application User" },
  XLA: { productName: "Oracle Subledger Accounting", family: "Financials", metric: "Application User" },
  IEB: { productName: "Oracle Electronic Billing", family: "Financials", metric: "Application User" },
  OKL: { productName: "Oracle Lease and Finance Management", family: "Financials", metric: "Application User" },
  LNS: { productName: "Oracle Loans", family: "Financials", metric: "Application User" },
  PSA: { productName: "Oracle Public Sector Advanced Features", family: "Financials", metric: "Application User" },
  FV: { productName: "Oracle Federal Financials", family: "Financials", metric: "Application User" },
  CGR: { productName: "Oracle Treasury", family: "Financials", metric: "Application User" },
  GMS: { productName: "Oracle Grants Accounting", family: "Financials", metric: "Application User" },

  // ─── Procurement ───────────────────────────────────────────────
  PO: { productName: "Oracle Purchasing", family: "Procurement", metric: "Application User" },
  ICX: { productName: "Oracle iProcurement", family: "Procurement", metric: "Self-Service User" },
  POS: { productName: "Oracle iSupplier Portal", family: "Procurement", metric: "Self-Service User" },
  PON: { productName: "Oracle Sourcing", family: "Procurement", metric: "Application User" },
  CLN: { productName: "Oracle Supply Chain Trading Connector", family: "Procurement", metric: "Application User" },
  POM: { productName: "Oracle Procurement Contracts", family: "Procurement", metric: "Application User" },
  OKE: { productName: "Oracle Project Contracts", family: "Procurement", metric: "Application User" },
  OKC: { productName: "Oracle Contracts Core", family: "Procurement", metric: "Application User" },
  AHL: { productName: "Oracle Complex Maintenance, Repair, and Overhaul", family: "Procurement", metric: "Application User" },

  // ─── Order Management ──────────────────────────────────────────
  ONT: { productName: "Oracle Order Management", family: "Order Management", metric: "Application User" },
  OE: { productName: "Oracle Order Management", family: "Order Management", metric: "Application User" },
  ASO: { productName: "Oracle Quoting", family: "Order Management", metric: "Application User" },
  QP: { productName: "Oracle Advanced Pricing", family: "Order Management", metric: "Application User" },
  WSH: { productName: "Oracle Shipping Execution", family: "Order Management", metric: "Application User" },
  OKS: { productName: "Oracle Service Contracts", family: "Order Management", metric: "Application User" },
  CSE: { productName: "Oracle Asset Tracking", family: "Order Management", metric: "Application User" },

  // ─── Manufacturing ─────────────────────────────────────────────
  WIP: { productName: "Oracle Work in Process", family: "Manufacturing", metric: "Application User" },
  BOM: { productName: "Oracle Bills of Material", family: "Manufacturing", metric: "Application User" },
  MRP: { productName: "Oracle Master Scheduling / MRP", family: "Manufacturing", metric: "Application User" },
  CRP: { productName: "Oracle Capacity", family: "Manufacturing", metric: "Application User" },
  EAM: { productName: "Oracle Enterprise Asset Management", family: "Manufacturing", metric: "Application User" },
  WMS: { productName: "Oracle Warehouse Management", family: "Manufacturing", metric: "Application User" },
  FLM: { productName: "Oracle Flow Manufacturing", family: "Manufacturing", metric: "Application User" },
  CST: { productName: "Oracle Cost Management", family: "Manufacturing", metric: "Application User" },
  GMP: { productName: "Oracle Process Manufacturing", family: "Manufacturing", metric: "Application User" },
  GMD: { productName: "Oracle Process Manufacturing - Product Development", family: "Manufacturing", metric: "Application User" },
  GME: { productName: "Oracle Process Manufacturing - Process Execution", family: "Manufacturing", metric: "Application User" },
  GMF: { productName: "Oracle Process Manufacturing - Cost Management", family: "Manufacturing", metric: "Application User" },
  GML: { productName: "Oracle Process Manufacturing - Logistics", family: "Manufacturing", metric: "Application User" },
  GMI: { productName: "Oracle Process Manufacturing - Inventory", family: "Manufacturing", metric: "Application User" },
  GR: { productName: "Oracle Process Manufacturing - Regulatory Management", family: "Manufacturing", metric: "Application User" },
  QA: { productName: "Oracle Quality", family: "Manufacturing", metric: "Application User" },
  ENG: { productName: "Oracle Engineering", family: "Manufacturing", metric: "Application User" },

  // ─── Supply Chain ──────────────────────────────────────────────
  INV: { productName: "Oracle Inventory Management", family: "Supply Chain", metric: "Application User" },
  MSC: { productName: "Oracle Advanced Supply Chain Planning", family: "Supply Chain", metric: "Application User" },
  MSD: { productName: "Oracle Demand Planning", family: "Supply Chain", metric: "Application User" },
  MSR: { productName: "Oracle Supply Chain Planning", family: "Supply Chain", metric: "Application User" },
  MSO: { productName: "Oracle Global Order Promising", family: "Supply Chain", metric: "Application User" },
  MTL: { productName: "Oracle Inventory", family: "Supply Chain", metric: "Application User" },

  // ─── Human Resources (HRMS) ────────────────────────────────────
  PER: { productName: "Oracle Human Resources", family: "HRMS", metric: "Application User" },
  PAY: { productName: "Oracle Payroll", family: "HRMS", metric: "Application User" },
  BEN: { productName: "Oracle Advanced Benefits", family: "HRMS", metric: "Application User" },
  OTA: { productName: "Oracle Learning Management", family: "HRMS", metric: "Application User" },
  IRC: { productName: "Oracle iRecruitment", family: "HRMS", metric: "Self-Service User" },
  SSP: { productName: "Oracle Statutory Sick Pay", family: "HRMS", metric: "Application User" },
  GHR: { productName: "Oracle Federal Human Resources", family: "HRMS", metric: "Application User" },
  PQH: { productName: "Oracle Public Sector Human Resources", family: "HRMS", metric: "Application User" },
  HR: { productName: "Oracle Human Resources", family: "HRMS", metric: "Application User" },
  DT: { productName: "Oracle DateTrack", family: "HRMS", metric: "Application User", isBase: true },
  FF: { productName: "Oracle FastFormula", family: "HRMS", metric: "Application User", isBase: true },
  HRI: { productName: "Oracle HRMS Intelligence", family: "HRMS", metric: "Application User" },
  HXT: { productName: "Oracle Time and Labor", family: "HRMS", metric: "Application User" },

  // ─── CRM ───────────────────────────────────────────────────────
  ASN: { productName: "Oracle Sales", family: "CRM", metric: "Application User" },
  AST: { productName: "Oracle TeleSales", family: "CRM", metric: "Application User" },
  CSS: { productName: "Oracle Service", family: "CRM", metric: "Application User" },
  CSF: { productName: "Oracle Field Service", family: "CRM", metric: "Application User" },
  CSI: { productName: "Oracle Install Base", family: "CRM", metric: "Application User" },
  IBC: { productName: "Oracle Content Manager", family: "CRM", metric: "Application User" },
  AMS: { productName: "Oracle Marketing", family: "CRM", metric: "Application User" },
  IEU: { productName: "Oracle Interaction Center", family: "CRM", metric: "Application User" },
  CSC: { productName: "Oracle Customer Care", family: "CRM", metric: "Application User" },
  CS: { productName: "Oracle Service", family: "CRM", metric: "Application User" },

  // ─── Projects ──────────────────────────────────────────────────
  PA: { productName: "Oracle Projects", family: "Projects", metric: "Application User" },

  // ─── Business Intelligence ─────────────────────────────────────
  BIS: { productName: "Oracle Business Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIX: { productName: "Oracle Marketing Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIL: { productName: "Oracle Sales Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIV: { productName: "Oracle Service Intelligence", family: "Business Intelligence", metric: "Application User" },
  ISC: { productName: "Oracle Supply Chain Intelligence", family: "Business Intelligence", metric: "Application User" },
  HRI_BIS: { productName: "Oracle HRMS Intelligence", family: "Business Intelligence", metric: "Application User" },
  ENI: { productName: "Oracle Product Intelligence", family: "Business Intelligence", metric: "Application User" },
  POA: { productName: "Oracle Procurement Intelligence", family: "Business Intelligence", metric: "Application User" },
  FII: { productName: "Oracle Financial Intelligence", family: "Business Intelligence", metric: "Application User" },

  // ─── Property Manager ──────────────────────────────────────────
  PN: { productName: "Oracle Property Manager", family: "Financials", metric: "Application User" },

  // ─── Base / Technology (not separately licensed) ───────────────
  FND: { productName: "Application Object Library", family: "Technology", metric: "N/A", isBase: true },
  AD: { productName: "Applications DBA", family: "Technology", metric: "N/A", isBase: true },
  AU: { productName: "Application Utilities", family: "Technology", metric: "N/A", isBase: true },
  AK: { productName: "Common Modules", family: "Technology", metric: "N/A", isBase: true },
  WF: { productName: "Oracle Workflow", family: "Technology", metric: "N/A", isBase: true },
  XDO: { productName: "Oracle XML Publisher", family: "Technology", metric: "N/A", isBase: true },
  FWK: { productName: "OA Framework", family: "Technology", metric: "N/A", isBase: true },
  JTF: { productName: "CRM Foundation", family: "Technology", metric: "N/A", isBase: true },
  HZ: { productName: "Trading Community Architecture", family: "Technology", metric: "N/A", isBase: true },
  AME: { productName: "Oracle Approvals Management", family: "Technology", metric: "N/A", isBase: true },
  XML: { productName: "Oracle XML Gateway", family: "Technology", metric: "N/A", isBase: true },
  ECX: { productName: "Oracle e-Commerce Gateway", family: "Technology", metric: "N/A", isBase: true },
  ALR: { productName: "Oracle Alert", family: "Technology", metric: "N/A", isBase: true },
  CN: { productName: "Oracle Common Application Calendar", family: "Technology", metric: "N/A", isBase: true },
  CZ: { productName: "Oracle Configurator", family: "Technology", metric: "N/A", isBase: true },
  IES: { productName: "Oracle Scripting", family: "Technology", metric: "N/A", isBase: true },
  JTS: { productName: "CRM Self-Service", family: "Technology", metric: "N/A", isBase: true },
  MES: { productName: "Oracle Messaging Gateway", family: "Technology", metric: "N/A", isBase: true },
  OKB: { productName: "Oracle Contracts Intelligence", family: "Technology", metric: "N/A", isBase: true },
  XNP: { productName: "Oracle Number Portability", family: "Technology", metric: "N/A", isBase: true },
  UMX: { productName: "Oracle User Management", family: "Technology", metric: "N/A", isBase: true },
  PJI: { productName: "Oracle Project Intelligence", family: "Technology", metric: "N/A", isBase: true },
  IPA: { productName: "Oracle Project Analysis", family: "Technology", metric: "N/A", isBase: true },
};

/** Responsibility name patterns that indicate Self-Service User licensing */
export const SELF_SERVICE_RESP_PATTERNS: RegExp[] = [
  /self.?service/i,
  /employee.?self/i,
  /manager.?self/i,
  /\biexpense\b/i,
  /\biprocurement\b/i,
  /\bisupplier\b/i,
  /\birecruitment\b/i,
  /\biasset\b/i,
  /\bitime\b/i,
  /\bhtml\b/i,
  /\bweb\b/i,
  /internet\s+expense/i,
  /internet\s+procurement/i,
  /supplier\s+portal/i,
  /employee\s+portal/i,
];

/** Applications whose responsibilities are always Self-Service */
export const SELF_SERVICE_APPS = new Set(["ICX", "POS", "IRC", "POR"]);

/** License families and their description */
export const LICENSE_FAMILIES: Record<string, string> = {
  Financials: "Oracle E-Business Suite Financials modules",
  Procurement: "Oracle E-Business Suite Procurement modules",
  "Order Management": "Oracle E-Business Suite Order Management modules",
  Manufacturing: "Oracle E-Business Suite Manufacturing modules",
  "Supply Chain": "Oracle E-Business Suite Supply Chain modules",
  HRMS: "Oracle E-Business Suite Human Resources modules",
  CRM: "Oracle E-Business Suite Customer Relationship Management modules",
  Projects: "Oracle E-Business Suite Project Management modules",
  "Business Intelligence": "Oracle E-Business Suite BI modules",
  Technology: "Base technology components (typically included with EBS license)",
};
