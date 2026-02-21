/**
 * Oracle EBS License Analysis Engine
 *
 * Processes parsed LMS collection CSV data and generates
 * a structured license-requirement report.
 */

import { ParsedCSV } from "./oracle-csv-parser";
import {
  ORACLE_LICENSE_MAP,
  SELF_SERVICE_RESP_PATTERNS,
  SELF_SERVICE_APPS,
  type OracleLicenseProduct,
} from "./oracle-license-map";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface LoadedTables {
  [tableName: string]: ParsedCSV;
}

export interface AppInfo {
  applicationId: string;
  shortName: string;
  displayName: string;
}

export interface ModuleUserDetail {
  userId: string;
  userName: string;
  isActive: boolean;
  lastLogonDate: string;
  isSelfService: boolean;
}

export interface InstalledModule {
  applicationId: string;
  shortName: string;
  displayName: string;
  status: string;
  patchLevel: string;
  licenseProduct: OracleLicenseProduct | null;
  totalUsers: number;
  activeUsers: number;
  selfServiceUsers: number;
  applicationUsers: number;
  responsibilities: string[];
  /** Detailed user list for this module */
  users: ModuleUserDetail[];
}

export interface UserResponsibilityDetail {
  userId: string;
  userName: string;
  responsibilityName: string;
  applicationShortName: string;
  applicationName: string;
  isActive: boolean;
  lastLogonDate: string;
  isSelfService: boolean;
}

export interface UserInfo {
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  lastLogonDate: string;
  isActive: boolean;
}

export interface LicenseSummary {
  productName: string;
  family: string;
  metric: string;
  modules: string[];
  totalUsers: number;
  activeUsers: number;
  selfServiceUsers: number;
  applicationUsers: number;
}

export interface AnalysisResult {
  /** Timestamp of the analysis */
  timestamp: string;
  /** Which files were loaded */
  loadedFiles: string[];
  /** Missing required files */
  missingFiles: string[];
  /** All applications found in FND_APPLICATION */
  applications: AppInfo[];
  /** Installed modules with user/license data */
  installedModules: InstalledModule[];
  /** Installed but unused modules (no users assigned) */
  unusedModules: InstalledModule[];
  /** Aggregated license requirements */
  licenseSummary: LicenseSummary[];
  /** User statistics */
  userStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersWithResponsibilities: number;
    usersWithLogins: number;
  };
  /** User-responsibility detail report */
  userResponsibilities: UserResponsibilityDetail[];
  /** Warnings & findings */
  warnings: string[];
  /** Summary counts */
  counts: {
    installedModules: number;
    licensedProducts: number;
    families: number;
    totalAppUsers: number;
    totalSelfServiceUsers: number;
  };
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/** Parse common Oracle date formats into a Date object */
function parseOracleDate(dateStr: string): Date | null {
  const s = dateStr.trim();
  if (!s) return null;

  // Try DD-MON-YYYY or DD-MON-YY (e.g. "20-FEB-2026", "20-FEB-26")
  const ddMonYyyy = s.match(/^(\d{1,2})[-/]([A-Z]{3})[-/](\d{2,4})$/i);
  if (ddMonYyyy) {
    const day = parseInt(ddMonYyyy[1], 10);
    const mon = MONTH_MAP[ddMonYyyy[2].toUpperCase()];
    let year = parseInt(ddMonYyyy[3], 10);
    if (mon !== undefined) {
      if (year < 100) year += year < 50 ? 2000 : 1900;
      return new Date(year, mon, day);
    }
  }

  // Try DD-MON-YYYY HH:MI:SS (with time part)
  const ddMonYyyyTime = s.match(/^(\d{1,2})[-/]([A-Z]{3})[-/](\d{2,4})\s+\d/i);
  if (ddMonYyyyTime) {
    const day = parseInt(ddMonYyyyTime[1], 10);
    const mon = MONTH_MAP[ddMonYyyyTime[2].toUpperCase()];
    let year = parseInt(ddMonYyyyTime[3], 10);
    if (mon !== undefined) {
      if (year < 100) year += year < 50 ? 2000 : 1900;
      return new Date(year, mon, day);
    }
  }

  // Try YYYY/MM/DD or YYYY-MM-DD (with optional time)
  const yyyyMmDd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyyMmDd) {
    return new Date(parseInt(yyyyMmDd[1], 10), parseInt(yyyyMmDd[2], 10) - 1, parseInt(yyyyMmDd[3], 10));
  }

  // Try MM/DD/YYYY (with optional time)
  const mmDdYyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmDdYyyy) {
    return new Date(parseInt(mmDdYyyy[3], 10), parseInt(mmDdYyyy[1], 10) - 1, parseInt(mmDdYyyy[2], 10));
  }

  // Fallback to native Date constructor
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isDateActive(dateStr: string | undefined): boolean {
  if (!dateStr || dateStr.trim() === "") return true; // null end_date = active
  const d = parseOracleDate(dateStr);
  if (!d) return true; // unparseable = assume active
  return d > new Date();
}

function findColumn(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
  }
  return "";
}

function isSelfServiceResp(respName: string, appShortName: string): boolean {
  if (SELF_SERVICE_APPS.has(appShortName)) return true;
  return SELF_SERVICE_RESP_PATTERNS.some((p) => p.test(respName));
}

// ────────────────────────────────────────────────────────────────
// Main Analysis
// ────────────────────────────────────────────────────────────────

export function analyzeOracleEBS(tables: LoadedTables): AnalysisResult {
  const warnings: string[] = [];
  const loadedFiles = Object.keys(tables);

  // Check required tables
  const missingFiles: string[] = [];
  if (!tables.FND_APPLICATION) missingFiles.push("FND_APPLICATION");
  if (!tables.FND_PRODUCT_INSTALLATIONS) missingFiles.push("FND_PRODUCT_INSTALLATIONS");

  if (missingFiles.includes("FND_APPLICATION") || missingFiles.includes("FND_PRODUCT_INSTALLATIONS")) {
    return {
      timestamp: new Date().toISOString(),
      loadedFiles,
      missingFiles,
      applications: [],
      installedModules: [],
      unusedModules: [],
      licenseSummary: [],
      userResponsibilities: [],
      userStats: { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, usersWithResponsibilities: 0, usersWithLogins: 0 },
      warnings: ["Critical files missing: " + missingFiles.join(", ") + ". Cannot perform analysis."],
      counts: { installedModules: 0, licensedProducts: 0, families: 0, totalAppUsers: 0, totalSelfServiceUsers: 0 },
    };
  }

  if (tables.FND_APPLICATION.rows.length === 0) {
    warnings.push("FND_APPLICATION file was loaded but contains 0 data rows.");
  }
  if (tables.FND_PRODUCT_INSTALLATIONS.rows.length === 0) {
    warnings.push("FND_PRODUCT_INSTALLATIONS file was loaded but contains 0 data rows.");
  }

  // ── 1. Build application map ─────────────────────────────────
  const appMap = new Map<string, AppInfo>();

  for (const row of tables.FND_APPLICATION.rows) {
    const appId = findColumn(row, "APPLICATION_ID", "APP_ID", "APPL_ID");
    const shortName = findColumn(row, "APPLICATION_SHORT_NAME", "APP_SHORT_NAME", "SHORT_NAME");
    if (appId) {
      appMap.set(appId, { applicationId: appId, shortName, displayName: shortName });
    }
  }

  // Merge display names from TL table
  if (tables.FND_APPLICATION_TL) {
    for (const row of tables.FND_APPLICATION_TL.rows) {
      const appId = findColumn(row, "APPLICATION_ID");
      const lang = findColumn(row, "LANGUAGE");
      const name = findColumn(row, "APPLICATION_NAME");
      if (appId && name && (!lang || lang === "US" || lang === "en" || lang.startsWith("en"))) {
        const app = appMap.get(appId);
        if (app) app.displayName = name;
      }
    }
  }

  // ── 2. Build user map ─────────────────────────────────────────
  const userMap = new Map<string, UserInfo>();
  if (tables.FND_USER) {
    const fndUserHeaders = tables.FND_USER.headers;
    console.log(`[Analysis] FND_USER headers: [${fndUserHeaders.join(", ")}]`);
    let sampleCount = 0;
    for (const row of tables.FND_USER.rows) {
      const userId = findColumn(row, "USER_ID");
      const userName = findColumn(row, "USER_NAME");
      const startDate = findColumn(row, "START_DATE");
      const endDate = findColumn(row, "END_DATE");
      const lastLogon = findColumn(row, "LAST_LOGON_DATE");
      if (sampleCount < 5) {
        console.log(`[Analysis] FND_USER sample: userId="${userId}" userName="${userName}" endDate="${endDate}" lastLogon="${lastLogon}" isActive=${isDateActive(endDate)}`);
        sampleCount++;
      }
      if (userId) {
        userMap.set(userId, {
          userId,
          userName,
          startDate,
          endDate,
          lastLogonDate: lastLogon,
          isActive: isDateActive(endDate),
        });
      }
    }
    const activeCount = Array.from(userMap.values()).filter(u => u.isActive).length;
    console.log(`[Analysis] FND_USER: ${userMap.size} users, ${activeCount} active, ${userMap.size - activeCount} inactive`);
  }

  // ── 3. Build responsibility map ───────────────────────────────
  interface RespInfo {
    responsibilityId: string;
    applicationId: string;
    responsibilityKey: string;
    displayName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }
  const respMap = new Map<string, RespInfo>(); // key: appId_respId

  if (tables.FND_RESPONSIBILITY) {
    for (const row of tables.FND_RESPONSIBILITY.rows) {
      const respId = findColumn(row, "RESPONSIBILITY_ID", "RESP_ID");
      const appId = findColumn(row, "APPLICATION_ID", "RESPONSIBILITY_APPLICATION_ID", "RESP_APPLICATION_ID", "RESP_APPL_ID", "APP_ID", "APPL_ID");
      const respKey = findColumn(row, "RESPONSIBILITY_KEY", "RESP_KEY");
      const startDate = findColumn(row, "START_DATE");
      const endDate = findColumn(row, "END_DATE");
      if (respId && appId) {
        const key = `${appId}_${respId}`;
        respMap.set(key, {
          responsibilityId: respId,
          applicationId: appId,
          responsibilityKey: respKey,
          displayName: respKey,
          startDate,
          endDate,
          isActive: isDateActive(endDate),
        });
      }
    }
  }

  // Merge display names from TL table
  if (tables.FND_RESPONSIBILITY_TL) {
    for (const row of tables.FND_RESPONSIBILITY_TL.rows) {
      const respId = findColumn(row, "RESPONSIBILITY_ID");
      const appId = findColumn(row, "APPLICATION_ID");
      const lang = findColumn(row, "LANGUAGE");
      const name = findColumn(row, "RESPONSIBILITY_NAME");
      if (respId && appId && name && (!lang || lang === "US" || lang === "en" || lang.startsWith("en"))) {
        const key = `${appId}_${respId}`;
        const resp = respMap.get(key);
        if (resp) resp.displayName = name;
      }
    }
  }

  // ── 4. Build user-to-responsibility assignments ───────────────
  // key: userId -> Set of "appId_respId"
  const userRespAssignments = new Map<string, Set<string>>();

  const respGroupTable = tables.FND_USER_RESP_GROUPS || tables.FND_USER_RESPONSIBILITY;
  if (respGroupTable) {
    for (const row of respGroupTable.rows) {
      const userId = findColumn(row, "USER_ID");
      const respId = findColumn(row, "RESPONSIBILITY_ID", "RESP_ID");
      const appId = findColumn(row, "RESPONSIBILITY_APPLICATION_ID", "APPLICATION_ID", "RESP_APPLICATION_ID", "RESP_APPL_ID", "APP_ID", "APPL_ID");
      const endDate = findColumn(row, "END_DATE", "END_DATE_ACTIVE");

      if (userId && respId && appId && isDateActive(endDate)) {
        if (!userRespAssignments.has(userId)) {
          userRespAssignments.set(userId, new Set());
        }
        userRespAssignments.get(userId)!.add(`${appId}_${respId}`);
      }
    }
  } else {
    warnings.push("No FND_USER_RESP_GROUPS or FND_USER_RESPONSIBILITY file loaded. User-to-module mapping will be limited.");
  }

  // Diagnostic: warn if user-resp mapping produced nothing
  if (respGroupTable && respGroupTable.rows.length > 0 && userRespAssignments.size === 0) {
    const sampleRow = respGroupTable.rows[0];
    const cols = Object.keys(sampleRow).join(", ");
    warnings.push(
      `FND_USER_RESP_GROUPS/FND_USER_RESPONSIBILITY has ${respGroupTable.rows.length} rows but no valid assignments were found. ` +
      `This may indicate a column name mismatch. Available columns: ${cols}`
    );
  }

  // ── 5. Build login history ────────────────────────────────────
  const usersWithLogins = new Set<string>();
  if (tables.FND_LOGINS) {
    for (const row of tables.FND_LOGINS.rows) {
      const userId = findColumn(row, "USER_ID");
      if (userId) usersWithLogins.add(userId);
    }
  }

  // Build login-responsibility usage (which resp was actually used via login)
  const loginRespUsage = new Map<string, Set<string>>(); // userId -> Set of "appId_respId"
  if (tables.FND_LOGIN_RESPONSIBILITIES && tables.FND_LOGINS) {
    // First build loginId -> userId map
    const loginUserMap = new Map<string, string>();
    for (const row of tables.FND_LOGINS.rows) {
      const loginId = findColumn(row, "LOGIN_ID");
      const userId = findColumn(row, "USER_ID");
      if (loginId && userId) loginUserMap.set(loginId, userId);
    }
    for (const row of tables.FND_LOGIN_RESPONSIBILITIES.rows) {
      const loginId = findColumn(row, "LOGIN_ID");
      const respId = findColumn(row, "RESPONSIBILITY_ID", "LOGIN_RESP_ID");
      const appId = findColumn(row, "RESP_APPL_ID", "RESPONSIBILITY_APPLICATION_ID", "APPLICATION_ID");
      const userId = loginUserMap.get(loginId);
      if (userId && respId && appId) {
        if (!loginRespUsage.has(userId)) loginRespUsage.set(userId, new Set());
        loginRespUsage.get(userId)!.add(`${appId}_${respId}`);
      }
    }
  }

  // ── 6. ICX Sessions (Self-Service usage) ──────────────────────
  const icxUserResps = new Map<string, Set<string>>(); // userId -> Set of "appId_respId"
  if (tables.ICX_SESSIONS) {
    for (const row of tables.ICX_SESSIONS.rows) {
      const userId = findColumn(row, "USER_ID");
      const respId = findColumn(row, "RESPONSIBILITY_ID");
      const appId = findColumn(row, "RESPONSIBILITY_APPLICATION_ID", "RESP_APPL_ID", "APPLICATION_ID");
      if (userId && respId && appId) {
        if (!icxUserResps.has(userId)) icxUserResps.set(userId, new Set());
        icxUserResps.get(userId)!.add(`${appId}_${respId}`);
      }
    }
  }

  // ── 7. Analyze installed modules ──────────────────────────────
  const installedModules: InstalledModule[] = [];
  const unusedModules: InstalledModule[] = [];

  // Diagnostic counters for step-by-step tracing
  let diagTotalRows = 0;
  let diagInstalledRows = 0;
  let diagSkippedStatus = 0;
  let diagSkippedNoApp = 0;
  let diagHasLicense = 0;
  let diagIsBase = 0;
  const diagShortNames: string[] = [];
  const diagSkippedStatuses: string[] = [];

  for (const row of tables.FND_PRODUCT_INSTALLATIONS.rows) {
    diagTotalRows++;
    const appId = findColumn(row, "APPLICATION_ID", "APP_ID", "APPL_ID");
    const rawStatus = findColumn(row, "STATUS", "INSTALL_STATUS").toUpperCase().trim();
    const patchLevel = findColumn(row, "PATCH_LEVEL");

    // Only process installed products (I = Installed, S = Shared Install)
    // Handle both single-char codes and full text values from Oracle exports
    const isInstalled = rawStatus === "I" || rawStatus === "S" ||
      rawStatus === "INSTALLED" || rawStatus === "SHARED" ||
      rawStatus === "SHARED INSTALL" || rawStatus === "INSTALL" ||
      rawStatus.startsWith("I ") || rawStatus.startsWith("S ");
    if (!isInstalled) {
      diagSkippedStatus++;
      if (diagSkippedStatuses.length < 5 && !diagSkippedStatuses.includes(rawStatus)) {
        diagSkippedStatuses.push(rawStatus);
      }
      continue;
    }
    const status = (rawStatus === "S" || rawStatus === "SHARED" || rawStatus === "SHARED INSTALL") ? "S" : "I";

    const appInfo = appMap.get(appId);
    if (!appInfo) {
      diagSkippedNoApp++;
      continue;
    }

    diagInstalledRows++;

    const licenseProduct = ORACLE_LICENSE_MAP[appInfo.shortName] || null;
    if (licenseProduct) {
      diagHasLicense++;
      if (licenseProduct.isBase) diagIsBase++;
    }
    if (diagShortNames.length < 15) diagShortNames.push(appInfo.shortName);

    // Find responsibilities for this application
    const appResps: string[] = [];
    const appRespKeys: string[] = [];
    for (const [key, resp] of respMap.entries()) {
      if (resp.applicationId === appId && resp.isActive) {
        appResps.push(resp.displayName);
        appRespKeys.push(key);
      }
    }

    // Count users assigned to these responsibilities
    const moduleUsers = new Set<string>();
    const moduleActiveUsers = new Set<string>();
    const moduleSelfServiceUsers = new Set<string>();
    const moduleAppUsers = new Set<string>();
    const moduleUserDetails: ModuleUserDetail[] = [];

    for (const [userId, userResps] of userRespAssignments.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;

      const hasRespForApp = appRespKeys.some((rk) => userResps.has(rk));
      if (!hasRespForApp) continue;

      moduleUsers.add(userId);

      // Determine if self-service or application user
      const isSS = appRespKeys.some((rk) => {
        if (!userResps.has(rk)) return false;
        const resp = respMap.get(rk);
        return resp ? isSelfServiceResp(resp.displayName, appInfo.shortName) : false;
      });

      if (user.isActive) {
        moduleActiveUsers.add(userId);
        if (isSS) {
          moduleSelfServiceUsers.add(userId);
        } else {
          moduleAppUsers.add(userId);
        }
      }

      moduleUserDetails.push({
        userId: user.userId,
        userName: user.userName,
        isActive: user.isActive,
        lastLogonDate: user.lastLogonDate,
        isSelfService: isSS,
      });
    }

    const mod: InstalledModule = {
      applicationId: appId,
      shortName: appInfo.shortName,
      displayName: appInfo.displayName,
      status: status === "I" ? "Installed" : "Shared",
      patchLevel,
      licenseProduct,
      totalUsers: moduleUsers.size,
      activeUsers: moduleActiveUsers.size,
      selfServiceUsers: moduleSelfServiceUsers.size,
      applicationUsers: moduleAppUsers.size,
      responsibilities: appResps.slice(0, 20),
      users: moduleUserDetails,
    };

    if (moduleUsers.size === 0 && !licenseProduct?.isBase) {
      unusedModules.push(mod);
    }
    installedModules.push(mod);
  }

  // Log diagnostics to console only (not shown in UI)
  console.log(`[Analysis] FND_PRODUCT_INSTALLATIONS: ${diagTotalRows} rows, ${diagSkippedStatus} skipped (status), ${diagSkippedNoApp} skipped (no app), ${diagInstalledRows} installed`);
  console.log(`[Analysis] License: ${diagHasLicense} mapped, ${diagIsBase} base, shortNames: [${diagShortNames.join(", ")}]`);
  console.log(`[Analysis] Maps: appMap=${appMap.size}, respMap=${respMap.size}, userResp=${userRespAssignments.size}, users=${userMap.size}`);

  // ── 7b. Build user-responsibility detail report ──────────────
  const userResponsibilities: UserResponsibilityDetail[] = [];

  for (const [userId, userResps] of userRespAssignments.entries()) {
    const user = userMap.get(userId);
    if (!user) continue;

    for (const respKey of userResps) {
      const resp = respMap.get(respKey);
      if (!resp) continue;

      const appInfo = appMap.get(resp.applicationId);
      const appShortName = appInfo?.shortName || "";
      const isSS = isSelfServiceResp(resp.displayName, appShortName);

      userResponsibilities.push({
        userId: user.userId,
        userName: user.userName,
        responsibilityName: resp.displayName,
        applicationShortName: appShortName,
        applicationName: appInfo?.displayName || appShortName,
        isActive: user.isActive,
        lastLogonDate: user.lastLogonDate,
        isSelfService: isSS,
      });
    }
  }

  // Sort by userName then responsibility
  userResponsibilities.sort((a, b) =>
    a.userName.localeCompare(b.userName) || a.responsibilityName.localeCompare(b.responsibilityName)
  );

  console.log(`[Analysis] User responsibilities: ${userResponsibilities.length} user-resp assignments`);

  // Sort: licensed products first, then by user count descending
  installedModules.sort((a, b) => {
    if (a.licenseProduct?.isBase && !b.licenseProduct?.isBase) return 1;
    if (!a.licenseProduct?.isBase && b.licenseProduct?.isBase) return -1;
    return b.totalUsers - a.totalUsers;
  });

  // ── 8. Aggregate license summary ──────────────────────────────
  const licenseSummaryMap = new Map<string, LicenseSummary>();

  for (const mod of installedModules) {
    if (!mod.licenseProduct || mod.licenseProduct.isBase) continue;
    const key = mod.licenseProduct.productName;
    if (!licenseSummaryMap.has(key)) {
      licenseSummaryMap.set(key, {
        productName: mod.licenseProduct.productName,
        family: mod.licenseProduct.family,
        metric: mod.licenseProduct.metric,
        modules: [],
        totalUsers: 0,
        activeUsers: 0,
        selfServiceUsers: 0,
        applicationUsers: 0,
      });
    }
    const summary = licenseSummaryMap.get(key)!;
    summary.modules.push(mod.shortName);
    summary.totalUsers = Math.max(summary.totalUsers, mod.totalUsers);
    summary.activeUsers = Math.max(summary.activeUsers, mod.activeUsers);
    summary.selfServiceUsers = Math.max(summary.selfServiceUsers, mod.selfServiceUsers);
    summary.applicationUsers = Math.max(summary.applicationUsers, mod.applicationUsers);
  }

  const licenseSummary = Array.from(licenseSummaryMap.values()).sort((a, b) => b.activeUsers - a.activeUsers);

  console.log(`[Analysis] License summary: ${licenseSummaryMap.size} products from ${installedModules.length} installed modules`);

  // ── 9. User stats ─────────────────────────────────────────────
  const totalUsers = userMap.size;
  const activeUsers = Array.from(userMap.values()).filter((u) => u.isActive).length;
  const usersWithResps = userRespAssignments.size;

  // ── 10. Generate warnings ─────────────────────────────────────
  const installedNonBase = installedModules.filter((m) => !m.licenseProduct?.isBase);
  const unknownModules = installedModules.filter((m) => !m.licenseProduct && m.status === "Installed");
  if (unknownModules.length > 0) {
    warnings.push(
      `${unknownModules.length} installed module(s) could not be mapped to a known Oracle license product: ${unknownModules.map((m) => m.shortName).join(", ")}`
    );
  }
  if (unusedModules.filter((m) => !m.licenseProduct?.isBase).length > 0) {
    warnings.push(
      `${unusedModules.filter((m) => !m.licenseProduct?.isBase).length} licensed module(s) are installed but have no assigned users — potential for license optimization.`
    );
  }
  if (!tables.FND_LOGINS) {
    warnings.push("FND_LOGINS not loaded — cannot distinguish between assigned and actually-used access.");
  }
  if (!tables.ICX_SESSIONS) {
    warnings.push("ICX_SESSIONS not loaded — Self-Service user identification may be less accurate.");
  }

  // Families
  const families = new Set(licenseSummary.map((l) => l.family));

  // Total app/self-service users across all modules
  let totalAppUsers = 0;
  let totalSelfServiceUsers = 0;
  for (const ls of licenseSummary) {
    if (ls.metric === "Self-Service User") {
      totalSelfServiceUsers += ls.activeUsers;
    } else {
      totalAppUsers += ls.applicationUsers;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    loadedFiles,
    missingFiles,
    applications: Array.from(appMap.values()),
    installedModules,
    unusedModules: unusedModules.filter((m) => !m.licenseProduct?.isBase),
    licenseSummary,
    userResponsibilities,
    userStats: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersWithResponsibilities: usersWithResps,
      usersWithLogins: usersWithLogins.size,
    },
    warnings,
    counts: {
      installedModules: installedNonBase.length,
      licensedProducts: licenseSummary.length,
      families: families.size,
      totalAppUsers,
      totalSelfServiceUsers,
    },
  };
}
