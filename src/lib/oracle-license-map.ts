/**
 * Oracle E-Business Suite Application-to-License Product Mapping
 *
 * Maps APPLICATION_SHORT_NAME from FND_APPLICATION to Oracle's
 * commercially licensed product names, license families, and
 * license metric types.
 *
 * Source: Complete Oracle EBS Application Module List
 * (~280 modules including core, shared, localization, and obsolete)
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

/**
 * Oracle EBS List Prices (USD) per user
 *
 * Based on the Oracle E-Business Suite Applications Global Price List.
 * These are LIST prices — actual contract prices vary significantly (30–60% discount typical).
 * Annual support = 22% of net license fee (Software Update License & Support).
 *
 * Key: product name (matching productName in ORACLE_LICENSE_MAP)
 * Value: list price per user in USD
 */
export const ORACLE_LIST_PRICES: Record<string, number> = {
  // ─── Financials ────────────────────────────────────────────────
  "Oracle General Ledger": 4595,
  "Oracle Payables": 4595,
  "Oracle Receivables": 4595,
  "Oracle Assets": 4595,
  "Oracle Cash Management": 4595,
  "Oracle Advanced Collections": 4595,
  "Oracle E-Business Tax": 4595,
  "Oracle Payments": 4595,
  "Oracle Subledger Accounting": 4595,
  "Oracle Legal Entity Configurator": 4595,
  "Oracle Treasury": 4595,
  "Oracle Lease and Finance Management": 4595,
  "Oracle Loans": 4595,
  "Oracle Property Manager": 1930,
  "Oracle Internal Controls Manager": 4595,
  "Oracle Report Manager": 2300,
  "Oracle Financial Consolidation Hub": 4595,
  "Oracle Enterprise Performance Foundation": 4595,
  "Oracle Profitability Manager": 4595,
  "Oracle Enterprise Planning and Budgeting": 4595,
  "Oracle Risk Management": 4595,

  // ─── Public Sector ──────────────────────────────────────────────
  "Oracle Public Sector Financials International": 4595,
  "Oracle Public Sector Advanced Features": 4595,
  "Oracle Public Sector Budgeting": 4595,
  "Oracle Labor Distribution": 4595,
  "Oracle Federal Financials": 4595,

  // ─── Supply Chain Management ──────────────────────────────────
  "Oracle Inventory Management": 1930,
  "Oracle Bills of Material": 1930,
  "Oracle Work in Process": 1930,
  "Oracle Engineering": 1930,
  "Oracle Master Scheduling / MRP": 1930,
  "Oracle Capacity": 1930,
  "Oracle Quality": 1930,
  "Oracle Advanced Pricing": 964,
  "Oracle Cost Management": 1930,
  "Oracle Enterprise Asset Management": 1930,
  "Oracle Warehouse Management": 1449,
  "Oracle Shipping Execution": 1930,
  "Oracle Shop Floor Management": 1930,
  "Oracle Flow Manufacturing": 1930,
  "Oracle Manufacturing Scheduling": 6000,
  "Oracle Order Management": 1930,
  "Oracle Manufacturing": 1930,
  "Oracle Advanced Supply Chain Planning": 6000,
  "Oracle Demand Planning": 6000,
  "Oracle Constraint Based Optimization": 6000,
  "Oracle Inventory Optimization": 6000,
  "Oracle Transportation Planning": 6000,
  "Oracle Inventory": 1930,
  "Oracle Landed Cost Management": 1930,
  "Oracle Configurator": 1447,
  "Oracle Advanced Product Catalog": 1930,

  // ─── Process Manufacturing ────────────────────────────────────
  "Oracle Process Manufacturing": 1930,
  "Oracle Process Manufacturing Systems": 1930,
  "Oracle Process Manufacturing - Product Development": 1930,
  "Oracle Process Manufacturing - Process Execution": 1930,
  "Oracle Process Manufacturing - Financials": 1930,
  "Oracle Process Manufacturing - Logistics": 1930,
  "Oracle Process Manufacturing - Inventory": 1930,

  // ─── Procurement ───────────────────────────────────────────────
  "Oracle Purchasing": 1930,
  "Oracle iProcurement": 115,
  "Oracle iSupplier Portal": 115,
  "Oracle Sourcing": 3864,
  "Oracle Project Contracts": 2897,

  // ─── Order Management ──────────────────────────────────────────
  "Oracle Order Capture / Quoting": 1930,
  "Oracle Quoting": 1930,
  "Oracle Service Contracts": 2897,

  // ─── Human Resources ───────────────────────────────────────────
  "Oracle Human Resources": 4595,
  "Oracle Payroll": 4595,
  "Oracle Advanced Benefits": 4595,
  "Oracle Learning Management": 4595,
  "Oracle iRecruitment": 115,
  "Oracle Time and Labor": 4595,
  "Oracle Time and Labor Engine": 4595,
  "Oracle Approvals Management": 4595,

  // ─── CRM ──────────────────────────────────────────────────────
  "Oracle Sales": 4000,
  "Oracle Sales Foundation": 4000,
  "Oracle TeleSales": 4000,
  "Oracle Service (TeleService)": 4000,
  "Oracle Field Service": 4000,
  "Oracle Call Center": 4000,
  "Oracle Spares Management": 4000,
  "Oracle Customer Care": 4000,
  "Oracle Depot Repair": 4000,
  "Oracle Install Base": 4000,
  "Oracle Marketing": 4000,
  "Oracle Incentive Compensation": 4000,
  "Oracle iStore": 115,
  "Oracle iSupport": 115,
  "Oracle Customers Online": 115,
  "Oracle Trade Management": 4000,
  "Oracle Partner Management": 4000,

  // ─── Projects ──────────────────────────────────────────────────
  "Oracle Projects": 1930,
  "Oracle Grants Accounting": 1930,
  "Oracle Project Manufacturing": 1930,
  "Oracle Project Intelligence": 1930,
  "Oracle Project Portfolio Analysis": 1930,

  // ─── Business Intelligence ─────────────────────────────────────
  "Oracle Business Intelligence System": 1930,
  "Oracle Sales Intelligence": 1930,
  "Oracle Service Intelligence": 1930,
  "Oracle Marketing Intelligence": 1930,
  "Oracle Customer Intelligence": 1930,
  "Oracle Supply Chain Intelligence": 1930,
  "Oracle Financial Intelligence": 1930,
  "Oracle Operations Intelligence": 1930,
  "Oracle HRMS Intelligence": 1930,

  // ─── Mobile Supply Chain ───────────────────────────────────────
  "Oracle Mobile Supply Chain Applications": 1930,

  // ─── Industry ──────────────────────────────────────────────────
  "Oracle Complex Maintenance Repair and Overhaul": 1930,
};

/** Annual support percentage of net license fee */
export const ORACLE_ANNUAL_SUPPORT_PCT = 0.22;

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
  ZX: { productName: "Oracle E-Business Tax", family: "Financials", metric: "Application User" },
  IBY: { productName: "Oracle Payments", family: "Financials", metric: "Application User" },
  FUN: { productName: "Oracle Financials Common Modules", family: "Financials", metric: "Application User" },
  XLA: { productName: "Oracle Subledger Accounting", family: "Financials", metric: "Application User" },
  XLE: { productName: "Oracle Legal Entity Configurator", family: "Financials", metric: "Application User" },
  XTR: { productName: "Oracle Treasury", family: "Financials", metric: "Application User" },
  OKL: { productName: "Oracle Lease and Finance Management", family: "Financials", metric: "Application User" },
  LNS: { productName: "Oracle Loans", family: "Financials", metric: "Application User" },
  PN: { productName: "Oracle Property Manager", family: "Financials", metric: "Application User" },
  IBP: { productName: "Oracle Bill Presentment & Payment", family: "Financials", metric: "Application User" },
  IA: { productName: "Oracle iAssets", family: "Financials", metric: "Self-Service User" },
  AMW: { productName: "Oracle Internal Controls Manager", family: "Financials", metric: "Application User" },
  CUC: { productName: "Oracle Revenue Accounting", family: "Financials", metric: "Application User" },
  FRM: { productName: "Oracle Report Manager", family: "Financials", metric: "Application User" },
  GCS: { productName: "Oracle Financial Consolidation Hub", family: "Financials", metric: "Application User" },
  ISX: { productName: "Oracle iSettlement", family: "Financials", metric: "Application User" },
  AX: { productName: "Oracle Global Accounting Engine", family: "Financials", metric: "Application User" },
  FEM: { productName: "Oracle Enterprise Performance Foundation", family: "Financials", metric: "Application User" },
  PFT: { productName: "Oracle Profitability Manager", family: "Financials", metric: "Application User" },
  ZPB: { productName: "Oracle Enterprise Planning and Budgeting", family: "Financials", metric: "Application User" },
  QRM: { productName: "Oracle Risk Management", family: "Financials", metric: "Application User" },
  RMG: { productName: "Oracle Risk Manager", family: "Financials", metric: "Application User" },
  RCM: { productName: "Oracle Regulatory Capital Manager", family: "Financials", metric: "Application User" },
  FPT: { productName: "Oracle Banking Center", family: "Financials", metric: "Application User" },
  CGR: { productName: "Oracle Treasury", family: "Financials", metric: "Application User" },

  // ─── Public Sector ──────────────────────────────────────────────
  IGI: { productName: "Oracle Public Sector Financials International", family: "Public Sector", metric: "Application User" },
  PSA: { productName: "Oracle Public Sector Advanced Features", family: "Public Sector", metric: "Application User" },
  PSB: { productName: "Oracle Public Sector Budgeting", family: "Public Sector", metric: "Application User" },
  PSP: { productName: "Oracle Labor Distribution", family: "Public Sector", metric: "Application User" },
  PSR: { productName: "Oracle Public Sector Receivables", family: "Public Sector", metric: "Application User" },
  PQP: { productName: "Oracle Public Sector Payroll", family: "Public Sector", metric: "Application User" },
  PQH: { productName: "Oracle Public Sector Human Resources", family: "Public Sector", metric: "Application User" },
  FV: { productName: "Oracle Federal Financials", family: "Public Sector", metric: "Application User" },
  GHR: { productName: "Oracle US Federal Human Resources", family: "Public Sector", metric: "Application User" },
  CUG: { productName: "Oracle Citizen Interaction Center", family: "Public Sector", metric: "Application User" },
  IGF: { productName: "Oracle Financial Aid", family: "Public Sector", metric: "Application User" },
  IGS: { productName: "Oracle Student System", family: "Public Sector", metric: "Application User" },
  IGW: { productName: "Oracle Grants Proposal", family: "Public Sector", metric: "Application User" },

  // ─── Supply Chain Management (SCM) ──────────────────────────────
  INV: { productName: "Oracle Inventory Management", family: "Supply Chain", metric: "Application User" },
  BOM: { productName: "Oracle Bills of Material", family: "Supply Chain", metric: "Application User" },
  WIP: { productName: "Oracle Work in Process", family: "Supply Chain", metric: "Application User" },
  ENG: { productName: "Oracle Engineering", family: "Supply Chain", metric: "Application User" },
  MRP: { productName: "Oracle Master Scheduling / MRP", family: "Supply Chain", metric: "Application User" },
  CRP: { productName: "Oracle Capacity", family: "Supply Chain", metric: "Application User" },
  QA: { productName: "Oracle Quality", family: "Supply Chain", metric: "Application User" },
  QP: { productName: "Oracle Advanced Pricing", family: "Supply Chain", metric: "Application User" },
  CST: { productName: "Oracle Cost Management", family: "Supply Chain", metric: "Application User" },
  EAM: { productName: "Oracle Enterprise Asset Management", family: "Supply Chain", metric: "Application User" },
  WMS: { productName: "Oracle Warehouse Management", family: "Supply Chain", metric: "Application User" },
  WSH: { productName: "Oracle Shipping Execution", family: "Supply Chain", metric: "Application User" },
  WSM: { productName: "Oracle Shop Floor Management", family: "Supply Chain", metric: "Application User" },
  FLM: { productName: "Oracle Flow Manufacturing", family: "Supply Chain", metric: "Application User" },
  WPS: { productName: "Oracle Manufacturing Scheduling", family: "Supply Chain", metric: "Application User" },
  ONT: { productName: "Oracle Order Management", family: "Supply Chain", metric: "Application User" },
  OE: { productName: "Oracle Order Entry", family: "Supply Chain", metric: "Application User" },
  MFG: { productName: "Oracle Manufacturing", family: "Supply Chain", metric: "Application User" },
  MSC: { productName: "Oracle Advanced Supply Chain Planning", family: "Supply Chain", metric: "Application User" },
  MSD: { productName: "Oracle Demand Planning", family: "Supply Chain", metric: "Application User" },
  MSO: { productName: "Oracle Constraint Based Optimization", family: "Supply Chain", metric: "Application User" },
  MSR: { productName: "Oracle Inventory Optimization", family: "Supply Chain", metric: "Application User" },
  MST: { productName: "Oracle Transportation Planning", family: "Supply Chain", metric: "Application User" },
  MTL: { productName: "Oracle Inventory", family: "Supply Chain", metric: "Application User" },
  INL: { productName: "Oracle Landed Cost Management", family: "Supply Chain", metric: "Application User" },
  RLM: { productName: "Oracle Release Management", family: "Supply Chain", metric: "Application User" },
  CHV: { productName: "Oracle Supplier Scheduling", family: "Supply Chain", metric: "Application User" },
  CZ: { productName: "Oracle Configurator", family: "Supply Chain", metric: "Application User" },
  EGO: { productName: "Oracle Advanced Product Catalog", family: "Supply Chain", metric: "Application User" },
  EDR: { productName: "Oracle E-Records", family: "Supply Chain", metric: "Application User" },
  VEA: { productName: "Oracle Automotive", family: "Supply Chain", metric: "Application User" },
  DDD: { productName: "Oracle CADView-3D", family: "Supply Chain", metric: "Application User" },

  // ─── SCM - Process Manufacturing ────────────────────────────────
  GMP: { productName: "Oracle Process Manufacturing", family: "Supply Chain", metric: "Application User" },
  GMA: { productName: "Oracle Process Manufacturing Systems", family: "Supply Chain", metric: "Application User" },
  GMD: { productName: "Oracle Process Manufacturing - Product Development", family: "Supply Chain", metric: "Application User" },
  GME: { productName: "Oracle Process Manufacturing - Process Execution", family: "Supply Chain", metric: "Application User" },
  GMF: { productName: "Oracle Process Manufacturing - Financials", family: "Supply Chain", metric: "Application User" },
  GML: { productName: "Oracle Process Manufacturing - Logistics", family: "Supply Chain", metric: "Application User" },
  GMI: { productName: "Oracle Process Manufacturing - Inventory", family: "Supply Chain", metric: "Application User" },
  GR: { productName: "Oracle Process Manufacturing - Regulatory Management", family: "Supply Chain", metric: "Application User" },

  // ─── Procurement ───────────────────────────────────────────────
  PO: { productName: "Oracle Purchasing", family: "Procurement", metric: "Application User" },
  ICX: { productName: "Oracle iProcurement", family: "Procurement", metric: "Self-Service User" },
  POS: { productName: "Oracle iSupplier Portal", family: "Procurement", metric: "Self-Service User" },
  PON: { productName: "Oracle Sourcing", family: "Procurement", metric: "Application User" },
  POM: { productName: "Oracle Exchange Marketplace", family: "Procurement", metric: "Application User" },
  POA: { productName: "Oracle Purchasing Intelligence", family: "Procurement", metric: "Application User" },
  CLN: { productName: "Oracle Supply Chain Trading Connector", family: "Procurement", metric: "Application User" },
  OKE: { productName: "Oracle Project Contracts", family: "Procurement", metric: "Application User" },
  ITG: { productName: "Oracle Internet Procurement Enterprise Connector", family: "Procurement", metric: "Application User" },
  IBT: { productName: "Oracle iAuction", family: "Procurement", metric: "Application User" },
  AHL: { productName: "Oracle Complex Maintenance Repair and Overhaul", family: "Procurement", metric: "Application User" },

  // ─── Order Management ──────────────────────────────────────────
  ASO: { productName: "Oracle Order Capture / Quoting", family: "Order Management", metric: "Application User" },
  QOT: { productName: "Oracle Quoting", family: "Order Management", metric: "Application User" },
  OKS: { productName: "Oracle Service Contracts", family: "Order Management", metric: "Application User" },
  CSE: { productName: "Oracle Asset Tracking", family: "Order Management", metric: "Application User" },

  // ─── Human Resources (HRMS) ───────────────────────────────────
  PER: { productName: "Oracle Human Resources", family: "HRMS", metric: "Application User" },
  HR: { productName: "Oracle Human Resources", family: "HRMS", metric: "Application User" },
  PAY: { productName: "Oracle Payroll", family: "HRMS", metric: "Application User" },
  BEN: { productName: "Oracle Advanced Benefits", family: "HRMS", metric: "Application User" },
  OTA: { productName: "Oracle Learning Management", family: "HRMS", metric: "Application User" },
  IRC: { productName: "Oracle iRecruitment", family: "HRMS", metric: "Self-Service User" },
  SSP: { productName: "Oracle Statutory Sick Pay", family: "HRMS", metric: "Application User" },
  HRI: { productName: "Oracle Human Resources Intelligence", family: "HRMS", metric: "Application User" },
  HXT: { productName: "Oracle Time and Labor", family: "HRMS", metric: "Application User" },
  HXC: { productName: "Oracle Time and Labor Engine", family: "HRMS", metric: "Application User" },
  AME: { productName: "Oracle Approvals Management", family: "HRMS", metric: "Application User" },
  DT: { productName: "Oracle DateTrack", family: "HRMS", metric: "Application User", isBase: true },
  FF: { productName: "Oracle FastFormula", family: "HRMS", metric: "Application User", isBase: true },

  // ─── CRM ─────────────────────────────────────────────────────
  ASN: { productName: "Oracle Sales", family: "CRM", metric: "Application User" },
  AS: { productName: "Oracle Sales Foundation", family: "CRM", metric: "Application User" },
  AST: { productName: "Oracle TeleSales", family: "CRM", metric: "Application User" },
  ASG: { productName: "Oracle CRM Gateway for Mobile Devices", family: "CRM", metric: "Application User" },
  ASL: { productName: "Oracle Sales Offline", family: "CRM", metric: "Application User" },
  ASP: { productName: "Oracle Sales for Handhelds", family: "CRM", metric: "Application User" },
  CS: { productName: "Oracle Service (TeleService)", family: "CRM", metric: "Application User" },
  CSS: { productName: "Oracle Support", family: "CRM", metric: "Application User" },
  CSF: { productName: "Oracle Field Service", family: "CRM", metric: "Application User" },
  CSL: { productName: "Oracle Field Service/Laptop", family: "CRM", metric: "Application User" },
  CSM: { productName: "Oracle Field Service/Palm", family: "CRM", metric: "Application User" },
  CSN: { productName: "Oracle Call Center", family: "CRM", metric: "Application User" },
  CSP: { productName: "Oracle Spares Management", family: "CRM", metric: "Application User" },
  CSC: { productName: "Oracle Customer Care", family: "CRM", metric: "Application User" },
  CSD: { productName: "Oracle Depot Repair", family: "CRM", metric: "Application User" },
  CSI: { productName: "Oracle Install Base", family: "CRM", metric: "Application User" },
  IBC: { productName: "Oracle Content Manager", family: "CRM", metric: "Application User" },
  AMS: { productName: "Oracle Marketing", family: "CRM", metric: "Application User" },
  AMV: { productName: "Oracle Marketing Encyclopedia System", family: "CRM", metric: "Application User" },
  IEU: { productName: "Oracle Universal Work Queue", family: "CRM", metric: "Application User" },
  CCT: { productName: "Oracle Telephony Manager", family: "CRM", metric: "Application User" },
  CN: { productName: "Oracle Incentive Compensation", family: "CRM", metric: "Application User" },
  IBE: { productName: "Oracle iStore", family: "CRM", metric: "Self-Service User" },
  IBU: { productName: "Oracle iSupport", family: "CRM", metric: "Self-Service User" },
  IMC: { productName: "Oracle Customers Online", family: "CRM", metric: "Self-Service User" },
  IEB: { productName: "Oracle Interaction Blending", family: "CRM", metric: "Application User" },
  IEC: { productName: "Oracle Advanced Outbound Telephony", family: "CRM", metric: "Application User" },
  IEO: { productName: "Oracle Interaction Center Technology", family: "CRM", metric: "Application User" },
  IET: { productName: "Oracle Call Center Connectors", family: "CRM", metric: "Application User" },
  IEV: { productName: "Oracle IVR Integrator", family: "CRM", metric: "Application User" },
  IEM: { productName: "Oracle Email Center", family: "CRM", metric: "Application User" },
  IBW: { productName: "Oracle Web Analytics", family: "CRM", metric: "Application User" },
  IAM: { productName: "Oracle Digital Asset Management", family: "CRM", metric: "Application User" },
  MIV: { productName: "Oracle Media Interactive", family: "CRM", metric: "Application User" },
  OKC: { productName: "Oracle Contracts Core", family: "CRM", metric: "Application User" },
  OKI: { productName: "Oracle Contracts Intelligence", family: "CRM", metric: "Application User" },
  OKX: { productName: "Oracle Contracts Integration", family: "CRM", metric: "Application User" },
  OKT: { productName: "Oracle Royalty Management", family: "CRM", metric: "Application User" },
  OZF: { productName: "Oracle Trade Management", family: "CRM", metric: "Application User" },
  PV: { productName: "Oracle Partner Management", family: "CRM", metric: "Application User" },
  PRP: { productName: "Oracle Proposals", family: "CRM", metric: "Application User" },
  DPP: { productName: "Oracle Price Protection", family: "CRM", metric: "Application User" },
  XDP: { productName: "Oracle Provisioning", family: "CRM", metric: "Application User" },
  XNP: { productName: "Oracle Number Portability", family: "CRM", metric: "Application User" },
  XNT: { productName: "Oracle TeleBusiness for Telecom/Utilities", family: "CRM", metric: "Application User" },
  AMF: { productName: "Oracle Fulfillment Services", family: "CRM", metric: "Application User" },

  // ─── Projects ──────────────────────────────────────────────────
  PA: { productName: "Oracle Projects", family: "Projects", metric: "Application User" },
  GMS: { productName: "Oracle Grants Accounting", family: "Projects", metric: "Application User" },
  PJM: { productName: "Oracle Project Manufacturing", family: "Projects", metric: "Application User" },
  PJI: { productName: "Oracle Project Intelligence", family: "Projects", metric: "Application User" },
  FPA: { productName: "Oracle Project Portfolio Analysis", family: "Projects", metric: "Application User" },
  IPA: { productName: "Oracle Project Analysis", family: "Projects", metric: "Application User" },

  // ─── Business Intelligence ─────────────────────────────────────
  BIS: { productName: "Oracle Business Intelligence System", family: "Business Intelligence", metric: "Application User" },
  BIX: { productName: "Oracle Interaction Center Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIL: { productName: "Oracle Sales Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIV: { productName: "Oracle Service Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIM: { productName: "Oracle Marketing Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIE: { productName: "Oracle eCommerce Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIN: { productName: "Oracle Communications Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIY: { productName: "Oracle Systems Intelligence", family: "Business Intelligence", metric: "Application User" },
  BIC: { productName: "Oracle Customer Intelligence", family: "Business Intelligence", metric: "Application User" },
  ISC: { productName: "Oracle Supply Chain Intelligence", family: "Business Intelligence", metric: "Application User" },
  ENI: { productName: "Oracle Product Intelligence", family: "Business Intelligence", metric: "Application User" },
  FII: { productName: "Oracle Financial Intelligence", family: "Business Intelligence", metric: "Application User" },
  ABM: { productName: "Oracle Activity Based Management", family: "Business Intelligence", metric: "Application User" },
  AN: { productName: "Oracle Sales Analysis", family: "Business Intelligence", metric: "Application User" },
  BSC: { productName: "Oracle Balanced Scorecard", family: "Business Intelligence", metric: "Application User" },
  EVM: { productName: "Oracle Value Based Management", family: "Business Intelligence", metric: "Application User" },
  GNI: { productName: "Oracle Genealogy Intelligence", family: "Business Intelligence", metric: "Application User" },
  HCP: { productName: "Oracle Healthcare Intelligence", family: "Business Intelligence", metric: "Application User" },
  OPI: { productName: "Oracle Operations Intelligence", family: "Business Intelligence", metric: "Application User" },
  ZFA: { productName: "Oracle Financial Analyzer", family: "Business Intelligence", metric: "Application User" },
  ZSA: { productName: "Oracle Sales Analyzer", family: "Business Intelligence", metric: "Application User" },
  HRI_BIS: { productName: "Oracle HRMS Intelligence", family: "Business Intelligence", metric: "Application User" },

  // ─── SCM - Mobile Applications ─────────────────────────────────
  MWA: { productName: "Oracle Mobile Supply Chain Applications", family: "Supply Chain", metric: "Application User" },
  MIA: { productName: "Oracle Mobile Applications for Inventory", family: "Supply Chain", metric: "Application User" },
  MQA: { productName: "Oracle Mobile Quality Applications", family: "Supply Chain", metric: "Application User" },

  // ─── Industry-Specific ─────────────────────────────────────────
  BLC: { productName: "Oracle Utility Billing", family: "Industry", metric: "Application User" },
  CDR: { productName: "Oracle Clinical Data Repository", family: "Industry", metric: "Application User" },
  HCC: { productName: "Oracle Healthcare Integration", family: "Industry", metric: "Application User" },
  HCN: { productName: "Oracle Healthcare Integrator", family: "Industry", metric: "Application User" },
  HCT: { productName: "Oracle Healthcare Terminology Server", family: "Industry", metric: "Application User" },
  RRC: { productName: "Oracle Retail Core", family: "Industry", metric: "Application User" },
  CPGC: { productName: "Oracle CPG - Consumer Packaged Goods", family: "Industry", metric: "Application User" },

  // ─── Localizations ────────────────────────────────────────────
  JL: { productName: "Oracle Financials for Latin America", family: "Localization", metric: "Application User", isBase: true },
  JE: { productName: "Oracle Financials for EMEA", family: "Localization", metric: "Application User", isBase: true },
  JA: { productName: "Oracle Financials for Asia/Pacific", family: "Localization", metric: "Application User", isBase: true },
  JG: { productName: "Oracle Regional Localizations", family: "Localization", metric: "Application User", isBase: true },
  JMF: { productName: "Oracle Supply Chain Localizations (Japan)", family: "Localization", metric: "Application User", isBase: true },
  CLE: { productName: "Oracle EMEA Consulting Localizations", family: "Localization", metric: "Application User", isBase: true },
  CLJ: { productName: "Oracle Japan Consulting Localizations", family: "Localization", metric: "Application User", isBase: true },
  CLL: { productName: "Oracle LAD Consulting Localizations", family: "Localization", metric: "Application User", isBase: true },

  // ─── Base / Technology (not separately licensed) ───────────────
  FND: { productName: "Application Object Library", family: "Technology", metric: "N/A", isBase: true },
  AD: { productName: "Applications DBA", family: "Technology", metric: "N/A", isBase: true },
  AU: { productName: "Application Utilities", family: "Technology", metric: "N/A", isBase: true },
  AK: { productName: "Common Modules", family: "Technology", metric: "N/A", isBase: true },
  WF: { productName: "Oracle Workflow", family: "Technology", metric: "N/A", isBase: true },
  XDO: { productName: "Oracle XML Publisher", family: "Technology", metric: "N/A", isBase: true },
  FWK: { productName: "OA Framework", family: "Technology", metric: "N/A", isBase: true },
  JTF: { productName: "CRM Foundation", family: "Technology", metric: "N/A", isBase: true },
  JTM: { productName: "Mobile Application Foundation", family: "Technology", metric: "N/A", isBase: true },
  JTS: { productName: "CRM Self-Service Administration", family: "Technology", metric: "N/A", isBase: true },
  HZ: { productName: "Trading Community Architecture", family: "Technology", metric: "N/A", isBase: true },
  XML: { productName: "Oracle XML Gateway", family: "Technology", metric: "N/A", isBase: true },
  ECX: { productName: "Oracle XML Gateway", family: "Technology", metric: "N/A", isBase: true },
  EC: { productName: "Oracle e-Commerce Gateway", family: "Technology", metric: "N/A", isBase: true },
  ALR: { productName: "Oracle Alert", family: "Technology", metric: "N/A", isBase: true },
  BNE: { productName: "Oracle Web ADI", family: "Technology", metric: "N/A", isBase: true },
  IES: { productName: "Oracle Scripting", family: "Technology", metric: "N/A", isBase: true },
  MES: { productName: "Oracle Messaging Gateway", family: "Technology", metric: "N/A", isBase: true },
  UMX: { productName: "Oracle User Management", family: "Technology", metric: "N/A", isBase: true },
  OAM: { productName: "Oracle Applications Manager", family: "Technology", metric: "N/A", isBase: true },
  AZ: { productName: "Oracle Application Implementation", family: "Technology", metric: "N/A", isBase: true },
  DNA: { productName: "Oracle Development", family: "Technology", metric: "N/A", isBase: true },
  EMS: { productName: "Oracle Environment Management System", family: "Technology", metric: "N/A", isBase: true },
  IPM: { productName: "Oracle Imaging Process Management", family: "Technology", metric: "N/A", isBase: true },
  ITA: { productName: "Oracle Information Technology Audit", family: "Technology", metric: "N/A", isBase: true },
  IZU: { productName: "Oracle E-Business Suite Diagnostics", family: "Technology", metric: "N/A", isBase: true },
  ODQ: { productName: "Oracle Data Query", family: "Technology", metric: "N/A", isBase: true },
  PTX: { productName: "Oracle Patch Tracking System", family: "Technology", metric: "N/A", isBase: true },
  RG: { productName: "Oracle Application Report Generator", family: "Technology", metric: "N/A", isBase: true },
  SHT: { productName: "Oracle Applications Shared Technology", family: "Technology", metric: "N/A", isBase: true },
  AHM: { productName: "Oracle Hosting Manager", family: "Technology", metric: "N/A", isBase: true },
  SYSADMIN: { productName: "System Administration", family: "Technology", metric: "N/A", isBase: true },
  OKB: { productName: "Oracle Contracts Intelligence", family: "Technology", metric: "N/A", isBase: true },
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
  /\bistore\b/i,
  /\bisupport\b/i,
  /\bhtml\b/i,
  /\bweb\b/i,
  /internet\s+expense/i,
  /internet\s+procurement/i,
  /supplier\s+portal/i,
  /employee\s+portal/i,
];

/** Applications whose responsibilities are always Self-Service */
export const SELF_SERVICE_APPS = new Set(["ICX", "POS", "IRC", "POR", "IBE", "IBU", "IMC", "IA"]);

/** License families and their description */
export const LICENSE_FAMILIES: Record<string, string> = {
  Financials: "Oracle E-Business Suite Financials modules",
  Procurement: "Oracle E-Business Suite Procurement modules",
  "Order Management": "Oracle E-Business Suite Order Management modules",
  "Supply Chain": "Oracle E-Business Suite Supply Chain Management modules",
  Manufacturing: "Oracle E-Business Suite Manufacturing modules",
  HRMS: "Oracle E-Business Suite Human Resources modules",
  CRM: "Oracle E-Business Suite Customer Relationship Management modules",
  Projects: "Oracle E-Business Suite Project Management modules",
  "Business Intelligence": "Oracle E-Business Suite BI modules",
  "Public Sector": "Oracle E-Business Suite Public Sector modules",
  Industry: "Oracle E-Business Suite Industry-Specific modules",
  Localization: "Oracle E-Business Suite Regional Localizations",
  Technology: "Base technology components (typically included with EBS license)",
};
