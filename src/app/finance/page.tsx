"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  FinanceProject,
  Cost,
  Invoice,
  VendorType,
  NetDays,
  ProjectStatus,
  LeadSource,
  VENDOR_LABELS,
  VENDOR_PROJECT_TYPES,
  LEAD_SOURCE_LABELS,
  NET_DAYS_OPTIONS,
  YearlyTarget,
} from "@/lib/finance-types";
import {
  getProjects,
  saveProjects,
  getYearlyTarget,
  saveYearlyTarget,
} from "@/lib/finance-store";

// ── helpers ─────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function totalCosts(p: FinanceProject) {
  return p.costs.reduce((s, c) => s + c.amount, 0);
}

function totalInvoiced(p: FinanceProject) {
  return p.invoices
    .filter((i) => i.status === "sent" || i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
}

function getDueInvoices(p: FinanceProject): Invoice[] {
  const today = new Date().toISOString().split("T")[0];
  return p.invoices.filter(
    (i) => i.status === "pending" && i.date && i.date <= today
  );
}

async function sendInvoiceReminder(
  project: FinanceProject,
  invoice: Invoice
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/invoice-reminder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientName: project.clientName,
      vendorType: VENDOR_LABELS[project.vendorType],
      invoiceDate: invoice.date,
      invoiceAmount: invoice.amount,
      projectRevenue: project.revenue,
    }),
  });
  return res.json();
}

const VENDOR_COLORS: Record<VendorType, string> = {
  oracle: "#C23934",
  ibm: "#0176D3",
  microsoft: "#0078D4",
  workday: "#F68D2E",
  sap: "#0FAAFF",
  salesforce: "#00A1E0",
  broadcom: "#CC092F",
  other: "#747474",
};

const STATUS_CFG: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  won: { bg: "bg-[#E3F5E1]", text: "text-[#2E844A]", dot: "bg-[#2E844A]" },
  lost: { bg: "bg-[#FDE8E8]", text: "text-[#C23934]", dot: "bg-[#C23934]" },
  pending: { bg: "bg-[#FFF3E0]", text: "text-[#E87600]", dot: "bg-[#E87600]" },
};

// ── tab types ───────────────────────────────────────────────
type Tab = "dashboard" | "projects" | "forecast" | "add";
type ProjectFilter = "all" | "won" | "won_not_invoiced";

// ── icons ───────────────────────────────────────────────────
function IconTrendUp() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l6-6 4 4 8-8m0 0h-6m6 0v6" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 8v2" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function FinancePage() {
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [target, setTarget] = useState<YearlyTarget | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProjects(getProjects());
    setTarget(getYearlyTarget());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: FinanceProject[]) => {
    setProjects(next);
    saveProjects(next);
  }, []);

  const wonProjects = projects.filter((p) => p.status === "won");
  const wonNotInvoiced = wonProjects.filter(
    (p) => totalInvoiced(p) < p.revenue
  );
  const totalRevenue = wonProjects.reduce((s, p) => s + p.revenue, 0);
  const totalAllCosts = projects.reduce((s, p) => s + totalCosts(p), 0);
  const totalProfit = totalRevenue - totalAllCosts;
  const wonNotInvoicedRevenue = wonNotInvoiced.reduce(
    (s, p) => s + (p.revenue - totalInvoiced(p)),
    0
  );

  const revenueByVendor = Object.keys(VENDOR_LABELS)
    .map((v) => ({
      vendor: VENDOR_LABELS[v as VendorType],
      revenue: wonProjects
        .filter((p) => p.vendorType === v)
        .reduce((s, p) => s + p.revenue, 0),
      fill: VENDOR_COLORS[v as VendorType],
    }))
    .filter((d) => d.revenue > 0);

  const costsByProject = projects
    .filter((p) => totalCosts(p) > 0)
    .map((p) => ({
      name:
        p.clientName.length > 15
          ? p.clientName.slice(0, 15) + "…"
          : p.clientName,
      costs: totalCosts(p),
      revenue: p.revenue,
    }));

  const statusData = [
    { name: "Won", value: wonProjects.length, color: "#2E844A" },
    {
      name: "Pending",
      value: projects.filter((p) => p.status === "pending").length,
      color: "#E87600",
    },
    {
      name: "Lost",
      value: projects.filter((p) => p.status === "lost").length,
      color: "#C23934",
    },
  ].filter((d) => d.value > 0);

  const filteredProjects =
    filter === "all"
      ? projects
      : filter === "won"
        ? wonProjects
        : wonNotInvoiced;

  function handleSaveProject(project: FinanceProject) {
    const exists = projects.find((p) => p.id === project.id);
    if (exists) {
      persist(projects.map((p) => (p.id === project.id ? project : p)));
    } else {
      persist([...projects, project]);
    }
    setEditingId(null);
    setTab("projects");
  }

  function handleDelete(id: string) {
    persist(projects.filter((p) => p.id !== id));
  }

  function handleEdit(id: string) {
    setEditingId(id);
    setTab("add");
  }

  function handleSetTarget(t: YearlyTarget) {
    setTarget(t);
    saveYearlyTarget(t);
  }

  function handleToggleForecast(id: string) {
    persist(
      projects.map((p) =>
        p.id === id ? { ...p, inForecast: !p.inForecast } : p
      )
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center finance-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-[#0176D3] border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  const targetProgress =
    target && target.targetRevenue > 0
      ? Math.min((totalRevenue / target.targetRevenue) * 100, 100)
      : 0;

  return (
    <div className="min-h-screen finance-bg">
      {/* ── HEADER ─────────────────────────────────────── */}
      <header className="sf-header">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition">
                  <IconChart />
                </div>
                <span className="text-white/90 text-sm font-semibold group-hover:text-white transition">
                  SoftwiseAI
                </span>
              </Link>
              <span className="text-white/30 text-sm">/</span>
              <span className="text-white font-semibold text-sm">
                Finance & Redress Tracker
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingId(null);
                  setTab("add");
                }}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 rounded-md transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>
          </div>
          {/* Tabs */}
          <nav className="flex gap-0.5 -mb-px">
            {(
              [
                ["dashboard", "Dashboard"],
                ["projects", "Projects"],
                ["forecast", "Forecast"],
                ["add", editingId ? "Edit Project" : "New Project"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  if (key !== "add") setEditingId(null);
                  setTab(key);
                }}
                className={`sf-tab ${tab === key ? "sf-tab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {tab === "dashboard" && (
          <Dashboard
            totalRevenue={totalRevenue}
            totalCosts={totalAllCosts}
            totalProfit={totalProfit}
            wonCount={wonProjects.length}
            wonNotInvoicedRevenue={wonNotInvoicedRevenue}
            wonNotInvoicedCount={wonNotInvoiced.length}
            target={target}
            targetProgress={targetProgress}
            onSetTarget={handleSetTarget}
            revenueByVendor={revenueByVendor}
            costsByProject={costsByProject}
            statusData={statusData}
            projectCount={projects.length}
          />
        )}
        {tab === "projects" && (
          <ProjectsTable
            projects={filteredProjects}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {tab === "forecast" && (
          <ForecastTab
            projects={projects}
            onToggleForecast={handleToggleForecast}
            onEdit={handleEdit}
          />
        )}
        {tab === "add" && (
          <ProjectForm
            existing={
              editingId
                ? projects.find((p) => p.id === editingId) ?? null
                : null
            }
            onSave={handleSaveProject}
            onCancel={() => {
              setEditingId(null);
              setTab("projects");
            }}
          />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function Dashboard({
  totalRevenue,
  totalCosts,
  totalProfit,
  wonCount,
  wonNotInvoicedRevenue,
  wonNotInvoicedCount,
  target,
  targetProgress,
  onSetTarget,
  revenueByVendor,
  costsByProject,
  statusData,
  projectCount,
}: {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  wonCount: number;
  wonNotInvoicedRevenue: number;
  wonNotInvoicedCount: number;
  target: YearlyTarget | null;
  targetProgress: number;
  onSetTarget: (t: YearlyTarget) => void;
  revenueByVendor: { vendor: string; revenue: number; fill: string }[];
  costsByProject: { name: string; costs: number; revenue: number }[];
  statusData: { name: string; value: number; color: string }[];
  projectCount: number;
}) {
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetInput, setTargetInput] = useState(
    target?.targetRevenue?.toString() ?? ""
  );
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── TARGET ─────────────────────────── */}
      <div className="sf-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0176D3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#181818]">
                {currentYear} Revenue Target
              </h2>
              {target && (
                <p className="text-xs text-gray-500">
                  {fmt(target.targetRevenue - totalRevenue > 0 ? target.targetRevenue - totalRevenue : 0)} remaining
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowTargetForm(!showTargetForm)}
            className="text-xs font-semibold text-[#0176D3] hover:text-[#014486] px-3 py-1.5 rounded-md hover:bg-[#EEF4FF] transition"
          >
            {target ? "Edit" : "Set Target"}
          </button>
        </div>

        {showTargetForm && (
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="500,000"
                className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-[#0176D3] focus:ring-2 focus:ring-[#0176D3]/20 outline-none transition"
              />
            </div>
            <button
              onClick={() => {
                const val = parseFloat(targetInput);
                if (val > 0) {
                  onSetTarget({ year: currentYear, targetRevenue: val });
                  setShowTargetForm(false);
                }
              }}
              className="bg-[#0176D3] hover:bg-[#014486] text-white text-sm font-semibold px-5 py-2 rounded-md transition"
            >
              Save
            </button>
          </div>
        )}

        {target ? (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#181818]">
                {fmt(totalRevenue)}
                <span className="font-normal text-gray-500">
                  {" "}of {fmt(target.targetRevenue)}
                </span>
              </span>
              <span
                className="font-bold"
                style={{
                  color:
                    targetProgress >= 100
                      ? "#2E844A"
                      : targetProgress >= 60
                        ? "#0176D3"
                        : "#E87600",
                }}
              >
                {targetProgress.toFixed(1)}%
              </span>
            </div>
            <div className="sf-progress-track">
              <div
                className="sf-progress-fill"
                style={{
                  width: `${targetProgress}%`,
                  background:
                    targetProgress >= 100
                      ? "linear-gradient(90deg, #2E844A, #45C65A)"
                      : targetProgress >= 60
                        ? "linear-gradient(90deg, #0176D3, #1B96FF)"
                        : "linear-gradient(90deg, #E87600, #FE9339)",
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Set a revenue target to track your progress.
          </p>
        )}
      </div>

      {/* ── KPI CARDS ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sf-kpi sf-kpi-green p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Revenue Won
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E3F5E1] flex items-center justify-center text-[#2E844A]">
              <IconDollar />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#181818] tracking-tight">
            {fmt(totalRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[#2E844A]"><IconTrendUp /></span>
            <span className="text-xs text-gray-500">
              {wonCount} project{wonCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="sf-kpi sf-kpi-red p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Costs
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FDE8E8] flex items-center justify-center text-[#C23934]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2 6.75H5.625c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#181818] tracking-tight">
            {fmt(totalCosts)}
          </p>
          <p className="text-xs text-gray-500 mt-1.5">
            Across {projectCount} project{projectCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="sf-kpi sf-kpi-blue p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Net Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] flex items-center justify-center text-[#0176D3]">
              <IconChart />
            </div>
          </div>
          <p className={`text-2xl font-extrabold tracking-tight ${totalProfit >= 0 ? "text-[#181818]" : "text-[#C23934]"}`}>
            {fmt(totalProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-1.5">
            {totalRevenue > 0
              ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin`
              : "No revenue yet"}
          </p>
        </div>

        <div className="sf-kpi sf-kpi-amber p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Won Not Invoiced
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center text-[#E87600]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#181818] tracking-tight">
            {fmt(wonNotInvoicedRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1.5">
            {wonNotInvoicedCount} project{wonNotInvoicedCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── CHARTS ─────────────────────────── */}
      {projectCount === 0 && (
        <div className="sf-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#EEF4FF] flex items-center justify-center mx-auto mb-3">
            <IconChart />
          </div>
          <p className="text-sm font-medium text-gray-500">
            Add your first project to see charts and analytics.
          </p>
        </div>
      )}

      {revenueByVendor.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="sf-chart-card">
            <h3 className="text-[13px] font-bold text-[#181818] mb-1">
              Revenue by Vendor
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">Won projects only</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByVendor} barCategoryGap="20%">
                <XAxis dataKey="vendor" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} cursor={{ fill: "rgba(1,118,211,0.06)" }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueByVendor.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="sf-chart-card">
            <h3 className="text-[13px] font-bold text-[#181818] mb-1">
              Project Status
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">All projects</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={4}
                  strokeWidth={0}
                  label={({ name, value }) => `${name ?? ""} (${value ?? 0})`}
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {costsByProject.length > 0 && (
        <div className="sf-chart-card">
          <h3 className="text-[13px] font-bold text-[#181818] mb-1">
            Revenue vs Costs
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">Per project comparison</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsByProject} barCategoryGap="15%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(Number(v ?? 0))} cursor={{ fill: "rgba(1,118,211,0.06)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#0176D3" radius={[6, 6, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="#C23934" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FORECAST TAB
// ═══════════════════════════════════════════════════════════
function ForecastTab({
  projects,
  onToggleForecast,
  onEdit,
}: {
  projects: FinanceProject[];
  onToggleForecast: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const opportunities = projects.filter((p) => p.status === "pending");
  const forecastedOpps = opportunities.filter((p) => p.inForecast);

  const openPipeline = opportunities.reduce((s, p) => s + p.revenue, 0);
  const weightedPipeline = opportunities.reduce(
    (s, p) => s + p.revenue * ((p.probability ?? 0) / 100),
    0
  );
  const forecastedAmount = forecastedOpps.reduce((s, p) => s + p.revenue, 0);
  const weightedForecast = forecastedOpps.reduce(
    (s, p) => s + p.revenue * ((p.probability ?? 0) / 100),
    0
  );

  const bands = [
    { label: "0-25%", min: 0, max: 25, color: "#C23934" },
    { label: "26-50%", min: 26, max: 50, color: "#E87600" },
    { label: "51-75%", min: 51, max: 75, color: "#0176D3" },
    { label: "76-100%", min: 76, max: 100, color: "#2E844A" },
  ];
  const pipelineByBand = bands.map((b) => ({
    band: b.label,
    amount: opportunities
      .filter((p) => (p.probability ?? 0) >= b.min && (p.probability ?? 0) <= b.max)
      .reduce((s, p) => s + p.revenue, 0),
    fill: b.color,
  }));

  const pipelineByVendor = Object.keys(VENDOR_LABELS)
    .map((v) => ({
      vendor: VENDOR_LABELS[v as VendorType],
      amount: opportunities
        .filter((p) => p.vendorType === v)
        .reduce((s, p) => s + p.revenue, 0),
      fill: VENDOR_COLORS[v as VendorType],
    }))
    .filter((d) => d.amount > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sf-gradient-card" style={{ background: "linear-gradient(135deg, #032D60, #0176D3)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-2">
            Open Pipeline
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{fmt(openPipeline)}</p>
          <p className="text-xs opacity-60 mt-1">
            {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <div className="sf-gradient-card" style={{ background: "linear-gradient(135deg, #1B5E20, #2E844A)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-2">
            Weighted Pipeline
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{fmt(weightedPipeline)}</p>
          <p className="text-xs opacity-60 mt-1">Probability-adjusted</p>
        </div>
        <div className="sf-gradient-card" style={{ background: "linear-gradient(135deg, #4A148C, #7526C4)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-2">
            Forecasted Amount
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{fmt(forecastedAmount)}</p>
          <p className="text-xs opacity-60 mt-1">
            {forecastedOpps.length} deal{forecastedOpps.length !== 1 ? "s" : ""} in forecast
          </p>
        </div>
        <div className="sf-gradient-card" style={{ background: "linear-gradient(135deg, #BF360C, #E87600)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-2">
            Weighted Forecast
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{fmt(weightedForecast)}</p>
          <p className="text-xs opacity-60 mt-1">Forecast x probability</p>
        </div>
      </div>

      {/* Charts */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="sf-chart-card">
            <h3 className="text-[13px] font-bold text-[#181818] mb-1">Pipeline by Probability</h3>
            <p className="text-[11px] text-gray-500 mb-4">Revenue grouped by win likelihood</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineByBand} barCategoryGap="20%">
                <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} cursor={{ fill: "rgba(1,118,211,0.06)" }} />
                <Bar dataKey="amount" name="Pipeline" radius={[6, 6, 0, 0]}>
                  {pipelineByBand.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="sf-chart-card">
            <h3 className="text-[13px] font-bold text-[#181818] mb-1">Pipeline by Vendor</h3>
            <p className="text-[11px] text-gray-500 mb-4">Open opportunities breakdown</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pipelineByVendor}
                  dataKey="amount"
                  nameKey="vendor"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={45}
                  paddingAngle={4}
                  strokeWidth={0}
                  label={({ name, value }) => `${name ?? ""} ${fmt(Number(value ?? 0))}`}
                >
                  {pipelineByVendor.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Opportunities table */}
      <div className="sf-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-[#181818]">Active Opportunities</h3>
            <p className="text-[11px] text-gray-500">Tick &quot;Forecast&quot; to include in your committed forecast</p>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            {opportunities.length} record{opportunities.length !== 1 ? "s" : ""}
          </span>
        </div>
        {opportunities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">
              No pending opportunities. Add a project with status &quot;Pending&quot; to see it here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full sf-table">
              <thead>
                <tr>
                  <th className="w-14 text-center">Forecast</th>
                  <th>Client</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-center">Probability</th>
                  <th className="text-right">Weighted</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {opportunities.map((p) => {
                  const weighted = p.revenue * ((p.probability ?? 0) / 100);
                  const prob = p.probability ?? 0;
                  return (
                    <tr key={p.id}>
                      <td className="text-center">
                        <button
                          onClick={() => onToggleForecast(p.id)}
                          className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition mx-auto ${
                            p.inForecast
                              ? "bg-[#0176D3] border-[#0176D3] text-white"
                              : "border-gray-300 hover:border-[#0176D3]"
                          }`}
                        >
                          {p.inForecast && <IconCheck />}
                        </button>
                      </td>
                      <td className="font-semibold text-[#181818]">{p.clientName}</td>
                      <td>
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: VENDOR_COLORS[p.vendorType] }} />
                        {VENDOR_LABELS[p.vendorType]}
                      </td>
                      <td className="text-gray-500">{p.projectType || "—"}</td>
                      <td className="text-right font-mono font-semibold">{fmt(p.revenue)}</td>
                      <td>
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${prob}%`,
                                background: prob >= 75 ? "#2E844A" : prob >= 50 ? "#0176D3" : prob >= 25 ? "#E87600" : "#C23934",
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-7 text-right">{prob}%</span>
                        </div>
                      </td>
                      <td className="text-right font-mono text-gray-500">{fmt(weighted)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => onEdit(p.id)}
                          className="text-[#0176D3] hover:text-[#014486] text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECTS TABLE
// ═══════════════════════════════════════════════════════════
function ProjectsTable({
  projects,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
}: {
  projects: FinanceProject[];
  filter: ProjectFilter;
  onFilterChange: (f: ProjectFilter) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);

  async function handleSendReminder(project: FinanceProject, invoice: Invoice) {
    const key = `${project.id}-${invoice.id}`;
    setSendingReminder(key);
    setReminderResult(null);
    try {
      const result = await sendInvoiceReminder(project, invoice);
      setReminderResult({
        id: key,
        success: result.success ?? false,
        message: result.success ? "Sent!" : result.error ?? "Failed",
      });
    } catch {
      setReminderResult({ id: key, success: false, message: "Error" });
    }
    setSendingReminder(null);
    setTimeout(() => setReminderResult(null), 4000);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {(
          [
            ["all", "All Projects"],
            ["won", "Won"],
            ["won_not_invoiced", "Won – Not Invoiced"],
          ] as [ProjectFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
              filter === key
                ? "bg-[#0176D3] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#0176D3] hover:text-[#0176D3]"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 font-medium">
          {projects.length} record{projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="sf-card p-12 text-center">
          <p className="text-sm text-gray-400">No projects match this filter.</p>
        </div>
      ) : (
        <div className="sf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full sf-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Costs</th>
                  <th className="text-right">Invoiced</th>
                  <th>Invoices</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const costs = totalCosts(p);
                  const invoiced = totalInvoiced(p);
                  const scfg = STATUS_CFG[p.status];
                  return (
                    <tr key={p.id}>
                      <td className="font-semibold text-[#181818]">{p.clientName}</td>
                      <td>
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: VENDOR_COLORS[p.vendorType] }} />
                        {VENDOR_LABELS[p.vendorType]}
                      </td>
                      <td className="text-gray-500">{p.projectType || "—"}</td>
                      <td className="text-gray-500">
                        {p.leadSource ? LEAD_SOURCE_LABELS[p.leadSource] ?? p.leadSource : "—"}
                      </td>
                      <td>
                        <span className={`sf-badge ${scfg.bg} ${scfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${scfg.dot}`} />
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="text-right font-mono font-semibold">{fmt(p.revenue)}</td>
                      <td className="text-right font-mono text-[#C23934]">
                        {costs > 0 ? fmt(costs) : "—"}
                      </td>
                      <td className="text-right font-mono">{invoiced > 0 ? fmt(invoiced) : "—"}</td>
                      <td>
                        {(() => {
                          const due = getDueInvoices(p);
                          return p.invoices.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span title={p.invoices.map((i) => `${i.date} (${i.status}) Net ${i.netDays ?? 30}`).join(", ")}>
                                {p.invoices.length}
                              </span>
                              {due.length > 0 && (
                                <span className="sf-badge bg-[#FDE8E8] text-[#C23934]">
                                  {due.length} due
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          );
                        })()}
                      </td>
                      <td className="text-right">
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEdit(p.id)}
                              className="text-[#0176D3] hover:text-[#014486] text-xs font-semibold"
                            >
                              Edit
                            </button>
                            {confirmDelete === p.id ? (
                              <button
                                onClick={() => { onDelete(p.id); setConfirmDelete(null); }}
                                className="text-[#C23934] text-xs font-semibold"
                              >
                                Confirm?
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(p.id)}
                                className="text-gray-400 hover:text-[#C23934] text-xs font-semibold"
                              >
                                Del
                              </button>
                            )}
                          </div>
                          {getDueInvoices(p).map((inv) => {
                            const key = `${p.id}-${inv.id}`;
                            return (
                              <div key={inv.id} className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSendReminder(p, inv)}
                                  disabled={sendingReminder === key}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#FDE8E8] text-[#C23934] hover:bg-[#FACFCF] font-semibold disabled:opacity-50 transition whitespace-nowrap"
                                >
                                  {sendingReminder === key ? "Sending…" : `Remind ${inv.date}`}
                                </button>
                                {reminderResult?.id === key && (
                                  <span className={`text-[10px] font-semibold ${reminderResult.success ? "text-[#2E844A]" : "text-[#C23934]"}`}>
                                    {reminderResult.message}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECT FORM
// ═══════════════════════════════════════════════════════════
function ProjectForm({
  existing,
  onSave,
  onCancel,
}: {
  existing: FinanceProject | null;
  onSave: (p: FinanceProject) => void;
  onCancel: () => void;
}) {
  const [clientName, setClientName] = useState(existing?.clientName ?? "");
  const [vendorType, setVendorType] = useState<VendorType>(existing?.vendorType ?? "microsoft");
  const [projectType, setProjectType] = useState(existing?.projectType ?? "");
  const [leadSource, setLeadSource] = useState<LeadSource>(existing?.leadSource ?? "web");
  const [revenue, setRevenue] = useState(existing?.revenue?.toString() ?? "");
  const [status, setStatus] = useState<ProjectStatus>(existing?.status ?? "won");
  const [probability, setProbability] = useState(existing?.probability?.toString() ?? "50");
  const [inForecast, setInForecast] = useState(existing?.inForecast ?? false);
  const [costs, setCosts] = useState<Cost[]>(existing?.costs ?? []);
  const [invoiceCount, setInvoiceCount] = useState(existing?.invoiceCount?.toString() ?? "1");
  const [invoices, setInvoices] = useState<Invoice[]>(existing?.invoices ?? []);

  useEffect(() => {
    if (!existing) setProjectType("");
    else if (!VENDOR_PROJECT_TYPES[vendorType].includes(projectType)) setProjectType("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorType]);

  useEffect(() => {
    const count = parseInt(invoiceCount) || 0;
    setInvoices((prev) => {
      if (count > prev.length) {
        const slots: Invoice[] = [];
        for (let i = prev.length; i < count; i++)
          slots.push({ id: uid(), date: "", amount: 0, netDays: 30, status: "pending" });
        return [...prev, ...slots];
      }
      return prev.slice(0, count);
    });
  }, [invoiceCount]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !revenue) return;
    onSave({
      id: existing?.id ?? uid(),
      clientName: clientName.trim(),
      vendorType,
      projectType,
      leadSource,
      revenue: parseFloat(revenue) || 0,
      costs,
      invoiceCount: parseInt(invoiceCount) || 0,
      invoices,
      status,
      probability: parseInt(probability) || 0,
      inForecast,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
  }

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-2 focus:ring-[#0176D3]/20 outline-none transition";
  const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="sf-card p-6 space-y-6 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0176D3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-[#181818]">
          {existing ? "Edit Project" : "New Project"}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Client Name</label>
          <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="Acme Corp" />
        </div>
        <div>
          <label className={labelCls}>Vendor</label>
          <select value={vendorType} onChange={(e) => setVendorType(e.target.value as VendorType)} className={inputCls}>
            {Object.entries(VENDOR_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Project Type</label>
          <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputCls}>
            <option value="">Select type…</option>
            {VENDOR_PROJECT_TYPES[vendorType].map((pt) => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Lead Source</label>
          <select value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)} className={inputCls}>
            {Object.entries(LEAD_SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Revenue ($)</label>
          <input type="number" required min="0" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={inputCls} placeholder="100,000" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputCls}>
            <option value="won">Won</option>
            <option value="pending">Pending</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Probability (%)</label>
          <input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setInForecast(!inForecast)}
              className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition ${
                inForecast ? "bg-[#0176D3] border-[#0176D3] text-white" : "border-gray-300 hover:border-[#0176D3]"
              }`}
            >
              {inForecast && <IconCheck />}
            </button>
            <span className="text-sm font-medium text-gray-700">Include in Forecast</span>
          </label>
        </div>
      </div>

      {/* Costs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>Known Costs</label>
          <button
            type="button"
            onClick={() => setCosts([...costs, { id: uid(), description: "", amount: 0 }])}
            className="text-xs font-semibold text-[#0176D3] hover:text-[#014486] px-2 py-1 rounded hover:bg-[#EEF4FF] transition"
          >
            + Add Cost
          </button>
        </div>
        {costs.length === 0 && <p className="text-xs text-gray-400">No costs added.</p>}
        <div className="space-y-2">
          {costs.map((c) => (
            <div key={c.id} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Description"
                value={c.description}
                onChange={(e) => setCosts(costs.map((x) => x.id === c.id ? { ...x, description: e.target.value } : x))}
                className={`${inputCls} flex-1`}
              />
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.amount || ""}
                  onChange={(e) => setCosts(costs.map((x) => x.id === c.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                  className={`${inputCls} pl-6`}
                />
              </div>
              <button type="button" onClick={() => setCosts(costs.filter((x) => x.id !== c.id))} className="text-gray-400 hover:text-[#C23934] p-1 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div className="mb-3">
          <label className={labelCls}>Number of Invoices</label>
          <input type="number" min="0" max="50" value={invoiceCount} onChange={(e) => setInvoiceCount(e.target.value)} className={`${inputCls} w-24`} />
        </div>
        {invoices.length > 0 && (
          <div className="space-y-2">
            {invoices.map((inv, idx) => (
              <div key={inv.id} className="flex flex-wrap gap-3 items-center bg-[#FAFBFC] rounded-lg p-3 border border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-16">
                  Inv {idx + 1}
                </span>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Date</label>
                  <input
                    type="date"
                    value={inv.date}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, date: e.target.value } : x))}
                    className={`${inputCls} w-auto`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inv.amount || ""}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                    className={`${inputCls} w-28`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Net Days</label>
                  <select
                    value={inv.netDays ?? 30}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, netDays: parseInt(e.target.value) as NetDays } : x))}
                    className={`${inputCls} w-24`}
                  >
                    {NET_DAYS_OPTIONS.map((d) => <option key={d} value={d}>Net {d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Status</label>
                  <select
                    value={inv.status}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, status: e.target.value as Invoice["status"] } : x))}
                    className={`${inputCls} w-28`}
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-3 border-t border-gray-100">
        <button type="submit" className="bg-[#0176D3] hover:bg-[#014486] text-white text-sm font-semibold px-6 py-2.5 rounded-md transition shadow-sm">
          {existing ? "Update Project" : "Save Project"}
        </button>
        <button type="button" onClick={onCancel} className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold px-6 py-2.5 rounded-md hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
