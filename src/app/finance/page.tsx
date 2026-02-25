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
  ProjectStatus,
  LeadSource,
  VENDOR_LABELS,
  VENDOR_PROJECT_TYPES,
  LEAD_SOURCE_LABELS,
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
  oracle: "#f43f5e",
  ibm: "#3b82f6",
  microsoft: "#06b6d4",
  workday: "#f59e0b",
  sap: "#10b981",
  salesforce: "#8b5cf6",
  broadcom: "#ec4899",
  other: "#6b7280",
};

const STATUS_BADGES: Record<ProjectStatus, string> = {
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
};

// ── tab types ───────────────────────────────────────────────
type Tab = "dashboard" | "projects" | "add";
type ProjectFilter = "all" | "won" | "won_not_invoiced";

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

  // load from localStorage on mount
  useEffect(() => {
    setProjects(getProjects());
    setTarget(getYearlyTarget());
    setLoaded(true);
  }, []);

  // persist whenever projects change
  const persist = useCallback(
    (next: FinanceProject[]) => {
      setProjects(next);
      saveProjects(next);
    },
    []
  );

  // ── derived data ────────────────────────────────────────
  const wonProjects = projects.filter((p) => p.status === "won");
  const wonNotInvoiced = wonProjects.filter((p) => {
    const invoicedAmt = totalInvoiced(p);
    return invoicedAmt < p.revenue;
  });

  const totalRevenue = wonProjects.reduce((s, p) => s + p.revenue, 0);
  const totalAllCosts = projects.reduce((s, p) => s + totalCosts(p), 0);
  const totalProfit = totalRevenue - totalAllCosts;
  const wonNotInvoicedRevenue = wonNotInvoiced.reduce(
    (s, p) => s + (p.revenue - totalInvoiced(p)),
    0
  );

  // chart data: revenue by vendor
  const revenueByVendor = Object.keys(VENDOR_LABELS).map((v) => {
    const vendorProjects = wonProjects.filter((p) => p.vendorType === v);
    return {
      vendor: VENDOR_LABELS[v as VendorType],
      revenue: vendorProjects.reduce((s, p) => s + p.revenue, 0),
      fill: VENDOR_COLORS[v as VendorType],
    };
  }).filter((d) => d.revenue > 0);

  // chart data: costs by project
  const costsByProject = projects
    .filter((p) => totalCosts(p) > 0)
    .map((p) => ({
      name: p.clientName.length > 15 ? p.clientName.slice(0, 15) + "…" : p.clientName,
      costs: totalCosts(p),
      revenue: p.revenue,
    }));

  // chart data: status breakdown
  const statusData = [
    { name: "Won", value: wonProjects.length, color: "#10b981" },
    {
      name: "Pending",
      value: projects.filter((p) => p.status === "pending").length,
      color: "#f59e0b",
    },
    {
      name: "Lost",
      value: projects.filter((p) => p.status === "lost").length,
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0);

  // filtered list for table
  const filteredProjects =
    filter === "all"
      ? projects
      : filter === "won"
        ? wonProjects
        : wonNotInvoiced;

  // ── handlers ────────────────────────────────────────────
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

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-lg">Loading…</div>
      </div>
    );
  }

  const targetProgress =
    target && target.targetRevenue > 0
      ? Math.min((totalRevenue / target.targetRevenue) * 100, 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-xl font-bold text-brand-700 hover:text-brand-600 transition"
          >
            SoftwiseAI
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">
            Finance &amp; Redress Tracker
          </h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {(
            [
              ["dashboard", "Dashboard"],
              ["projects", "Projects"],
              ["add", editingId ? "Edit Project" : "Add Project"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                if (key !== "add") setEditingId(null);
                setTab(key);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    <div className="space-y-8">
      {/* Yearly Target */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {currentYear} Revenue Target
          </h2>
          <button
            onClick={() => setShowTargetForm(!showTargetForm)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {target ? "Edit Target" : "Set Target"}
          </button>
        </div>

        {showTargetForm && (
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="e.g. 500000"
                className="input-field pl-7 w-full"
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
              className="btn-primary px-6"
            >
              Save
            </button>
          </div>
        )}

        {target ? (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {fmt(totalRevenue)} of {fmt(target.targetRevenue)}
              </span>
              <span className="font-semibold">
                {targetProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${targetProgress}%`,
                  background:
                    targetProgress >= 100
                      ? "#10b981"
                      : targetProgress >= 60
                        ? "#3b82f6"
                        : "#f59e0b",
                }}
              />
            </div>
            {target.targetRevenue - totalRevenue > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {fmt(target.targetRevenue - totalRevenue)} remaining to target
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            No target set yet. Click &quot;Set Target&quot; above.
          </p>
        )}
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue (Won)"
          value={fmt(totalRevenue)}
          sub={`${wonCount} project${wonCount !== 1 ? "s" : ""}`}
          color="text-emerald-600"
        />
        <KpiCard
          label="Total Costs"
          value={fmt(totalCosts)}
          sub={`Across ${projectCount} project${projectCount !== 1 ? "s" : ""}`}
          color="text-red-500"
        />
        <KpiCard
          label="Net Profit"
          value={fmt(totalProfit)}
          sub={
            totalRevenue > 0
              ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin`
              : "—"
          }
          color={totalProfit >= 0 ? "text-blue-600" : "text-red-600"}
        />
        <KpiCard
          label="Won – Not Invoiced"
          value={fmt(wonNotInvoicedRevenue)}
          sub={`${wonNotInvoicedCount} project${wonNotInvoicedCount !== 1 ? "s" : ""}`}
          color="text-amber-600"
        />
      </div>

      {/* Charts */}
      {projectCount === 0 && (
        <p className="text-center text-gray-400 py-12">
          Add your first project to see charts and analytics.
        </p>
      )}

      {revenueByVendor.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Vendor */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Revenue by Vendor
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByVendor}>
                <XAxis dataKey="vendor" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    `$${(v / 1000).toFixed(0)}k`
                  }
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v) => fmt(Number(v ?? 0))}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueByVendor.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Status Breakdown */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Project Status
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, value }) =>
                    `${name ?? ""} (${value ?? 0})`
                  }
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}

      {costsByProject.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Revenue vs Costs per Project
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsByProject}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) =>
                  `$${(v / 1000).toFixed(0)}k`
                }
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(v) => fmt(Number(v ?? 0))}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="costs"
                name="Costs"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-400 mt-1">{sub}</p>
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
        message: result.success
          ? "Reminder sent!"
          : result.error ?? "Failed to send",
      });
    } catch {
      setReminderResult({
        id: key,
        success: false,
        message: "Network error",
      });
    }
    setSendingReminder(null);
    setTimeout(() => setReminderResult(null), 4000);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              filter === key
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No projects match this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Project Type</th>
                  <th className="px-4 py-3">Lead Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Costs</th>
                  <th className="px-4 py-3 text-right">Invoiced</th>
                  <th className="px-4 py-3">Invoices</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => {
                  const costs = totalCosts(p);
                  const invoiced = totalInvoiced(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {p.clientName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                          style={{
                            backgroundColor: VENDOR_COLORS[p.vendorType],
                          }}
                        />
                        {VENDOR_LABELS[p.vendorType]}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.projectType || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.leadSource
                          ? LEAD_SOURCE_LABELS[p.leadSource] ?? p.leadSource
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[p.status]}`}
                        >
                          {p.status.charAt(0).toUpperCase() +
                            p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {fmt(p.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">
                        {costs > 0 ? fmt(costs) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {invoiced > 0 ? fmt(invoiced) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {(() => {
                          const due = getDueInvoices(p);
                          return p.invoices.length > 0 ? (
                            <div>
                              <span title={p.invoices.map((i) => `${i.date} (${i.status})`).join(", ")}>
                                {p.invoices.length} invoice
                                {p.invoices.length !== 1 ? "s" : ""}
                              </span>
                              {due.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                                  {due.length} due
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEdit(p.id)}
                              className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                            >
                              Edit
                            </button>
                            {confirmDelete === p.id ? (
                              <button
                                onClick={() => {
                                  onDelete(p.id);
                                  setConfirmDelete(null);
                                }}
                                className="text-red-600 hover:text-red-700 text-xs font-medium"
                              >
                                Confirm?
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(p.id)}
                                className="text-gray-400 hover:text-red-500 text-xs font-medium"
                              >
                                Delete
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
                                  className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50 transition whitespace-nowrap"
                                >
                                  {sendingReminder === key
                                    ? "Sending…"
                                    : `Remind ${inv.date}`}
                                </button>
                                {reminderResult?.id === key && (
                                  <span
                                    className={`text-[10px] font-medium ${
                                      reminderResult.success
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
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
  const [vendorType, setVendorType] = useState<VendorType>(
    existing?.vendorType ?? "microsoft"
  );
  const [projectType, setProjectType] = useState(existing?.projectType ?? "");
  const [leadSource, setLeadSource] = useState<LeadSource>(
    existing?.leadSource ?? "web"
  );
  const [revenue, setRevenue] = useState(existing?.revenue?.toString() ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    existing?.status ?? "won"
  );
  const [costs, setCosts] = useState<Cost[]>(
    existing?.costs ?? []
  );
  const [invoiceCount, setInvoiceCount] = useState(
    existing?.invoiceCount?.toString() ?? "1"
  );
  const [invoices, setInvoices] = useState<Invoice[]>(
    existing?.invoices ?? []
  );

  // reset project type when vendor changes (unless editing existing)
  useEffect(() => {
    if (!existing) {
      setProjectType("");
    } else if (!VENDOR_PROJECT_TYPES[vendorType].includes(projectType)) {
      setProjectType("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorType]);

  // sync invoice slots when count changes
  useEffect(() => {
    const count = parseInt(invoiceCount) || 0;
    setInvoices((prev) => {
      if (count > prev.length) {
        const newSlots: Invoice[] = [];
        for (let i = prev.length; i < count; i++) {
          newSlots.push({
            id: uid(),
            date: "",
            amount: 0,
            status: "pending",
          });
        }
        return [...prev, ...newSlots];
      }
      return prev.slice(0, count);
    });
  }, [invoiceCount]);

  function handleAddCost() {
    setCosts([...costs, { id: uid(), description: "", amount: 0 }]);
  }

  function handleRemoveCost(id: string) {
    setCosts(costs.filter((c) => c.id !== id));
  }

  function handleCostChange(
    id: string,
    field: "description" | "amount",
    value: string
  ) {
    setCosts(
      costs.map((c) =>
        c.id === id
          ? {
              ...c,
              [field]: field === "amount" ? parseFloat(value) || 0 : value,
            }
          : c
      )
    );
  }

  function handleInvoiceChange(
    id: string,
    field: "date" | "amount" | "status",
    value: string
  ) {
    setInvoices(
      invoices.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              [field]:
                field === "amount" ? parseFloat(value) || 0 : value,
            }
          : inv
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !revenue) return;

    const project: FinanceProject = {
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
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    onSave(project);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 max-w-3xl"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        {existing ? "Edit Project" : "New Project"}
      </h2>

      {/* Client + Vendor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name
          </label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="input-field w-full"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Type
          </label>
          <select
            value={vendorType}
            onChange={(e) => setVendorType(e.target.value as VendorType)}
            className="input-field w-full"
          >
            {Object.entries(VENDOR_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Type + Lead Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Type
          </label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="input-field w-full"
          >
            <option value="">Select type…</option>
            {VENDOR_PROJECT_TYPES[vendorType].map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lead Source
          </label>
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value as LeadSource)}
            className="input-field w-full"
          >
            {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Revenue + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Revenue ($)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="input-field w-full"
            placeholder="100000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="input-field w-full"
          >
            <option value="won">Won</option>
            <option value="pending">Pending</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Costs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Known Costs
          </label>
          <button
            type="button"
            onClick={handleAddCost}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            + Add Cost
          </button>
        </div>
        {costs.length === 0 && (
          <p className="text-sm text-gray-400">No costs added yet.</p>
        )}
        <div className="space-y-2">
          {costs.map((c) => (
            <div key={c.id} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Description"
                value={c.description}
                onChange={(e) =>
                  handleCostChange(c.id, "description", e.target.value)
                }
                className="input-field flex-1"
              />
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={c.amount || ""}
                  onChange={(e) =>
                    handleCostChange(c.id, "amount", e.target.value)
                  }
                  className="input-field w-full pl-7"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCost(c.id)}
                className="text-gray-400 hover:text-red-500 p-1"
                title="Remove cost"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Invoices
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={invoiceCount}
            onChange={(e) => setInvoiceCount(e.target.value)}
            className="input-field w-28"
          />
        </div>

        {invoices.length > 0 && (
          <div className="space-y-3">
            {invoices.map((inv, idx) => (
              <div
                key={inv.id}
                className="flex flex-wrap gap-3 items-center bg-gray-50 rounded-lg p-3"
              >
                <span className="text-xs font-semibold text-gray-500 w-20">
                  Invoice {idx + 1}
                </span>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={inv.date}
                    onChange={(e) =>
                      handleInvoiceChange(inv.id, "date", e.target.value)
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inv.amount || ""}
                    onChange={(e) =>
                      handleInvoiceChange(inv.id, "amount", e.target.value)
                    }
                    className="input-field w-32 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Status
                  </label>
                  <select
                    value={inv.status}
                    onChange={(e) =>
                      handleInvoiceChange(inv.id, "status", e.target.value)
                    }
                    className="input-field text-sm"
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
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary px-8">
          {existing ? "Update Project" : "Save Project"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-6"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
