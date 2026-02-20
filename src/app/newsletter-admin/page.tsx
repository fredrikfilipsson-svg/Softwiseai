"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  company?: string;
  source: "landing_page" | "manual";
  subscribedAt: string;
}

export default function NewsletterAdminPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "error">("idle");
  const [addError, setAddError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter");
      const data = await res.json();
      setSubscribers(data.subscribers || []);
    } catch {
      console.error("Failed to fetch subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus("loading");
    setAddError("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, source: "manual" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddStatus("error");
        setAddError(data.error || "Failed to add subscriber.");
        return;
      }

      setName("");
      setEmail("");
      setCompany("");
      setShowAddForm(false);
      setAddStatus("idle");
      fetchSubscribers();
    } catch {
      setAddStatus("error");
      setAddError("Network error.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this subscriber?")) return;

    try {
      const res = await fetch(`/api/newsletter?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      console.error("Failed to delete subscriber");
    }
  }

  const filtered = subscribers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.company && s.company.toLowerCase().includes(q))
    );
  });

  async function handleExportCsv() {
    const headers = ["Name", "Email", "Company", "Source", "Subscribed At"];
    const rows = subscribers.map((s) => [
      s.name,
      s.email,
      s.company || "",
      s.source,
      new Date(s.subscribedAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-brand-700">Redress Compliance</span>
              </Link>
              <span className="hidden sm:inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-medium text-brand-600 uppercase tracking-wider">
                Newsletter Admin
              </span>
            </div>
            <Link href="/newsletter" className="btn-secondary text-sm">
              View Signup Page
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Stats bar */}
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="card">
              <div className="text-sm text-gray-500">Total Subscribers</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{subscribers.length}</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">From Landing Page</div>
              <div className="mt-1 text-2xl font-bold text-brand-500">
                {subscribers.filter((s) => s.source === "landing_page").length}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Added Manually</div>
              <div className="mt-1 text-2xl font-bold text-gray-700">
                {subscribers.filter((s) => s.source === "manual").length}
              </div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full sm:w-80"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleExportCsv} disabled={subscribers.length === 0} className="btn-secondary text-sm">
                Export CSV
              </button>
              <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm">
                {showAddForm ? "Cancel" : "Add Subscriber"}
              </button>
            </div>
          </div>

          {/* Add subscriber form */}
          {showAddForm && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Subscriber Manually</h3>
              <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="input-field"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={addStatus === "loading"} className="btn-primary w-full text-sm">
                    {addStatus === "loading" ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
              {addStatus === "error" && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                  {addError}
                </div>
              )}
            </div>
          )}

          {/* Subscribers table */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading subscribers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  {searchQuery ? "No subscribers match your search." : "No subscribers yet. Add one or share the signup page."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Company</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Source</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Date</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{sub.name}</td>
                        <td className="px-6 py-4 text-gray-600">{sub.email}</td>
                        <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{sub.company || "—"}</td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              sub.source === "landing_page"
                                ? "bg-green-50 text-green-700"
                                : "bg-brand-50 text-brand-700"
                            }`}
                          >
                            {sub.source === "landing_page" ? "Signup Page" : "Manual"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
