"use client";

import { useEffect, useState, useCallback, CSSProperties } from "react";
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

// ── inline style constants ──────────────────────────────────
const S = {
  pageBg: { background: "#f3f5f9", minHeight: "100vh" } as CSSProperties,
  header: { background: "linear-gradient(135deg, #032D60 0%, #0176D3 100%)" } as CSSProperties,
  card: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.05)",
  } as CSSProperties,
  chartCard: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.05)",
    padding: 24,
  } as CSSProperties,
  kpi: (accentColor: string) =>
    ({
      background: "white",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      border: "1px solid rgba(0,0,0,0.05)",
      position: "relative" as const,
      overflow: "hidden" as const,
      borderTop: `3px solid ${accentColor}`,
      padding: 20,
    }) as CSSProperties,
  th: {
    background: "#FAFBFC",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#6B7280",
    padding: "10px 16px",
    borderBottom: "2px solid #E5E7EB",
  } as CSSProperties,
  td: {
    padding: "12px 16px",
    fontSize: 13,
    borderBottom: "1px solid #F3F4F6",
  } as CSSProperties,
  gradientCard: (bg: string) =>
    ({
      background: bg,
      borderRadius: 12,
      padding: "20px 24px",
      position: "relative" as const,
      overflow: "hidden" as const,
      color: "white",
    }) as CSSProperties,
  tab: (active: boolean) =>
    ({
      position: "relative" as const,
      color: active ? "#fff" : "rgba(255,255,255,0.7)",
      padding: "12px 20px",
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      letterSpacing: "0.01em",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      borderBottom: active ? "3px solid white" : "3px solid transparent",
    }) as CSSProperties,
  badge: (bg: string, color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      background: bg,
      color,
    }) as CSSProperties,
  progressTrack: {
    background: "#E5E7EB",
    borderRadius: 9999,
    height: 8,
    overflow: "hidden" as const,
  } as CSSProperties,
  progressFill: (width: number, bg: string) =>
    ({
      height: "100%",
      borderRadius: 9999,
      width: `${width}%`,
      background: bg,
      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
    }) as CSSProperties,
  input: {
    width: "100%",
    borderRadius: 6,
    border: "1px solid #D1D5DB",
    padding: "8px 12px",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s",
  } as CSSProperties,
};

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

const STATUS_CFG: Record<ProjectStatus, { bg: string; text: string; dotColor: string }> = {
  won: { bg: "#E3F5E1", text: "#2E844A", dotColor: "#2E844A" },
  lost: { bg: "#FDE8E8", text: "#C23934", dotColor: "#C23934" },
  pending: { bg: "#FFF3E0", text: "#E87600", dotColor: "#E87600" },
};

// ── tab types ───────────────────────────────────────────────
type Tab = "dashboard" | "projects" | "forecast" | "add";
type ProjectFilter = "all" | "won" | "won_not_invoiced";

// ── icons ───────────────────────────────────────────────────
function IconTrendUp() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l6-6 4 4 8-8m0 0h-6m6 0v6" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 8v2" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── reusable small components ────────────────────────────────
function VendorDot({ vendor }: { vendor: VendorType }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: VENDOR_COLORS[vendor],
        marginRight: 6,
      }}
    />
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span style={S.badge(cfg.bg, cfg.text)}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dotColor, marginRight: 6 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: checked ? "2px solid #0176D3" : "2px solid #D1D5DB",
        background: checked ? "#0176D3" : "white",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {checked && <IconCheck />}
    </button>
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
      <div style={{ ...S.pageBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #0176D3", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14, color: "#6B7280", fontWeight: 500 }}>Loading…</span>
        </div>
      </div>
    );
  }

  const targetProgress =
    target && target.targetRevenue > 0
      ? Math.min((totalRevenue / target.targetRevenue) * 100, 100)
      : 0;

  return (
    <div style={S.pageBg}>
      {/* ── HEADER ─────────────────────────────────────── */}
      <header style={S.header}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                  <IconChart />
                </div>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 600 }}>
                  SoftwiseAI
                </span>
              </Link>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>/</span>
              <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
                Finance & Redress Tracker
              </span>
            </div>
            <button
              onClick={() => { setEditingId(null); setTab("add"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.15)", color: "white",
                fontSize: 12, fontWeight: 600, padding: "8px 16px",
                borderRadius: 6, border: "none", cursor: "pointer",
              }}
            >
              <IconPlus /> New Project
            </button>
          </div>
          {/* Tabs */}
          <nav style={{ display: "flex", gap: 2 }}>
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
                onClick={() => { if (key !== "add") setEditingId(null); setTab(key); }}
                style={S.tab(tab === key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── CONTENT ────────────────────────────────────── */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px" }}>
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
            existing={editingId ? projects.find((p) => p.id === editingId) ?? null : null}
            onSave={handleSaveProject}
            onCancel={() => { setEditingId(null); setTab("projects"); }}
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

  const labelStyle: CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── TARGET ─────────────────────────── */}
      <div style={{ ...S.card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0176D3" }}>
              <IconChart />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#181818", margin: 0 }}>
                {currentYear} Revenue Target
              </h2>
              {target && (
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                  {fmt(Math.max(target.targetRevenue - totalRevenue, 0))} remaining
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowTargetForm(!showTargetForm)}
            style={{ fontSize: 12, fontWeight: 600, color: "#0176D3", background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 6 }}
          >
            {target ? "Edit" : "Set Target"}
          </button>
        </div>

        {showTargetForm && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 250 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 14 }}>$</span>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="500,000"
                style={{ ...S.input, paddingLeft: 28 }}
              />
            </div>
            <button
              onClick={() => {
                const val = parseFloat(targetInput);
                if (val > 0) { onSetTarget({ year: currentYear, targetRevenue: val }); setShowTargetForm(false); }
              }}
              style={{ background: "#0176D3", color: "white", fontSize: 14, fontWeight: 600, padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        )}

        {target ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span>
                <strong style={{ color: "#181818" }}>{fmt(totalRevenue)}</strong>
                <span style={{ color: "#6B7280" }}> of {fmt(target.targetRevenue)}</span>
              </span>
              <span style={{
                fontWeight: 700,
                color: targetProgress >= 100 ? "#2E844A" : targetProgress >= 60 ? "#0176D3" : "#E87600",
              }}>
                {targetProgress.toFixed(1)}%
              </span>
            </div>
            <div style={S.progressTrack}>
              <div style={S.progressFill(
                targetProgress,
                targetProgress >= 100
                  ? "linear-gradient(90deg, #2E844A, #45C65A)"
                  : targetProgress >= 60
                    ? "linear-gradient(90deg, #0176D3, #1B96FF)"
                    : "linear-gradient(90deg, #E87600, #FE9339)"
              )} />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>Set a revenue target to track your progress.</p>
        )}
      </div>

      {/* ── KPI CARDS ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {/* Revenue Won */}
        <div style={S.kpi("#2E844A")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={labelStyle}>Revenue Won</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E3F5E1", display: "flex", alignItems: "center", justifyContent: "center", color: "#2E844A" }}>
              <IconDollar />
            </div>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#181818", letterSpacing: "-0.02em", margin: 0 }}>
            {fmt(totalRevenue)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, color: "#2E844A" }}>
            <IconTrendUp />
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              {wonCount} project{wonCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Total Costs */}
        <div style={S.kpi("#C23934")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={labelStyle}>Total Costs</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FDE8E8", display: "flex", alignItems: "center", justifyContent: "center", color: "#C23934" }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2 6.75H5.625c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#181818", letterSpacing: "-0.02em", margin: 0 }}>
            {fmt(totalCosts)}
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 6, margin: 0 }}>
            Across {projectCount} project{projectCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Net Profit */}
        <div style={S.kpi("#0176D3")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={labelStyle}>Net Profit</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0176D3" }}>
              <IconChart />
            </div>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: totalProfit >= 0 ? "#181818" : "#C23934", letterSpacing: "-0.02em", margin: 0 }}>
            {fmt(totalProfit)}
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 6, margin: 0 }}>
            {totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin` : "No revenue yet"}
          </p>
        </div>

        {/* Won Not Invoiced */}
        <div style={S.kpi("#E87600")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={labelStyle}>Won Not Invoiced</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", color: "#E87600" }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#181818", letterSpacing: "-0.02em", margin: 0 }}>
            {fmt(wonNotInvoicedRevenue)}
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 6, margin: 0 }}>
            {wonNotInvoicedCount} project{wonNotInvoicedCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── EMPTY STATE ────────────────────── */}
      {projectCount === 0 && (
        <div style={{ ...S.card, padding: 48, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#0176D3" }}>
            <IconChart />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6B7280", margin: 0 }}>
            Add your first project to see charts and analytics.
          </p>
        </div>
      )}

      {/* ── CHARTS ─────────────────────────── */}
      {revenueByVendor.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
          <div style={S.chartCard}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: "0 0 2px" }}>Revenue by Vendor</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 16px" }}>Won projects only</p>
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

          <div style={S.chartCard}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: "0 0 2px" }}>Project Status</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 16px" }}>All projects</p>
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
        <div style={S.chartCard}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: "0 0 2px" }}>Revenue vs Costs</h3>
          <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 16px" }}>Per project comparison</p>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Gradient KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={S.gradientCard("linear-gradient(135deg, #032D60, #0176D3)")}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8, margin: "0 0 8px" }}>
            Open Pipeline
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{fmt(openPipeline)}</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>
            {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <div style={S.gradientCard("linear-gradient(135deg, #1B5E20, #2E844A)")}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8, margin: "0 0 8px" }}>
            Weighted Pipeline
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{fmt(weightedPipeline)}</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>Probability-adjusted</p>
        </div>
        <div style={S.gradientCard("linear-gradient(135deg, #4A148C, #7526C4)")}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8, margin: "0 0 8px" }}>
            Forecasted Amount
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{fmt(forecastedAmount)}</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>
            {forecastedOpps.length} deal{forecastedOpps.length !== 1 ? "s" : ""} in forecast
          </p>
        </div>
        <div style={S.gradientCard("linear-gradient(135deg, #BF360C, #E87600)")}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8, margin: "0 0 8px" }}>
            Weighted Forecast
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{fmt(weightedForecast)}</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>Forecast x probability</p>
        </div>
      </div>

      {/* Charts */}
      {opportunities.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
          <div style={S.chartCard}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: "0 0 2px" }}>Pipeline by Probability</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 16px" }}>Revenue grouped by win likelihood</p>
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

          <div style={S.chartCard}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: "0 0 2px" }}>Pipeline by Vendor</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 16px" }}>Open opportunities breakdown</p>
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
      <div style={{ ...S.card, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#181818", margin: 0 }}>Active Opportunities</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Tick &quot;Forecast&quot; to include in your committed forecast</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>
            {opportunities.length} record{opportunities.length !== 1 ? "s" : ""}
          </span>
        </div>
        {opportunities.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              No pending opportunities. Add a project with status &quot;Pending&quot; to see it here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 56, textAlign: "center" }}>Forecast</th>
                  <th style={S.th}>Client</th>
                  <th style={S.th}>Vendor</th>
                  <th style={S.th}>Type</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Revenue</th>
                  <th style={{ ...S.th, textAlign: "center" }}>Probability</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Weighted</th>
                  <th style={{ ...S.th, width: 64 }} />
                </tr>
              </thead>
              <tbody>
                {opportunities.map((p) => {
                  const weighted = p.revenue * ((p.probability ?? 0) / 100);
                  const prob = p.probability ?? 0;
                  return (
                    <tr key={p.id} style={{ transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget.style.background = "#F0F7FF")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Checkbox checked={!!p.inForecast} onChange={() => onToggleForecast(p.id)} />
                        </div>
                      </td>
                      <td style={{ ...S.td, fontWeight: 600, color: "#181818" }}>{p.clientName}</td>
                      <td style={S.td}><VendorDot vendor={p.vendorType} />{VENDOR_LABELS[p.vendorType]}</td>
                      <td style={{ ...S.td, color: "#6B7280" }}>{p.projectType || "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmt(p.revenue)}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                          <div style={{ width: 56, height: 6, background: "#E5E7EB", borderRadius: 9999, overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              borderRadius: 9999,
                              width: `${prob}%`,
                              background: prob >= 75 ? "#2E844A" : prob >= 50 ? "#0176D3" : prob >= 25 ? "#E87600" : "#C23934",
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", width: 28, textAlign: "right" }}>{prob}%</span>
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: "#6B7280" }}>{fmt(weighted)}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button onClick={() => onEdit(p.id)} style={{ color: "#0176D3", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
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

  const filterBtnStyle = (active: boolean): CSSProperties => ({
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: active ? "none" : "1px solid #E5E7EB",
    background: active ? "#0176D3" : "white",
    color: active ? "white" : "#6B7280",
    cursor: "pointer",
    transition: "all 0.15s",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {(
          [
            ["all", "All Projects"],
            ["won", "Won"],
            ["won_not_invoiced", "Won – Not Invoiced"],
          ] as [ProjectFilter, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => onFilterChange(key)} style={filterBtnStyle(filter === key)}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
          {projects.length} record{projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {projects.length === 0 ? (
        <div style={{ ...S.card, padding: 48, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>No projects match this filter.</p>
        </div>
      ) : (
        <div style={{ ...S.card, overflow: "hidden", padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>Client</th>
                  <th style={S.th}>Vendor</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Source</th>
                  <th style={S.th}>Status</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Revenue</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Costs</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Invoiced</th>
                  <th style={S.th}>Invoices</th>
                  <th style={{ ...S.th, width: 112 }} />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const costs = totalCosts(p);
                  const invoiced = totalInvoiced(p);
                  return (
                    <tr key={p.id} style={{ transition: "background 0.1s" }} onMouseEnter={e => (e.currentTarget.style.background = "#F0F7FF")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#181818" }}>{p.clientName}</td>
                      <td style={S.td}><VendorDot vendor={p.vendorType} />{VENDOR_LABELS[p.vendorType]}</td>
                      <td style={{ ...S.td, color: "#6B7280" }}>{p.projectType || "—"}</td>
                      <td style={{ ...S.td, color: "#6B7280" }}>
                        {p.leadSource ? LEAD_SOURCE_LABELS[p.leadSource] ?? p.leadSource : "—"}
                      </td>
                      <td style={S.td}><StatusBadge status={p.status} /></td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmt(p.revenue)}</td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: "#C23934" }}>
                        {costs > 0 ? fmt(costs) : "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>{invoiced > 0 ? fmt(invoiced) : "—"}</td>
                      <td style={S.td}>
                        {(() => {
                          const due = getDueInvoices(p);
                          return p.invoices.length > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span title={p.invoices.map((i) => `${i.date} (${i.status}) Net ${i.netDays ?? 30}`).join(", ")}>
                                {p.invoices.length}
                              </span>
                              {due.length > 0 && (
                                <span style={S.badge("#FDE8E8", "#C23934")}>
                                  {due.length} due
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#D1D5DB" }}>—</span>
                          );
                        })()}
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => onEdit(p.id)} style={{ color: "#0176D3", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                              Edit
                            </button>
                            {confirmDelete === p.id ? (
                              <button onClick={() => { onDelete(p.id); setConfirmDelete(null); }} style={{ color: "#C23934", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                                Confirm?
                              </button>
                            ) : (
                              <button onClick={() => setConfirmDelete(p.id)} style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                                Del
                              </button>
                            )}
                          </div>
                          {getDueInvoices(p).map((inv) => {
                            const key = `${p.id}-${inv.id}`;
                            return (
                              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button
                                  onClick={() => handleSendReminder(p, inv)}
                                  disabled={sendingReminder === key}
                                  style={{
                                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                    background: "#FDE8E8", color: "#C23934", border: "none",
                                    cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                                    opacity: sendingReminder === key ? 0.5 : 1,
                                  }}
                                >
                                  {sendingReminder === key ? "Sending…" : `Remind ${inv.date}`}
                                </button>
                                {reminderResult?.id === key && (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: reminderResult.success ? "#2E844A" : "#C23934" }}>
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

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ ...S.card, padding: 24, maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0176D3" }}>
          <IconPlus />
        </div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#181818", margin: 0 }}>
          {existing ? "Edit Project" : "New Project"}
        </h2>
      </div>

      {/* Row: Client + Vendor */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Client Name</label>
          <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} style={S.input} placeholder="Acme Corp" />
        </div>
        <div>
          <label style={labelStyle}>Vendor</label>
          <select value={vendorType} onChange={(e) => setVendorType(e.target.value as VendorType)} style={S.input}>
            {Object.entries(VENDOR_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Row: Project Type + Lead Source */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Project Type</label>
          <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={S.input}>
            <option value="">Select type…</option>
            {VENDOR_PROJECT_TYPES[vendorType].map((pt) => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Lead Source</label>
          <select value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)} style={S.input}>
            {Object.entries(LEAD_SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Row: Revenue + Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Revenue ($)</label>
          <input type="number" required min="0" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} style={S.input} placeholder="100,000" />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} style={S.input}>
            <option value="won">Won</option>
            <option value="pending">Pending</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Row: Probability + Forecast */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Probability (%)</label>
          <input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} style={S.input} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <Checkbox checked={inForecast} onChange={() => setInForecast(!inForecast)} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>Include in Forecast</span>
          </label>
        </div>
      </div>

      {/* Costs */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={labelStyle}>Known Costs</label>
          <button
            type="button"
            onClick={() => setCosts([...costs, { id: uid(), description: "", amount: 0 }])}
            style={{ fontSize: 12, fontWeight: 600, color: "#0176D3", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 4 }}
          >
            + Add Cost
          </button>
        </div>
        {costs.length === 0 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>No costs added.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {costs.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Description"
                value={c.description}
                onChange={(e) => setCosts(costs.map((x) => x.id === c.id ? { ...x, description: e.target.value } : x))}
                style={{ ...S.input, flex: 1 }}
              />
              <div style={{ position: "relative", width: 128 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 12 }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={c.amount || ""}
                  onChange={(e) => setCosts(costs.map((x) => x.id === c.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                  style={{ ...S.input, paddingLeft: 24 }}
                />
              </div>
              <button type="button" onClick={() => setCosts(costs.filter((x) => x.id !== c.id))} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <IconX />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Number of Invoices</label>
          <input type="number" min="0" max="50" value={invoiceCount} onChange={(e) => setInvoiceCount(e.target.value)} style={{ ...S.input, width: 96 }} />
        </div>
        {invoices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoices.map((inv, idx) => (
              <div key={inv.id} style={{
                display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
                background: "#FAFBFC", borderRadius: 8, padding: 12,
                border: "1px solid #F3F4F6",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", width: 64 }}>
                  Inv {idx + 1}
                </span>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Date</label>
                  <input
                    type="date"
                    value={inv.date}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, date: e.target.value } : x))}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inv.amount || ""}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                    style={{ ...S.input, width: 112 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Net Days</label>
                  <select
                    value={inv.netDays ?? 30}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, netDays: parseInt(e.target.value) as NetDays } : x))}
                    style={{ ...S.input, width: 96 }}
                  >
                    {NET_DAYS_OPTIONS.map((d) => <option key={d} value={d}>Net {d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Status</label>
                  <select
                    value={inv.status}
                    onChange={(e) => setInvoices(invoices.map((x) => x.id === inv.id ? { ...x, status: e.target.value as Invoice["status"] } : x))}
                    style={{ ...S.input, width: 112 }}
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
      <div style={{ display: "flex", gap: 12, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
        <button
          type="submit"
          style={{
            background: "#0176D3", color: "white", fontSize: 14, fontWeight: 600,
            padding: "10px 24px", borderRadius: 6, border: "none", cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        >
          {existing ? "Update Project" : "Save Project"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "white", color: "#374151", fontSize: 14, fontWeight: 600,
            padding: "10px 24px", borderRadius: 6, border: "1px solid #D1D5DB",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
