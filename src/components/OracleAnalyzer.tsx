"use client";

import { useState, useCallback, useRef } from "react";
import { parseCSV, identifyFile, REQUIRED_FILES, OPTIONAL_FILES } from "@/lib/oracle-csv-parser";
import { analyzeOracleEBS, type AnalysisResult, type LoadedTables } from "@/lib/oracle-analysis-engine";
import { ORACLE_LICENSE_MAP } from "@/lib/oracle-license-map";

interface LoadedFile {
  name: string;
  tableName: string | null;
  size: number;
  status: "recognized" | "unknown" | "error";
}

export interface OwnedLicense {
  id: string;
  productName: string;
  quantity: number;
  metric: string;
  notes: string;
}

export interface ComplianceRow {
  productName: string;
  family: string;
  metric: string;
  ownedQty: number;
  deployedQty: number;
  gap: number;
  status: "compliant" | "under-licensed" | "over-licensed" | "not-deployed" | "not-owned";
}

type Tab = "summary" | "licenses" | "modules" | "users" | "warnings" | "compliance";

export default function OracleAnalyzer() {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [tables, setTables] = useState<LoadedTables>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [ownedLicenses, setOwnedLicenses] = useState<OwnedLicense[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const newFiles: LoadedFile[] = [...loadedFiles];
      const newTables: LoadedTables = { ...tables };

      for (const file of Array.from(files)) {
        const tableName = identifyFile(file.name);
        const entry: LoadedFile = {
          name: file.name,
          tableName,
          size: file.size,
          status: tableName ? "recognized" : "unknown",
        };

        if (tableName && file.name.endsWith(".csv")) {
          try {
            const text = await file.text();
            const parsed = parseCSV(text);
            newTables[tableName] = parsed;
            entry.status = "recognized";
          } catch {
            entry.status = "error";
          }
        }

        // Avoid duplicates
        const existingIdx = newFiles.findIndex((f) => f.name === file.name);
        if (existingIdx >= 0) {
          newFiles[existingIdx] = entry;
        } else {
          newFiles.push(entry);
        }
      }

      setLoadedFiles(newFiles);
      setTables(newTables);
      setResult(null); // reset previous results
    },
    [loadedFiles, tables]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    // Use setTimeout to let the UI update with the loading state
    setTimeout(() => {
      const analysisResult = analyzeOracleEBS(tables);
      setResult(analysisResult);
      setActiveTab("summary");
      setAnalyzing(false);
    }, 100);
  }, [tables]);

  const clearAll = () => {
    setLoadedFiles([]);
    setTables({});
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const recognizedCount = loadedFiles.filter((f) => f.status === "recognized").length;
  const loadedTableNames = Object.keys(tables);
  const hasRequired = REQUIRED_FILES.every((f) => loadedTableNames.includes(f));
  const missingRequired = REQUIRED_FILES.filter((f) => !loadedTableNames.includes(f));
  const missingOptional = OPTIONAL_FILES.filter((f) => !loadedTableNames.includes(f));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Oracle EBS License Analyzer</h1>
        <p className="mt-2 text-gray-600">
          Drop your Oracle LMS collection CSV files to analyze which E-Business Suite licenses are required.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          All processing happens in your browser. No data is uploaded or sent anywhere.
        </div>
      </div>

      {/* Drop Zone */}
      {!result && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              dragOver
                ? "border-brand-500 bg-brand-50 scale-[1.01]"
                : "border-gray-300 bg-gray-50/50 hover:border-brand-300 hover:bg-brand-50/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-500 mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700">
              {dragOver ? "Drop files here..." : "Drop Oracle LMS CSV files here"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              or click to browse. Extract your .rar/.zip first, then select all CSV files.
            </p>
          </div>

          {/* Loaded Files */}
          {loadedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Loaded Files ({recognizedCount} recognized / {loadedFiles.length} total)
                </h3>
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear all
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {loadedFiles.map((f) => {
                  const parsed = f.tableName ? tables[f.tableName] : null;
                  return (
                    <div
                      key={f.name}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        f.status === "recognized"
                          ? "border-green-200 bg-green-50"
                          : f.status === "error"
                          ? "border-red-200 bg-red-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex-shrink-0 h-2 w-2 rounded-full ${
                          f.status === "recognized" ? "bg-green-500" : f.status === "error" ? "bg-red-500" : "bg-gray-400"
                        }`} />
                        <span className="truncate font-mono text-xs">{f.name}</span>
                        {f.tableName && (
                          <span className="ml-auto flex-shrink-0 text-[10px] text-green-600 font-medium">{f.tableName}</span>
                        )}
                      </div>
                      {parsed && (
                        <div className="mt-1 ml-5 text-[10px] text-gray-500">
                          {parsed.rows.length} rows, {parsed.headers.length} cols
                          {parsed.detectedDelimiter && parsed.detectedDelimiter !== "," && (
                            <span className="text-amber-600 ml-1">
                              (delim: {parsed.detectedDelimiter === "\t" ? "TAB" : parsed.detectedDelimiter === "WHITESPACE" ? "SPACE" : parsed.detectedDelimiter})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Missing files notice */}
              {missingRequired.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">Missing required files:</p>
                  <p className="text-xs text-amber-700 mt-1">{missingRequired.join(", ")}.csv</p>
                </div>
              )}
              {missingOptional.length > 0 && missingRequired.length === 0 && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">Optional files not loaded (analysis will still work):</p>
                  <p className="text-xs text-blue-700 mt-1">{missingOptional.join(", ")}.csv</p>
                </div>
              )}

              {/* Analyze Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={runAnalysis}
                  disabled={!hasRequired || analyzing}
                  className="btn-primary text-base px-10 py-4 disabled:opacity-50"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    "Analyze Licenses"
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Results Dashboard */}
      {result && (
        <div className="animate-fade-in">
          {/* Back button */}
          <button
            onClick={() => setResult(null)}
            className="mb-6 flex items-center gap-1 text-sm text-brand-500 hover:text-brand-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Load different files
          </button>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <SummaryCard
              label="Licensed Products"
              value={result.counts.licensedProducts}
              sub={`across ${result.counts.families} families`}
              color="brand"
            />
            <SummaryCard
              label="Installed Modules"
              value={result.counts.installedModules}
              sub={`${result.unusedModules.length} unused`}
              color="blue"
            />
            <SummaryCard
              label="Application Users"
              value={result.counts.totalAppUsers}
              sub="full form access"
              color="green"
            />
            <SummaryCard
              label="Self-Service Users"
              value={result.counts.totalSelfServiceUsers}
              sub="web self-service only"
              color="purple"
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
              {([
                { key: "summary", label: "License Summary" },
                { key: "licenses", label: "Required Licenses" },
                { key: "compliance", label: "Compliance" },
                { key: "modules", label: "Installed Modules" },
                { key: "users", label: "User Statistics" },
                { key: "warnings", label: `Findings (${result.warnings.length})` },
              ] as { key: Tab; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "summary" && <TabSummary result={result} />}
          {activeTab === "licenses" && <TabLicenses result={result} />}
          {activeTab === "compliance" && (
            <TabCompliance
              result={result}
              ownedLicenses={ownedLicenses}
              setOwnedLicenses={setOwnedLicenses}
            />
          )}
          {activeTab === "modules" && (
            <TabModules
              result={result}
              expandedModule={expandedModule}
              setExpandedModule={setExpandedModule}
            />
          )}
          {activeTab === "users" && <TabUsers result={result} />}
          {activeTab === "warnings" && <TabWarnings result={result} />}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.brand}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs opacity-60">{sub}</p>
    </div>
  );
}

function TabSummary({ result }: { result: AnalysisResult }) {
  // Group licenses by family
  const byFamily = new Map<string, typeof result.licenseSummary>();
  for (const ls of result.licenseSummary) {
    if (!byFamily.has(ls.family)) byFamily.set(ls.family, []);
    byFamily.get(ls.family)!.push(ls);
  }

  return (
    <div className="space-y-6">
      {Array.from(byFamily.entries()).map(([family, products]) => (
        <div key={family} className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-brand-500" />
            {family}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">Metric</th>
                  <th className="pb-2 pr-4 text-right">Active Users</th>
                  <th className="pb-2 text-right">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.productName} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{p.productName}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.metric === "Self-Service User"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {p.metric}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{p.activeUsers.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-500">{p.totalUsers.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {result.unusedModules.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/50">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">
            Installed but Unused — Optimization Opportunity
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            These modules are installed but have no users assigned. Consider decommissioning to reduce license costs.
          </p>
          <div className="flex flex-wrap gap-2">
            {result.unusedModules.map((m) => (
              <span key={m.shortName} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800">
                {m.licenseProduct?.productName || m.displayName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabLicenses({ result }: { result: AnalysisResult }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
            <th className="pb-3 pr-4">License Product</th>
            <th className="pb-3 pr-4">Family</th>
            <th className="pb-3 pr-4">Metric</th>
            <th className="pb-3 pr-4 text-right">App Users</th>
            <th className="pb-3 pr-4 text-right">SS Users</th>
            <th className="pb-3 text-right">Total Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {result.licenseSummary.map((ls) => (
            <tr key={ls.productName} className="hover:bg-gray-50/50">
              <td className="py-3 pr-4 font-medium text-gray-900">{ls.productName}</td>
              <td className="py-3 pr-4 text-gray-600">{ls.family}</td>
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  ls.metric === "Self-Service User"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {ls.metric}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">{ls.applicationUsers.toLocaleString()}</td>
              <td className="py-3 pr-4 text-right">{ls.selfServiceUsers.toLocaleString()}</td>
              <td className="py-3 text-right font-semibold">{ls.activeUsers.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.licenseSummary.length === 0 && (
        <p className="text-center text-gray-400 py-8">No licensed products detected. Check that FND_PRODUCT_INSTALLATIONS was loaded correctly.</p>
      )}
    </div>
  );
}

function TabModules({
  result,
  expandedModule,
  setExpandedModule,
}: {
  result: AnalysisResult;
  expandedModule: string | null;
  setExpandedModule: (v: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {result.installedModules.map((mod) => {
        const isExpanded = expandedModule === mod.shortName;
        return (
          <div key={mod.shortName} className="card !p-0 overflow-hidden">
            <button
              onClick={() => setExpandedModule(isExpanded ? null : mod.shortName)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  mod.licenseProduct?.isBase ? "bg-gray-300" : mod.totalUsers > 0 ? "bg-green-500" : "bg-amber-400"
                }`} />
                <div>
                  <span className="font-medium text-gray-900 text-sm">{mod.displayName}</span>
                  <span className="ml-2 text-xs text-gray-400 font-mono">{mod.shortName}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {mod.licenseProduct?.isBase ? (
                  <span className="text-xs text-gray-400">Base Component</span>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">{mod.activeUsers} active users</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      mod.status === "Installed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {mod.status}
                    </span>
                  </>
                )}
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/30">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">License Product</p>
                    <p className="text-sm font-medium">{mod.licenseProduct?.productName || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">License Family</p>
                    <p className="text-sm font-medium">{mod.licenseProduct?.family || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Patch Level</p>
                    <p className="text-sm font-medium font-mono">{mod.patchLevel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">License Metric</p>
                    <p className="text-sm font-medium">{mod.licenseProduct?.metric || "—"}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-4 mb-4">
                  <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{mod.totalUsers}</p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{mod.activeUsers}</p>
                    <p className="text-xs text-gray-500">Active Users</p>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{mod.applicationUsers}</p>
                    <p className="text-xs text-gray-500">App Users</p>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{mod.selfServiceUsers}</p>
                    <p className="text-xs text-gray-500">Self-Service</p>
                  </div>
                </div>
                {mod.responsibilities.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Responsibilities ({mod.responsibilities.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {mod.responsibilities.map((r, i) => (
                        <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 font-mono">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabUsers({ result }: { result: AnalysisResult }) {
  const stats = result.userStats;
  const pctActive = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;
  const pctWithResp = stats.totalUsers > 0 ? Math.round((stats.usersWithResponsibilities / stats.totalUsers) * 100) : 0;
  const pctWithLogins = stats.totalUsers > 0 ? Math.round((stats.usersWithLogins / stats.totalUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Users (FND_USER)" value={stats.totalUsers} />
        <StatCard label="Active Users" value={stats.activeUsers} pct={pctActive} barColor="bg-green-500" />
        <StatCard label="Inactive / End-Dated" value={stats.inactiveUsers} pct={100 - pctActive} barColor="bg-gray-300" />
        <StatCard label="Users with Responsibilities" value={stats.usersWithResponsibilities} pct={pctWithResp} barColor="bg-blue-500" />
        <StatCard label="Users with Login History" value={stats.usersWithLogins} pct={pctWithLogins} barColor="bg-purple-500" />
        <StatCard
          label="Assigned but Never Logged In"
          value={Math.max(0, stats.usersWithResponsibilities - stats.usersWithLogins)}
          pct={stats.usersWithResponsibilities > 0
            ? Math.round(((stats.usersWithResponsibilities - stats.usersWithLogins) / stats.usersWithResponsibilities) * 100)
            : 0}
          barColor="bg-amber-500"
        />
      </div>

      <div className="card border-blue-200 bg-blue-50/50">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Understanding User Counts</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Application Users</strong> are licensed to access Oracle EBS forms (full client or HTML).</li>
          <li><strong>Self-Service Users</strong> only access web-based self-service screens (iProcurement, iExpense, iRecruitment, etc.).</li>
          <li>Users with responsibilities but no login history may represent over-provisioned access — a license optimization opportunity.</li>
          <li>Oracle counts users who <em>could</em> access the system (have active responsibilities), not just those who <em>did</em> log in.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, pct, barColor }: { label: string; value: number; pct?: number; barColor?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {pct !== undefined && barColor && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TabWarnings({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-3">
      {result.warnings.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-400">No warnings or findings.</p>
        </div>
      )}
      {result.warnings.map((w, i) => (
        <div key={i} className="card border-amber-200 bg-amber-50/30 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-800">{w}</p>
        </div>
      ))}

      {/* Files loaded summary */}
      <div className="card mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Analysis Details</h4>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-gray-500">
          <div><span className="font-medium text-gray-700">Timestamp:</span> {new Date(result.timestamp).toLocaleString()}</div>
          <div><span className="font-medium text-gray-700">Files Loaded:</span> {result.loadedFiles.length}</div>
          <div><span className="font-medium text-gray-700">Applications Found:</span> {result.applications.length}</div>
          <div><span className="font-medium text-gray-700">Installed Modules:</span> {result.installedModules.length}</div>
        </div>
        {result.missingFiles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Missing Files:</span> {result.missingFiles.join(", ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance Tab ──────────────────────────────────────────────

/** Build a unique list of all known Oracle product names for the autocomplete */
function getAllProductNames(result: AnalysisResult): string[] {
  const names = new Set<string>();
  // From the analysis results
  for (const ls of result.licenseSummary) names.add(ls.productName);
  // From the full license map (so the user can also add products not detected in deployment)
  for (const entry of Object.values(ORACLE_LICENSE_MAP)) {
    if (!entry.isBase) names.add(entry.productName);
  }
  return Array.from(names).sort();
}

function buildComplianceRows(result: AnalysisResult, owned: OwnedLicense[]): ComplianceRow[] {
  const rows: ComplianceRow[] = [];
  const matchedOwned = new Set<string>();

  // 1. For every deployed (required) license, check if owned
  for (const ls of result.licenseSummary) {
    const ownedEntry = owned.find(
      (o) => o.productName.toLowerCase() === ls.productName.toLowerCase()
    );
    const ownedQty = ownedEntry ? ownedEntry.quantity : 0;
    if (ownedEntry) matchedOwned.add(ownedEntry.id);

    const deployedQty = ls.activeUsers;
    const gap = deployedQty - ownedQty;

    let status: ComplianceRow["status"];
    if (ownedQty === 0) status = "not-owned";
    else if (gap > 0) status = "under-licensed";
    else if (gap < 0) status = "over-licensed";
    else status = "compliant";

    rows.push({
      productName: ls.productName,
      family: ls.family,
      metric: ls.metric,
      ownedQty,
      deployedQty,
      gap,
      status,
    });
  }

  // 2. Owned licenses that don't match any deployed product
  for (const o of owned) {
    if (matchedOwned.has(o.id)) continue;
    rows.push({
      productName: o.productName,
      family: "—",
      metric: o.metric,
      ownedQty: o.quantity,
      deployedQty: 0,
      gap: -o.quantity,
      status: "not-deployed",
    });
  }

  return rows;
}

function TabCompliance({
  result,
  ownedLicenses,
  setOwnedLicenses,
}: {
  result: AnalysisResult;
  ownedLicenses: OwnedLicense[];
  setOwnedLicenses: (v: OwnedLicense[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formProduct, setFormProduct] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formMetric, setFormMetric] = useState("Application User");
  const [formNotes, setFormNotes] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const allProducts = getAllProductNames(result);
  const complianceRows = buildComplianceRows(result, ownedLicenses);

  const counts = {
    compliant: complianceRows.filter((r) => r.status === "compliant").length,
    underLicensed: complianceRows.filter((r) => r.status === "under-licensed" || r.status === "not-owned").length,
    overLicensed: complianceRows.filter((r) => r.status === "over-licensed").length,
    notDeployed: complianceRows.filter((r) => r.status === "not-deployed").length,
  };
  const totalGapUsers = complianceRows
    .filter((r) => r.gap > 0)
    .reduce((sum, r) => sum + r.gap, 0);

  const resetForm = () => {
    setFormProduct("");
    setFormQty("");
    setFormMetric("Application User");
    setFormNotes("");
    setShowForm(false);
    setEditId(null);
    setShowSuggestions(false);
  };

  const handleSave = () => {
    if (!formProduct.trim() || !formQty) return;
    const qty = parseInt(formQty, 10);
    if (isNaN(qty) || qty < 0) return;

    if (editId) {
      setOwnedLicenses(
        ownedLicenses.map((o) =>
          o.id === editId
            ? { ...o, productName: formProduct.trim(), quantity: qty, metric: formMetric, notes: formNotes }
            : o
        )
      );
    } else {
      setOwnedLicenses([
        ...ownedLicenses,
        {
          id: crypto.randomUUID(),
          productName: formProduct.trim(),
          quantity: qty,
          metric: formMetric,
          notes: formNotes,
        },
      ]);
    }
    resetForm();
  };

  const handleEdit = (lic: OwnedLicense) => {
    setEditId(lic.id);
    setFormProduct(lic.productName);
    setFormQty(String(lic.quantity));
    setFormMetric(lic.metric);
    setFormNotes(lic.notes);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setOwnedLicenses(ownedLicenses.filter((o) => o.id !== id));
  };

  const handleProductInput = (value: string) => {
    setFormProduct(value);
    if (value.length >= 2) {
      const filtered = allProducts.filter((p) =>
        p.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name: string) => {
    setFormProduct(name);
    setShowSuggestions(false);
    // Auto-fill metric if we know it from the license map
    const mapEntry = Object.values(ORACLE_LICENSE_MAP).find(
      (e) => e.productName === name
    );
    if (mapEntry && !mapEntry.isBase) {
      setFormMetric(mapEntry.metric);
    }
  };

  const statusColors: Record<string, string> = {
    compliant: "bg-green-100 text-green-800 border-green-200",
    "under-licensed": "bg-red-100 text-red-800 border-red-200",
    "over-licensed": "bg-amber-100 text-amber-800 border-amber-200",
    "not-deployed": "bg-gray-100 text-gray-600 border-gray-200",
    "not-owned": "bg-red-100 text-red-800 border-red-200",
  };
  const statusLabels: Record<string, string> = {
    compliant: "Compliant",
    "under-licensed": "Under-Licensed",
    "over-licensed": "Over-Licensed",
    "not-deployed": "Not Deployed",
    "not-owned": "Not Owned",
  };

  return (
    <div className="space-y-6">
      {/* Compliance summary cards */}
      {ownedLicenses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-4 bg-green-50 text-green-700 border-green-200">
            <p className="text-xs font-medium opacity-80">Compliant</p>
            <p className="text-2xl font-bold">{counts.compliant}</p>
            <p className="text-xs opacity-60">products covered</p>
          </div>
          <div className="rounded-xl border p-4 bg-red-50 text-red-700 border-red-200">
            <p className="text-xs font-medium opacity-80">Under-Licensed</p>
            <p className="text-2xl font-bold">{counts.underLicensed}</p>
            <p className="text-xs opacity-60">{totalGapUsers} users short</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-50 text-amber-700 border-amber-200">
            <p className="text-xs font-medium opacity-80">Over-Licensed</p>
            <p className="text-2xl font-bold">{counts.overLicensed}</p>
            <p className="text-xs opacity-60">potential savings</p>
          </div>
          <div className="rounded-xl border p-4 bg-gray-50 text-gray-600 border-gray-200">
            <p className="text-xs font-medium opacity-80">Not Deployed</p>
            <p className="text-2xl font-bold">{counts.notDeployed}</p>
            <p className="text-xs opacity-60">owned but unused</p>
          </div>
        </div>
      )}

      {/* Owned licenses section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Owned Licenses</h3>
            <p className="text-xs text-gray-500 mt-1">
              Enter the licenses the customer has purchased. These will be compared against the deployment data.
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              + Add License
            </button>
          )}
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50/30 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {editId ? "Edit License" : "Add Owned License"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Product name with autocomplete */}
              <div className="relative sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                <input
                  type="text"
                  value={formProduct}
                  onChange={(e) => handleProductInput(e.target.value)}
                  onFocus={() => { if (formProduct.length >= 2) setShowSuggestions(suggestions.length > 0); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing, e.g. Oracle General Ledger"
                  className="input-field"
                />
                {showSuggestions && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  placeholder="e.g. 150"
                  className="input-field"
                />
              </div>

              {/* Metric */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
                <select
                  value={formMetric}
                  onChange={(e) => setFormMetric(e.target.value)}
                  className="input-field"
                >
                  <option>Application User</option>
                  <option>Self-Service User</option>
                  <option>Processor</option>
                  <option>Named User Plus</option>
                  <option>Employee</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. CSI# 12345, purchased 2023"
                className="input-field"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} className="btn-primary text-sm">
                {editId ? "Update" : "Add"}
              </button>
              <button onClick={resetForm} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Owned licenses table */}
        {ownedLicenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4 text-right">Quantity</th>
                  <th className="pb-2 pr-4">Metric</th>
                  <th className="pb-2 pr-4">Notes</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ownedLicenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{lic.productName}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{lic.quantity.toLocaleString()}</td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                        {lic.metric}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{lic.notes || "—"}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleEdit(lic)}
                        className="text-xs text-brand-500 hover:text-brand-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(lic.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            No owned licenses entered yet. Click &quot;Add License&quot; to start the compliance comparison.
          </div>
        )}
      </div>

      {/* Gap Analysis Table */}
      {ownedLicenses.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Compliance Gap Analysis</h3>
          <p className="text-xs text-gray-500 mb-4">
            Comparison of owned licenses vs. deployed/required usage from the LMS collection data.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Family</th>
                  <th className="pb-3 pr-4">Metric</th>
                  <th className="pb-3 pr-4 text-right">Owned</th>
                  <th className="pb-3 pr-4 text-right">Required</th>
                  <th className="pb-3 pr-4 text-right">Gap</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {complianceRows.map((row) => (
                  <tr key={row.productName} className="hover:bg-gray-50/50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.productName}</td>
                    <td className="py-3 pr-4 text-gray-600">{row.family}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{row.metric}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{row.ownedQty.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{row.deployedQty.toLocaleString()}</td>
                    <td className={`py-3 pr-4 text-right font-bold ${
                      row.gap > 0 ? "text-red-600" : row.gap < 0 ? "text-amber-600" : "text-green-600"
                    }`}>
                      {row.gap > 0 ? `+${row.gap}` : row.gap === 0 ? "0" : String(row.gap)}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[row.status]
                      }`}>
                        {statusLabels[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compliance explanation */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Reading this Table</h4>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong className="text-green-700">Compliant</strong> — Owned quantity meets or exceeds the deployed/required count.</li>
              <li><strong className="text-red-700">Under-Licensed</strong> — More users are deployed than licenses owned. Gap column shows how many additional licenses are needed.</li>
              <li><strong className="text-red-700">Not Owned</strong> — Product is deployed but no license is recorded. Compliance risk.</li>
              <li><strong className="text-amber-700">Over-Licensed</strong> — More licenses owned than required. Potential cost-savings opportunity.</li>
              <li><strong className="text-gray-600">Not Deployed</strong> — License is owned but the product is not deployed. Consider re-harvesting.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
