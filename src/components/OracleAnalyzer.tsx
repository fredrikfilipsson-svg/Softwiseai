"use client";

import React, { useState, useCallback, useRef } from "react";
import { parseCSV, identifyFile, REQUIRED_FILES, OPTIONAL_FILES } from "@/lib/oracle-csv-parser";
import { analyzeOracleEBS, type AnalysisResult, type LoadedTables } from "@/lib/oracle-analysis-engine";
import { ORACLE_LICENSE_MAP, ORACLE_LIST_PRICES, ORACLE_ANNUAL_SUPPORT_PCT } from "@/lib/oracle-license-map";

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

type Tab = "summary" | "licenses" | "modules" | "users" | "responsibilities" | "resp-mapping" | "warnings" | "compliance" | "cost";

/** Generate a CSV string from headers and rows, then trigger a browser download */
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const csvLines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generate a printable PDF report in a new window */
function generatePDFReport(result: AnalysisResult) {
  const win = window.open("", "_blank");
  if (!win) return;

  const licensedProducts = result.licenseSummary.filter((ls) => ls.activeUsers > 0);
  const allProducts = result.licenseSummary;

  // Build cost section HTML
  const costData = allProducts
    .filter((ls) => ls.activeUsers > 0)
    .map((ls) => {
      const price = ORACLE_LIST_PRICES[ls.productName] ?? 0;
      const licenseCost = ls.activeUsers * price;
      const support = licenseCost * ORACLE_ANNUAL_SUPPORT_PCT;
      return { productName: ls.productName, family: ls.family, activeUsers: ls.activeUsers, price, licenseCost, support };
    })
    .filter((r) => r.licenseCost > 0)
    .sort((a, b) => b.licenseCost - a.licenseCost);
  const totalLicCost = costData.reduce((s, r) => s + r.licenseCost, 0);
  const totalSupCost = costData.reduce((s, r) => s + r.support, 0);
  const fmtUSD = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  let costSectionHtml = "";
  if (costData.length > 0) {
    const costRowsHtml = costData.map((r) =>
      '<tr>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:500">' + r.productName + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee">' + r.family + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">' + r.activeUsers.toLocaleString() + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">' + fmtUSD(r.price) + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#1e40af">' + fmtUSD(r.licenseCost) + '</td>' +
      '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#92400e">' + fmtUSD(r.support) + '</td>' +
      '</tr>'
    ).join("");

    costSectionHtml =
      '<div class="sec"><div class="sn">05</div><h2>Estimated License Investment</h2></div>' +
      '<div class="kg">' +
      '<div class="kpi"><div class="kv" style="color:#1e3a5f">' + fmtUSD(totalLicCost) + '</div><div class="kl">License Cost (List)</div></div>' +
      '<div class="kpi"><div class="kv" style="color:#78350f">' + fmtUSD(totalSupCost) + '</div><div class="kl">Annual Support (22%)</div></div>' +
      '<div class="kpi"><div class="kv" style="color:#065f46">' + fmtUSD(totalLicCost + totalSupCost) + '</div><div class="kl">Year 1 Total</div></div>' +
      '<div class="kpi"><div class="kv" style="color:#581c87">' + fmtUSD(totalLicCost + totalSupCost * 5) + '</div><div class="kl">5-Year TCO</div></div>' +
      '</div>' +
      '<table><thead><tr>' +
      '<th>License Product</th><th>Family</th>' +
      '<th class="r">Users</th><th class="r">List Price</th>' +
      '<th class="r">License Cost</th><th class="r">Annual Support</th>' +
      '</tr></thead><tbody>' + costRowsHtml + '</tbody>' +
      '<tfoot><tr style="background:#f1f5f9;font-weight:700">' +
      '<td colspan="4">Total</td>' +
      '<td class="r" style="color:#1e3a5f">' + fmtUSD(totalLicCost) + '</td>' +
      '<td class="r" style="color:#78350f">' + fmtUSD(totalSupCost) + '</td>' +
      '</tr></tfoot></table>' +
      '<p class="fn">* Oracle EBS Global Price List (USD). Actual prices subject to negotiated discounts (30-60% typical). Annual support = 22% of net license fees.</p>';
  }

  const productRows = allProducts.map((ls) =>
    `<tr${ls.activeUsers === 0 ? ' style="color:#999"' : ""}>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:500">${ls.productName}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${ls.family}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${ls.metric}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${ls.applicationUsers.toLocaleString()}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${ls.selfServiceUsers.toLocaleString()}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${ls.activeUsers.toLocaleString()}</td>
    </tr>`
  ).join("");

  const moduleRows = result.installedModules
    .filter((m) => !m.licenseProduct?.isBase && m.activeUsers > 0)
    .map((m) =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:500">${m.displayName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${m.licenseProduct?.productName || "—"}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${m.activeUsers.toLocaleString()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${m.applicationUsers.toLocaleString()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${m.selfServiceUsers.toLocaleString()}</td>
      </tr>`
    ).join("");

  const warningItems = result.warnings.map((w) => `<li style="margin-bottom:4px">${w}</li>`).join("");

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const execCost = totalLicCost > 0 ? " Estimated license exposure at list prices is <strong>" + fmtUSD(totalLicCost) + "</strong> with <strong>" + fmtUSD(totalSupCost) + "</strong>/yr support." : "";
  const execUnused = result.unusedModules.length > 0 ? " " + result.unusedModules.length + " module(s) have no active users — optimization opportunity." : "";

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Oracle EBS License Analysis — Redress Compliance</title>
<style>
@page{size:A4;margin:15mm 20mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,Segoe UI,-apple-system,sans-serif;color:#1e293b;font-size:11px;line-height:1.5}
.cover{background:linear-gradient(135deg,#0f172a,#1e3a5f,#0c4a6e);color:#fff;padding:48px 40px 40px;margin:-15mm -20mm 0}
.cb{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#93c5fd;font-weight:600;margin-bottom:6px}
.cover h1{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px;line-height:1.2}
.cs{font-size:13px;color:#bfdbfe;line-height:1.6}
.cm{margin-top:24px;display:flex;gap:24px;font-size:11px;color:#93c5fd;flex-wrap:wrap}
.cnt{padding:32px 40px;margin:0 -20mm}
.es{background:#f0f9ff;border-left:4px solid #0284c7;padding:20px 24px;margin-bottom:32px;border-radius:0 8px 8px 0}
.es h3{font-size:14px;font-weight:700;color:#0c4a6e;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px}
.es p{font-size:12px;color:#334155;line-height:1.7}
.sec{display:flex;align-items:center;gap:12px;margin-top:36px;margin-bottom:16px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;page-break-after:avoid}
.sn{background:#0f172a;color:#fff;font-size:10px;font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sec h2{font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.5px}
.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;background:#fafbfc}
.kv{font-size:22px;font-weight:800;letter-spacing:-.5px}
.kl{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e2e8f0;font-size:10.5px}
thead{background:#0f172a;color:#fff}
th{padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
.r{text-align:right}
tfoot td{border-top:2px solid #cbd5e1}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600}
.bap{background:#dbeafe;color:#1e40af}.bss{background:#f3e8ff;color:#6b21a8}
.chip{display:inline-block;background:#fef3c7;border:1px solid #fbbf24;color:#92400e;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:500;margin:3px 4px 3px 0}
.wb{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px}
.wb h4{color:#92400e;font-size:12px;font-weight:700;margin-bottom:8px}
.wb li{font-size:11px;color:#78350f;margin-bottom:4px;line-height:1.5}
.fn{font-size:9px;color:#94a3b8;margin-top:8px;font-style:italic}
.pf{margin-top:48px;padding-top:20px;border-top:2px solid #0f172a;display:flex;justify-content:space-between;align-items:center}
.pfl{font-size:10px;color:#64748b}.pfb{font-size:11px;font-weight:700;color:#0f172a;letter-spacing:1px;text-transform:uppercase}
.conf{display:inline-block;background:#fef2f2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
@media print{.cover{margin:-15mm -20mm 0}.cnt{margin:0 -20mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="cover">
<div class="cb">Redress Compliance</div>
<h1>Oracle E-Business Suite<br>License Analysis Report</h1>
<div class="cs">Independent license position assessment based on Oracle LMS collection data analysis.</div>
<div class="cm">
<span>Report Date: ${reportDate}</span>
<span>Files: ${result.loadedFiles.length}</span>
<span>Modules: ${result.counts.installedModules}</span>
<span>${result.userStats.activeUsers.toLocaleString()} Active Users</span>
</div>
</div>
<div class="cnt">
<div class="es"><h3>Executive Summary</h3>
<p>Analysis identifies <strong>${licensedProducts.length} licensed products</strong> across <strong>${result.counts.families} families</strong>. <strong>${result.counts.totalAppUsers.toLocaleString()} Application Users</strong> and <strong>${result.counts.totalSelfServiceUsers.toLocaleString()} Self-Service Users</strong> are deployed.${execUnused}${execCost}</p>
</div>
<div class="sec"><div class="sn">01</div><h2>Deployment Overview</h2></div>
<div class="kg">
<div class="kpi"><div class="kv" style="color:#1e3a5f">${result.counts.licensedProducts}</div><div class="kl">Licensed Products</div></div>
<div class="kpi"><div class="kv" style="color:#0c4a6e">${result.counts.installedModules}</div><div class="kl">Installed Modules</div></div>
<div class="kpi"><div class="kv" style="color:#065f46">${result.counts.totalAppUsers.toLocaleString()}</div><div class="kl">Application Users</div></div>
<div class="kpi"><div class="kv" style="color:#581c87">${result.counts.totalSelfServiceUsers.toLocaleString()}</div><div class="kl">Self-Service Users</div></div>
</div>

<div class="sec"><div class="sn">02</div><h2>License Requirements</h2></div>
<table>
<thead><tr><th>License Product</th><th>Family</th><th>Metric</th><th class="r">App Users</th><th class="r">SS Users</th><th class="r">Total Active</th></tr></thead>
<tbody>${productRows}</tbody>
</table>

<div class="sec"><div class="sn">03</div><h2>Installed Modules</h2></div>
<table>
<thead><tr><th>Module</th><th>License Product</th><th class="r">Active</th><th class="r">App</th><th class="r">SS</th></tr></thead>
<tbody>${moduleRows}</tbody>
</table>

<div class="sec"><div class="sn">04</div><h2>User Population</h2></div>
<div class="kg">
<div class="kpi"><div class="kv" style="color:#1e3a5f">${result.userStats.totalUsers.toLocaleString()}</div><div class="kl">Total Users</div></div>
<div class="kpi"><div class="kv" style="color:#065f46">${result.userStats.activeUsers.toLocaleString()}</div><div class="kl">Active</div></div>
<div class="kpi"><div class="kv" style="color:#78350f">${result.userStats.inactiveUsers.toLocaleString()}</div><div class="kl">Inactive</div></div>
<div class="kpi"><div class="kv" style="color:#0c4a6e">${result.userStats.usersWithLogins.toLocaleString()}</div><div class="kl">With Logins</div></div>
</div>

${costSectionHtml}

${result.warnings.length > 0 ? `
<div class="sec"><div class="sn">06</div><h2>Findings &amp; Observations</h2></div>
<div class="wb"><h4>Key Findings (${result.warnings.length})</h4><ul style="padding-left:18px">${warningItems}</ul></div>
` : ""}

${result.unusedModules.length > 0 ? `
<div class="sec"><div class="sn">07</div><h2>Optimization Opportunities</h2></div>
<p style="font-size:11px;color:#475569;margin-bottom:10px">${result.unusedModules.length} module(s) installed with no active users — potential for license harvesting.</p>
<div>${result.unusedModules.map((m) => '<span class="chip">' + (m.licenseProduct?.productName || m.displayName) + '</span>').join("")}</div>
` : ""}

<div style="margin-top:36px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px">
<h4 style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px">Disclaimer</h4>
<p style="font-size:9.5px;color:#64748b;line-height:1.6">This report is based on Oracle LMS collection data for license management planning. Cost estimates use Oracle list prices and do not account for contractual discounts or bundle pricing. This does not constitute legal or contractual advice. Redress Compliance recommends engaging Oracle directly for formal compliance verification.</p>
</div>
<div class="pf"><div class="pfl">${reportDate} &middot; <span class="conf">Confidential</span></div><div class="pfb">Redress Compliance</div></div>
</div></body></html>`);
  win.document.close();
  // Auto-trigger print dialog after a short delay
  setTimeout(() => win.print(), 500);
}

/** Check if a login date string is on or after a given cutoff date string (YYYY-MM-DD) */
function isLoginAfter(loginDateStr: string, cutoff: string): boolean {
  if (!loginDateStr || !cutoff) return true;
  // Try parsing common formats: MM/DD/YYYY HH:MM:SS, YYYY-MM-DD, DD-MON-YYYY
  const d = new Date(loginDateStr);
  if (!isNaN(d.getTime())) {
    const c = new Date(cutoff + "T00:00:00");
    return d >= c;
  }
  return true; // unparseable = include
}

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
        console.log(`[OracleAnalyzer] File: "${file.name}" → table: ${tableName ?? "UNRECOGNIZED"}`);
        const entry: LoadedFile = {
          name: file.name,
          tableName,
          size: file.size,
          status: tableName ? "recognized" : "unknown",
        };

        const lowerName = file.name.toLowerCase();
        if (tableName && (lowerName.endsWith(".csv") || lowerName.endsWith(".txt") || lowerName.endsWith(".dat"))) {
          try {
            const text = await file.text();
            console.log(`[OracleAnalyzer] Parsing "${file.name}" (${text.length} chars, first 200: "${text.substring(0, 200).replace(/\n/g, "\\n")}")`);
            const parsed = parseCSV(text);
            console.log(`[OracleAnalyzer] Parsed "${file.name}" → ${parsed.rows.length} rows, ${parsed.headers.length} cols, headers: [${parsed.headers.slice(0, 5).join(", ")}], delim="${parsed.detectedDelimiter}", skipped=${parsed.skippedLines}`);
            newTables[tableName] = parsed;
            entry.status = "recognized";
          } catch (err) {
            console.error(`[OracleAnalyzer] Error parsing "${file.name}":`, err);
            entry.status = "error";
          }
        } else if (!tableName) {
          console.warn(`[OracleAnalyzer] File "${file.name}" not recognized as any known Oracle table`);
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
    console.log(`[OracleAnalyzer v5] Running analysis with ${Object.keys(tables).length} tables: [${Object.keys(tables).join(", ")}]`);
    for (const [name, csv] of Object.entries(tables)) {
      console.log(`[OracleAnalyzer v5] Table "${name}": ${csv.rows.length} rows, headers=[${csv.headers.slice(0, 5).join(", ")}]`);
    }
    // Use setTimeout to let the UI update with the loading state
    setTimeout(() => {
      const analysisResult = analyzeOracleEBS(tables);
      console.log(`[OracleAnalyzer v5] Analysis complete: ${analysisResult.applications.length} apps, ${analysisResult.installedModules.length} modules, ${analysisResult.licenseSummary.length} licenses, ${analysisResult.warnings.length} warnings`);
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
        <h1 className="text-3xl font-bold text-gray-900">Oracle EBS License Analyzer <span className="text-xs font-normal text-gray-400">v5</span></h1>
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
              accept=".csv,.txt,.dat,.CSV,.TXT,.DAT"
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
          {/* Action bar */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setResult(null)}
              className="flex items-center gap-1 text-sm text-brand-500 hover:text-brand-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Load different files
            </button>
            <button
              onClick={() => generatePDFReport(result)}
              className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Generate PDF Report
            </button>
          </div>

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
                { key: "responsibilities", label: "User Responsibilities" },
                { key: "resp-mapping", label: "Resp → License" },
                { key: "users", label: "User Statistics" },
                { key: "cost", label: "Cost Estimate" },
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
          {activeTab === "responsibilities" && <TabUserResponsibilities result={result} />}
          {activeTab === "resp-mapping" && <TabRespMapping result={result} />}
          {activeTab === "users" && <TabUsers result={result} />}
          {activeTab === "cost" && <TabCostEstimate result={result} />}
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
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loginAfter, setLoginAfter] = useState("");

  // Group licenses by family
  const byFamily = new Map<string, typeof result.licenseSummary>();
  for (const ls of result.licenseSummary) {
    if (!byFamily.has(ls.family)) byFamily.set(ls.family, []);
    byFamily.get(ls.family)!.push(ls);
  }

  // Build a lookup: productName -> combined users from all modules mapped to that product
  const productUsersMap = new Map<string, typeof result.installedModules[0]["users"]>();
  for (const mod of result.installedModules) {
    if (!mod.licenseProduct || mod.licenseProduct.isBase) continue;
    const key = mod.licenseProduct.productName;
    if (!productUsersMap.has(key)) productUsersMap.set(key, []);
    // Add users, dedup by userId
    const existing = productUsersMap.get(key)!;
    const existingIds = new Set(existing.map((u) => u.userId));
    for (const u of mod.users) {
      if (!existingIds.has(u.userId)) {
        existing.push(u);
        existingIds.add(u.userId);
      }
    }
  }

  const exportProductUsers = (productName: string) => {
    const allUsers = productUsersMap.get(productName) || [];
    const users = allUsers.filter((u) => {
      if (activeOnly && !u.isActive) return false;
      if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
      return true;
    });
    const headers = ["User Name", "User ID", "Active", "Last Logon Date", "User Type"];
    const rows = users.map((u) => [
      u.userName,
      u.userId,
      u.isActive ? "Yes" : "No",
      u.lastLogonDate || "Never",
      u.isSelfService ? "Self-Service" : "Application",
    ]);
    const safeName = productName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadCSV(`${safeName}_users${activeOnly ? "_active" : ""}.csv`, headers, rows);
  };

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
                {products.map((p) => {
                  const isExpanded = expandedProduct === p.productName;
                  const users = productUsersMap.get(p.productName) || [];
                  return (
                    <React.Fragment key={p.productName}>
                      <tr
                        onClick={() => setExpandedProduct(isExpanded ? null : p.productName)}
                        className="hover:bg-gray-50/50 cursor-pointer"
                      >
                        <td className="py-2.5 pr-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                            {p.productName}
                          </div>
                        </td>
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
                      {isExpanded && (() => {
                        const displayUsers = users.filter((u) => {
                          if (activeOnly && !u.isActive) return false;
                          if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
                          return true;
                        });
                        return (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <div className="bg-gray-50/70 border-y border-gray-100 px-6 py-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex flex-wrap items-center gap-4">
                                  <p className="text-xs font-medium text-gray-600">
                                    {displayUsers.length} users{activeOnly || loginAfter ? " (filtered)" : ""} assigned to {p.productName}
                                    {displayUsers.length !== users.length && (
                                      <span className="text-gray-400 ml-1">({users.length} total)</span>
                                    )}
                                  </p>
                                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={activeOnly}
                                      onChange={(e) => setActiveOnly(e.target.checked)}
                                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-3.5 w-3.5"
                                    />
                                    Active only
                                  </label>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600" onClick={(e) => e.stopPropagation()}>
                                    <span>Login after:</span>
                                    <input
                                      type="date"
                                      value={loginAfter}
                                      onChange={(e) => setLoginAfter(e.target.value)}
                                      className="rounded border border-gray-300 px-2 py-0.5 text-xs focus:border-brand-500 focus:ring-brand-500"
                                    />
                                    {loginAfter && (
                                      <button onClick={() => setLoginAfter("")} className="text-gray-400 hover:text-red-500 text-xs">clear</button>
                                    )}
                                  </div>
                                </div>
                                {displayUsers.length > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); exportProductUsers(p.productName); }}
                                    className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Export Excel
                                  </button>
                                )}
                              </div>
                              {displayUsers.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 bg-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                                        <th className="px-3 py-2">User Name</th>
                                        <th className="px-3 py-2">User ID</th>
                                        <th className="px-3 py-2">Active</th>
                                        <th className="px-3 py-2">Last Logon</th>
                                        <th className="px-3 py-2">Type</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {displayUsers.slice(0, 50).map((u, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                          <td className="px-3 py-1.5 font-medium text-gray-900">{u.userName}</td>
                                          <td className="px-3 py-1.5 text-gray-500 font-mono">{u.userId}</td>
                                          <td className="px-3 py-1.5">
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                              u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                            }`}>
                                              {u.isActive ? "Active" : "Inactive"}
                                            </span>
                                          </td>
                                          <td className="px-3 py-1.5 text-gray-500">{u.lastLogonDate || "Never"}</td>
                                          <td className="px-3 py-1.5">
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                              u.isSelfService ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                            }`}>
                                              {u.isSelfService ? "Self-Service" : "Application"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {displayUsers.length > 50 && (
                                    <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
                                      Showing first 50 of {displayUsers.length} users. Export to Excel for the full list.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">
                                  {activeOnly ? "No active users assigned." : "No users assigned."}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
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
  const [hideZero, setHideZero] = useState(true);
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loginAfter, setLoginAfter] = useState("");

  const displayed = hideZero ? result.licenseSummary.filter((ls) => ls.activeUsers > 0) : result.licenseSummary;

  // Build user lookup per product (same as TabSummary)
  const productUsersMap = new Map<string, typeof result.installedModules[0]["users"]>();
  for (const mod of result.installedModules) {
    if (!mod.licenseProduct || mod.licenseProduct.isBase) continue;
    const key = mod.licenseProduct.productName;
    if (!productUsersMap.has(key)) productUsersMap.set(key, []);
    const existing = productUsersMap.get(key)!;
    const existingIds = new Set(existing.map((u) => u.userId));
    for (const u of mod.users) {
      if (!existingIds.has(u.userId)) {
        existing.push(u);
        existingIds.add(u.userId);
      }
    }
  }

  const exportProductUsers = (productName: string) => {
    const allUsers = productUsersMap.get(productName) || [];
    const users = allUsers.filter((u) => {
      if (activeOnly && !u.isActive) return false;
      if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
      return true;
    });
    const headers = ["User Name", "User ID", "Active", "Last Logon Date", "User Type"];
    const rows = users.map((u) => [
      u.userName, u.userId, u.isActive ? "Yes" : "No", u.lastLogonDate || "Never", u.isSelfService ? "Self-Service" : "Application",
    ]);
    const safeName = productName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadCSV(`${safeName}_users.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(e) => setHideZero(e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Hide products with 0 users
        </label>
        <span className="text-xs text-gray-400">
          {displayed.length} of {result.licenseSummary.length} products
        </span>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3 pr-4">License Product</th>
              <th className="px-4 py-3 pr-4">Family</th>
              <th className="px-4 py-3 pr-4">Metric</th>
              <th className="px-4 py-3 pr-4 text-right">App Users</th>
              <th className="px-4 py-3 pr-4 text-right">SS Users</th>
              <th className="px-4 py-3 text-right">Total Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map((ls) => {
              const isExpanded = expandedLicense === ls.productName;
              const allUsers = productUsersMap.get(ls.productName) || [];
              const filteredUsers = allUsers.filter((u) => {
                if (activeOnly && !u.isActive) return false;
                if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
                return true;
              });
              return (
                <React.Fragment key={ls.productName}>
                  <tr
                    onClick={() => setExpandedLicense(isExpanded ? null : ls.productName)}
                    className="hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="px-4 py-3 pr-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        {ls.productName}
                      </div>
                    </td>
                    <td className="px-4 py-3 pr-4 text-gray-600">{ls.family}</td>
                    <td className="px-4 py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        ls.metric === "Self-Service User"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {ls.metric}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-4 text-right">{ls.applicationUsers.toLocaleString()}</td>
                    <td className="px-4 py-3 pr-4 text-right">{ls.selfServiceUsers.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">{ls.activeUsers.toLocaleString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="bg-gray-50/70 border-y border-gray-100 px-6 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-4">
                              <p className="text-xs font-medium text-gray-600">
                                {filteredUsers.length} users{(activeOnly || loginAfter) ? " (filtered)" : ""}
                                {filteredUsers.length !== allUsers.length && (
                                  <span className="text-gray-400 ml-1">({allUsers.length} total)</span>
                                )}
                              </p>
                              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)}
                                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-3.5 w-3.5" />
                                Active only
                              </label>
                              <div className="flex items-center gap-1.5 text-xs text-gray-600" onClick={(e) => e.stopPropagation()}>
                                <span>Login after:</span>
                                <input type="date" value={loginAfter} onChange={(e) => setLoginAfter(e.target.value)}
                                  className="rounded border border-gray-300 px-2 py-0.5 text-xs focus:border-brand-500 focus:ring-brand-500" />
                                {loginAfter && <button onClick={() => setLoginAfter("")} className="text-gray-400 hover:text-red-500 text-xs">clear</button>}
                              </div>
                            </div>
                            {filteredUsers.length > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); exportProductUsers(ls.productName); }}
                                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Export Excel
                              </button>
                            )}
                          </div>
                          {filteredUsers.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                                    <th className="px-3 py-2">User Name</th>
                                    <th className="px-3 py-2">User ID</th>
                                    <th className="px-3 py-2">Active</th>
                                    <th className="px-3 py-2">Last Logon</th>
                                    <th className="px-3 py-2">Type</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {filteredUsers.slice(0, 100).map((u, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                      <td className="px-3 py-1.5 font-medium text-gray-900">{u.userName}</td>
                                      <td className="px-3 py-1.5 text-gray-500 font-mono">{u.userId}</td>
                                      <td className="px-3 py-1.5">
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                          u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                        }`}>{u.isActive ? "Active" : "Inactive"}</span>
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-500">{u.lastLogonDate || "Never"}</td>
                                      <td className="px-3 py-1.5">
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                          u.isSelfService ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                        }`}>{u.isSelfService ? "Self-Service" : "Application"}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {filteredUsers.length > 100 && (
                                <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
                                  Showing first 100 of {filteredUsers.length} users. Export to Excel for the full list.
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">{activeOnly || loginAfter ? "No users match the current filters." : "No users assigned."}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {hideZero ? "All products have 0 active users. Uncheck the filter to see them." : "No licensed products detected."}
          </p>
        )}
      </div>
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
  const [activeOnly, setActiveOnly] = useState(false);
  const [loginAfter, setLoginAfter] = useState("");

  const exportModuleUsers = (mod: typeof result.installedModules[0]) => {
    const users = mod.users.filter((u) => {
      if (activeOnly && !u.isActive) return false;
      if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
      return true;
    });
    const headers = ["User Name", "User ID", "Active", "Last Logon Date", "User Type"];
    const rows = users.map((u) => [
      u.userName,
      u.userId,
      u.isActive ? "Yes" : "No",
      u.lastLogonDate || "Never",
      u.isSelfService ? "Self-Service" : "Application",
    ]);
    const safeName = mod.shortName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadCSV(`${safeName}_users${activeOnly ? "_active" : ""}.csv`, headers, rows);
  };

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
                  <div
                    className="rounded-lg bg-white border border-gray-200 p-3 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => { setActiveOnly(false); document.getElementById(`mod-users-${mod.shortName}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
                  >
                    <p className="text-2xl font-bold text-gray-900">{mod.totalUsers}</p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </div>
                  <div
                    className="rounded-lg bg-white border border-green-300 p-3 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-colors"
                    onClick={() => { setActiveOnly(true); document.getElementById(`mod-users-${mod.shortName}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
                  >
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
                  <div className="mb-4">
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
                {/* User Details Table */}
                <div id={`mod-users-${mod.shortName}`} />
                {mod.users.length > 0 && (() => {
                  const displayUsers = mod.users.filter((u) => {
                    if (activeOnly && !u.isActive) return false;
                    if (loginAfter && !isLoginAfter(u.lastLogonDate, loginAfter)) return false;
                    return true;
                  });
                  return (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-xs text-gray-400">
                          Users ({displayUsers.length}{displayUsers.length !== mod.users.length ? ` of ${mod.users.length}` : ""})
                        </p>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeOnly}
                            onChange={(e) => setActiveOnly(e.target.checked)}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-3.5 w-3.5"
                          />
                          Active only
                        </label>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span>Login after:</span>
                          <input
                            type="date"
                            value={loginAfter}
                            onChange={(e) => setLoginAfter(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-0.5 text-xs focus:border-brand-500 focus:ring-brand-500"
                          />
                          {loginAfter && (
                            <button onClick={() => setLoginAfter("")} className="text-gray-400 hover:text-red-500 text-xs">clear</button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); exportModuleUsers(mod); }}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Export Excel
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                            <th className="px-3 py-2">User Name</th>
                            <th className="px-3 py-2">User ID</th>
                            <th className="px-3 py-2">Active</th>
                            <th className="px-3 py-2">Last Logon</th>
                            <th className="px-3 py-2">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {displayUsers.slice(0, 100).map((u, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-3 py-1.5 font-medium text-gray-900">{u.userName}</td>
                              <td className="px-3 py-1.5 text-gray-500 font-mono">{u.userId}</td>
                              <td className="px-3 py-1.5">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {u.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-500">{u.lastLogonDate || "Never"}</td>
                              <td className="px-3 py-1.5">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  u.isSelfService ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {u.isSelfService ? "Self-Service" : "Application"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {displayUsers.length > 100 && (
                        <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
                          Showing first 100 of {displayUsers.length} users. Export to Excel for the full list.
                        </div>
                      )}
                      {displayUsers.length === 0 && (
                        <div className="px-3 py-4 text-xs text-gray-400 text-center">
                          {activeOnly ? "No active users assigned to this module." : "No users to display."}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
                {mod.users.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No users assigned to this module.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabRespMapping({ result }: { result: AnalysisResult }) {
  const [filterResp, setFilterResp] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  const filtered = result.responsibilityModules.filter((rm) => {
    if (filterResp && !rm.responsibilityName.toLowerCase().includes(filterResp.toLowerCase())) return false;
    if (filterProduct && !rm.licenseProduct.toLowerCase().includes(filterProduct.toLowerCase()) &&
        !rm.licenseFamily.toLowerCase().includes(filterProduct.toLowerCase())) return false;
    return true;
  });

  // Group by license product for summary view
  const byProduct = new Map<string, { family: string; resps: typeof filtered }>();
  for (const rm of filtered) {
    if (!byProduct.has(rm.licenseProduct)) {
      byProduct.set(rm.licenseProduct, { family: rm.licenseFamily, resps: [] });
    }
    byProduct.get(rm.licenseProduct)!.resps.push(rm);
  }

  const exportMapping = () => {
    const headers = ["Responsibility", "Responsibility Key", "Application", "License Product", "License Family", "Users", "Active Users"];
    const rows = filtered.map((rm) => [
      rm.responsibilityName,
      rm.responsibilityKey,
      rm.applicationShortName,
      rm.licenseProduct,
      rm.licenseFamily,
      String(rm.userCount),
      String(rm.activeUserCount),
    ]);
    downloadCSV("responsibility_license_mapping.csv", headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Summary + Export */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{filtered.length}</span> responsibilities across{" "}
          <span className="font-semibold">{byProduct.size}</span> license products
        </div>
        <button
          onClick={exportMapping}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card !py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={filterResp}
              onChange={(e) => setFilterResp(e.target.value)}
              placeholder="Filter by responsibility name..."
              className="input-field text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              placeholder="Filter by license product or family..."
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* Grouped by License Product */}
      {Array.from(byProduct.entries()).map(([product, { family, resps }]) => (
        <div key={product} className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
                {product}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{family}</p>
            </div>
            <span className="rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-medium">
              {resps.length} {resps.length === 1 ? "responsibility" : "responsibilities"}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Responsibility</th>
                  <th className="px-3 py-2">Application</th>
                  <th className="px-3 py-2 text-right">Users</th>
                  <th className="px-3 py-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {resps.map((rm, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-1.5 text-gray-900">{rm.responsibilityName}</td>
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{rm.applicationShortName}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{rm.userCount.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-green-700">{rm.activeUserCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-400">No responsibilities found matching your filters.</p>
        </div>
      )}

      <div className="card border-blue-200 bg-blue-50/50">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Understanding This View</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Each responsibility is linked to an Oracle application (module).</li>
          <li>The license product is determined by which application owns the responsibility.</li>
          <li>A user with a given responsibility triggers the license requirement for the associated product.</li>
          <li>Use this to understand exactly which responsibilities drive which license costs.</li>
        </ul>
      </div>
    </div>
  );
}

function TabUserResponsibilities({ result }: { result: AnalysisResult }) {
  const [filterUser, setFilterUser] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const filtered = result.userResponsibilities.filter((ur) => {
    if (filterActiveOnly && !ur.isActive) return false;
    if (filterUser && !ur.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterApp && !ur.applicationName.toLowerCase().includes(filterApp.toLowerCase()) &&
        !ur.applicationShortName.toLowerCase().includes(filterApp.toLowerCase())) return false;
    return true;
  });

  // Build a lookup: appShortName -> license product name
  const appToLicense = new Map<string, string>();
  for (const rm of result.responsibilityModules) {
    appToLicense.set(rm.applicationShortName, rm.licenseProduct);
  }

  const exportAll = () => {
    const data = filtered;
    const headers = ["User Name", "User ID", "Responsibility", "Application", "License Product", "Active", "Last Logon Date", "User Type"];
    const rows = data.map((ur) => [
      ur.userName,
      ur.userId,
      ur.responsibilityName,
      ur.applicationName,
      appToLicense.get(ur.applicationShortName) || "N/A",
      ur.isActive ? "Yes" : "No",
      ur.lastLogonDate || "Never",
      ur.isSelfService ? "Self-Service" : "Application",
    ]);
    downloadCSV("user_responsibilities_report.csv", headers, rows);
  };

  // Group by user for summary
  const uniqueUsers = new Set(filtered.map((ur) => ur.userId)).size;
  const uniqueResps = new Set(filtered.map((ur) => ur.responsibilityName)).size;

  return (
    <div className="space-y-4">
      {/* Summary + Export */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{uniqueUsers.toLocaleString()}</span> users,{" "}
          <span className="font-semibold">{uniqueResps.toLocaleString()}</span> responsibilities,{" "}
          <span className="font-semibold">{filtered.length.toLocaleString()}</span> assignments
          {filtered.length !== result.userResponsibilities.length && (
            <span className="text-gray-400 ml-1">(filtered from {result.userResponsibilities.length.toLocaleString()})</span>
          )}
        </div>
        <button
          onClick={exportAll}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card !py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="Filter by user name..."
              className="input-field text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              placeholder="Filter by application..."
              className="input-field text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Active users only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">User Name</th>
              <th className="px-4 py-3">Responsibility</th>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">License Product</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Last Logon</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.slice(0, 200).map((ur, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{ur.userName}</td>
                <td className="px-4 py-2.5 text-gray-700">{ur.responsibilityName}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                  <span className="font-mono text-xs">{ur.applicationShortName}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-700 text-xs">{appToLicense.get(ur.applicationShortName) || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    ur.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {ur.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{ur.lastLogonDate || "Never"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    ur.isSelfService ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {ur.isSelfService ? "Self-Service" : "Application"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
            Showing first 200 of {filtered.length.toLocaleString()} assignments. Export to Excel for the full list.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No user-responsibility assignments found matching your filters.
          </div>
        )}
      </div>
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

// ─── Cost Estimate Dashboard ─────────────────────────────────────

interface CostLine {
  productName: string;
  family: string;
  metric: string;
  activeUsers: number;
  listPrice: number;
  licenseCost: number;
  annualSupport: number;
  hasPricing: boolean;
}

function TabCostEstimate({ result }: { result: AnalysisResult }) {
  const [hideZeroCost, setHideZeroCost] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);

  // Build cost lines for each licensed product
  const costLines: CostLine[] = result.licenseSummary
    .filter((ls) => !ORACLE_LICENSE_MAP[ls.modules[0]]?.isBase)
    .map((ls) => {
      const price = ORACLE_LIST_PRICES[ls.productName] ?? 0;
      const users = ls.activeUsers;
      const discountMultiplier = 1 - discountPct / 100;
      const licenseCost = users * price * discountMultiplier;
      const annualSupport = licenseCost * ORACLE_ANNUAL_SUPPORT_PCT;
      return {
        productName: ls.productName,
        family: ls.family,
        metric: ls.metric,
        activeUsers: users,
        listPrice: price,
        licenseCost,
        annualSupport,
        hasPricing: price > 0,
      };
    })
    .sort((a, b) => b.licenseCost - a.licenseCost);

  const displayed = hideZeroCost ? costLines.filter((cl) => cl.licenseCost > 0) : costLines;

  const totalLicenseCost = costLines.reduce((s, cl) => s + cl.licenseCost, 0);
  const totalAnnualSupport = costLines.reduce((s, cl) => s + cl.annualSupport, 0);
  const totalYear1 = totalLicenseCost + totalAnnualSupport;
  const total5Year = totalLicenseCost + totalAnnualSupport * 5;
  const productsWithPricing = costLines.filter((cl) => cl.hasPricing && cl.activeUsers > 0).length;
  const productsWithoutPricing = costLines.filter((cl) => !cl.hasPricing && cl.activeUsers > 0).length;

  // Group by family for the chart
  const familyCosts = new Map<string, number>();
  for (const cl of costLines) {
    familyCosts.set(cl.family, (familyCosts.get(cl.family) || 0) + cl.licenseCost);
  }
  const familyEntries = Array.from(familyCosts.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxFamilyCost = familyEntries.length > 0 ? familyEntries[0][1] : 1;

  const familyColors: Record<string, string> = {
    Financials: "bg-blue-500",
    Procurement: "bg-green-500",
    "Supply Chain": "bg-amber-500",
    HRMS: "bg-purple-500",
    CRM: "bg-pink-500",
    Projects: "bg-indigo-500",
    "Business Intelligence": "bg-cyan-500",
    "Order Management": "bg-orange-500",
    "Public Sector": "bg-teal-500",
    Industry: "bg-red-500",
  };

  const exportCostEstimate = () => {
    const headers = [
      "License Product", "Family", "Metric", "Active Users",
      "List Price (USD)", "Discount %", "License Cost (USD)", "Annual Support (USD)",
    ];
    const rows = costLines.filter((cl) => cl.activeUsers > 0).map((cl) => [
      cl.productName, cl.family, cl.metric, String(cl.activeUsers),
      cl.listPrice > 0 ? cl.listPrice.toFixed(0) : "N/A",
      String(discountPct),
      cl.licenseCost.toFixed(0),
      cl.annualSupport.toFixed(0),
    ]);
    rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["TOTAL LICENSE COST", "", "", "", "", "", totalLicenseCost.toFixed(0), ""]);
    rows.push(["TOTAL ANNUAL SUPPORT (22%)", "", "", "", "", "", "", totalAnnualSupport.toFixed(0)]);
    rows.push(["TOTAL YEAR 1 COST", "", "", "", "", "", totalYear1.toFixed(0), ""]);
    rows.push(["TOTAL 5-YEAR TCO", "", "", "", "", "", total5Year.toFixed(0), ""]);
    downloadCSV(`oracle_cost_estimate_${discountPct}pct_discount.csv`, headers, rows);
  };

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-5 bg-blue-50 text-blue-700 border-blue-200">
          <p className="text-xs font-medium opacity-80">Total License Cost</p>
          <p className="mt-1 text-2xl font-bold">{fmt(totalLicenseCost)}</p>
          <p className="mt-1 text-xs opacity-60">{discountPct > 0 ? `${discountPct}% discount applied` : "list price (no discount)"}</p>
        </div>
        <div className="rounded-xl border p-5 bg-amber-50 text-amber-700 border-amber-200">
          <p className="text-xs font-medium opacity-80">Annual Support (22%)</p>
          <p className="mt-1 text-2xl font-bold">{fmt(totalAnnualSupport)}</p>
          <p className="mt-1 text-xs opacity-60">recurring yearly</p>
        </div>
        <div className="rounded-xl border p-5 bg-green-50 text-green-700 border-green-200">
          <p className="text-xs font-medium opacity-80">Year 1 Total</p>
          <p className="mt-1 text-2xl font-bold">{fmt(totalYear1)}</p>
          <p className="mt-1 text-xs opacity-60">license + first year support</p>
        </div>
        <div className="rounded-xl border p-5 bg-purple-50 text-purple-700 border-purple-200">
          <p className="text-xs font-medium opacity-80">5-Year TCO</p>
          <p className="mt-1 text-2xl font-bold">{fmt(total5Year)}</p>
          <p className="mt-1 text-xs opacity-60">license + 5 years support</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Discount:</label>
              <input
                type="range"
                min="0" max="70" step="5"
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-32 accent-brand-500"
              />
              <span className="text-sm font-bold text-brand-600 w-12">{discountPct}%</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={hideZeroCost}
                onChange={(e) => setHideZeroCost(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Hide zero-cost products
            </label>
          </div>
          <button
            onClick={exportCostEstimate}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Cost Estimate
          </button>
        </div>
      </div>

      {/* Cost by Family Bar Chart */}
      {familyEntries.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">License Cost by Family</h3>
          <div className="space-y-3">
            {familyEntries.map(([family, cost]) => (
              <div key={family} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-40 truncate">{family}</span>
                <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${familyColors[family] || "bg-gray-500"} transition-all`}
                    style={{ width: `${Math.max((cost / maxFamilyCost) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-32 text-right">{fmt(cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Cost Table */}
      <div className="card overflow-x-auto !p-0">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Detailed Cost Breakdown ({displayed.filter((cl) => cl.activeUsers > 0).length} products with active users)
          </h3>
          {productsWithoutPricing > 0 && (
            <span className="text-xs text-amber-600">
              {productsWithoutPricing} product(s) without list price data
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3 text-right">Active Users</th>
              <th className="px-4 py-3 text-right">List Price</th>
              <th className="px-4 py-3 text-right">License Cost</th>
              <th className="px-4 py-3 text-right">Annual Support</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map((cl) => (
              <tr key={cl.productName} className={`hover:bg-gray-50/50 ${cl.activeUsers === 0 ? "opacity-40" : ""}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{cl.productName}</td>
                <td className="px-4 py-3 text-gray-600">{cl.family}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    cl.metric === "Self-Service User" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {cl.metric}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{cl.activeUsers.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {cl.hasPricing ? (
                    <span className="text-gray-700">{fmt(cl.listPrice)}</span>
                  ) : (
                    <span className="text-amber-500 text-xs">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-700">
                  {cl.licenseCost > 0 ? fmt(cl.licenseCost) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-amber-700">
                  {cl.annualSupport > 0 ? fmt(cl.annualSupport) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <tr>
              <td className="px-4 py-3 text-gray-900" colSpan={5}>Total</td>
              <td className="px-4 py-3 text-right text-blue-700">{fmt(totalLicenseCost)}</td>
              <td className="px-4 py-3 text-right text-amber-700">{fmt(totalAnnualSupport)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Important Disclaimer</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Prices shown are <strong>Oracle list prices (USD)</strong> from the E-Business Suite Applications Global Price List.</li>
          <li>Actual contract prices typically include 30–60% discounts depending on deal size and negotiation.</li>
          <li>Use the discount slider above to model different discount scenarios.</li>
          <li>Annual support is calculated at <strong>22%</strong> of net license fees (Oracle Software Update License & Support).</li>
          <li>Products marked <strong>N/A</strong> do not have list price data available — consult Oracle or your licensing advisor.</li>
          <li>Some modules may be included in suite/bundle deals at reduced per-module cost.</li>
          <li>This is an <strong>estimate only</strong> — always verify with your Oracle contract and sales representative.</li>
        </ul>
      </div>
    </div>
  );
}
