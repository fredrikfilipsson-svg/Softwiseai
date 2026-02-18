"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface VendorData {
  id: string;
  vendor: string;
  pricingGuidelines: string;
  typicalDiscounts: string;
  contractTerms: string;
  negotiationTips: string;
  complianceNotes: string;
  benchmarkData: string;
  updatedAt: string;
  updatedBy: string;
}

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  requestedAt: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"vendors" | "access" | "contracts">("vendors");
  const [vendorData, setVendorData] = useState<VendorData[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorRes, accessRes] = await Promise.all([
        fetch(`/api/admin/vendor-data?adminKey=${adminKey}`),
        fetch(`/api/approve-access?adminKey=${adminKey}`),
      ]);
      const vendorJson = await vendorRes.json();
      const accessJson = await accessRes.json();
      if (vendorJson.data) setVendorData(vendorJson.data);
      if (accessJson.requests) setAccessRequests(accessJson.requests);
      setAuthenticated(true);
    } catch {
      setMessage("Failed to load data. Check your admin key.");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadData();
  };

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, loadData]);

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor?.vendor) return;

    try {
      const res = await fetch(`/api/admin/vendor-data?adminKey=${adminKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ ...editingVendor, updatedBy: "admin" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Saved vendor data for ${editingVendor.vendor}`);
        setEditingVendor(null);
        await loadData();
      } else {
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setMessage("Failed to save vendor data.");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/approve-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adminKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        await loadData();
      }
    } catch {
      setMessage("Failed to approve.");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const res = await fetch(
        `/api/admin/vendor-data?id=${id}&adminKey=${adminKey}`,
        { method: "DELETE", headers: { "x-admin-key": adminKey } }
      );
      if (res.ok) {
        setMessage("Vendor data deleted.");
        await loadData();
      }
    } catch {
      setMessage("Failed to delete.");
    }
  };

  if (!authenticated) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center py-24">
          <form onSubmit={handleLogin} className="card w-full max-w-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Admin Dashboard
            </h1>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="input-field mb-4"
              placeholder="Enter admin key..."
              required
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
              Authenticated
            </span>
          </div>

          {message && (
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
              {message}
              <button onClick={() => setMessage("")} className="ml-2 font-medium underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-6 w-fit">
            {(["vendors", "access", "contracts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "vendors"
                  ? "Vendor Data"
                  : tab === "access"
                    ? `Access Requests (${accessRequests.filter((r) => r.status === "pending").length})`
                    : "Contracts"}
              </button>
            ))}
          </div>

          {/* Vendor Data Tab */}
          {activeTab === "vendors" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Vendor Guidelines & Benchmark Data
                </h2>
                <button
                  onClick={() =>
                    setEditingVendor({
                      vendor: "",
                      pricingGuidelines: "",
                      typicalDiscounts: "",
                      contractTerms: "",
                      negotiationTips: "",
                      complianceNotes: "",
                      benchmarkData: "",
                    })
                  }
                  className="btn-primary text-sm"
                >
                  + Add Vendor Data
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Data entered here overrides AI-generated insights. The AI will use
                your guidelines as the authoritative source when creating reports.
              </p>

              {/* Vendor list */}
              {vendorData.length === 0 && !editingVendor && (
                <div className="card text-center py-12 text-gray-400">
                  No vendor data configured yet. Click &quot;Add Vendor Data&quot; to get started.
                </div>
              )}

              <div className="space-y-3">
                {vendorData.map((v) => (
                  <div key={v.id} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {v.vendor}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last updated:{" "}
                          {new Date(v.updatedAt).toLocaleDateString()} by{" "}
                          {v.updatedBy}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingVendor(v)}
                          className="text-xs text-brand-500 hover:text-brand-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-gray-600">
                      {v.pricingGuidelines && (
                        <div>
                          <span className="font-semibold text-gray-700">Pricing:</span>{" "}
                          {v.pricingGuidelines.slice(0, 100)}...
                        </div>
                      )}
                      {v.typicalDiscounts && (
                        <div>
                          <span className="font-semibold text-gray-700">Discounts:</span>{" "}
                          {v.typicalDiscounts.slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit/Add form */}
              {editingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                  <form
                    onSubmit={handleSaveVendor}
                    className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {editingVendor.id ? "Edit" : "Add"} Vendor Data
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vendor Name
                        </label>
                        <input
                          type="text"
                          value={editingVendor.vendor || ""}
                          onChange={(e) =>
                            setEditingVendor({ ...editingVendor, vendor: e.target.value })
                          }
                          className="input-field"
                          required
                        />
                      </div>

                      {(
                        [
                          ["pricingGuidelines", "Pricing Guidelines", "Enter verified pricing tiers, per-user costs, volume discounts..."],
                          ["typicalDiscounts", "Typical Discounts", "Enter known discount ranges, end-of-quarter deals, multi-year incentives..."],
                          ["contractTerms", "Contract Terms to Watch", "Enter key clauses, auto-renewal terms, price escalation caps..."],
                          ["negotiationTips", "Negotiation Tips", "Enter proven negotiation strategies, timing advice, escalation paths..."],
                          ["complianceNotes", "Compliance & Redress Notes", "Enter compliance requirements, data residency, audit rights..."],
                          ["benchmarkData", "Benchmark Data", "Enter verified pricing benchmarks, peer comparison data points..."],
                        ] as const
                      ).map(([field, label, placeholder]) => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label}
                          </label>
                          <textarea
                            value={(editingVendor[field] as string) || ""}
                            onChange={(e) =>
                              setEditingVendor({
                                ...editingVendor,
                                [field]: e.target.value,
                              })
                            }
                            rows={3}
                            className="input-field text-xs"
                            placeholder={placeholder}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingVendor(null)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Save Vendor Data
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Access Requests Tab */}
          {activeTab === "access" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Access Requests
              </h2>

              {accessRequests.length === 0 ? (
                <div className="card text-center py-12 text-gray-400">
                  No access requests yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {accessRequests.map((req) => (
                    <div key={req.id} className="card flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{req.name}</p>
                        <p className="text-sm text-gray-500">
                          {req.email} | {req.company}
                        </p>
                        <p className="text-xs text-gray-400">
                          Requested: {new Date(req.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            req.status === "approved"
                              ? "bg-green-50 text-green-700"
                              : req.status === "denied"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.status === "pending" && (
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contracts Tab */}
          {activeTab === "contracts" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Stored Contracts & Knowledge Base
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                All uploaded contracts are stored to build the benchmarking
                knowledge base. Data is used to improve future analyses.
              </p>
              <div className="card text-center py-12 text-gray-400">
                Contract data is stored in <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">.data/contracts.json</code> and
                benchmark knowledge in <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">.data/benchmark-knowledge.json</code>.
                <br />
                Each analysis enriches the knowledge base automatically.
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
