"use client";

import { useState } from "react";
import { VENDORS } from "@/lib/vendors";
import { VendorResearch } from "@/lib/types";

interface StepVendorProps {
  onSelect: (vendor: string, research: VendorResearch) => void;
  selectedIndustry: string;
}

export default function StepVendor({ onSelect }: StepVendorProps) {
  const [search, setSearch] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState("");
  const [error, setError] = useState("");

  const filtered = VENDORS.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const selectVendor = async (vendor: string) => {
    setLoading(true);
    setLoadingVendor(vendor);
    setError("");

    try {
      const res = await fetch("/api/vendor-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor, industry: "General" }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Research failed");
      onSelect(vendor, data.research);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to research vendor"
      );
    } finally {
      setLoading(false);
      setLoadingVendor("");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Select Your Software Vendor
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose the vendor you want to benchmark. Our AI will research their
          pricing strategies, common discounts, and negotiation leverage points.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          className="input-field"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {filtered.map((vendor) => (
          <button
            key={vendor}
            onClick={() => selectVendor(vendor)}
            disabled={loading}
            className={`card text-left transition-all hover:shadow-md hover:border-brand-300 ${
              loadingVendor === vendor ? "border-brand-500 bg-brand-50" : ""
            } ${loading && loadingVendor !== vendor ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">
                {vendor}
              </span>
              {loadingVendor === vendor ? (
                <div className="h-5 w-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              ) : (
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Custom vendor */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Vendor not listed? Enter a custom vendor:
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={customVendor}
            onChange={(e) => setCustomVendor(e.target.value)}
            placeholder="Enter vendor name..."
            className="input-field flex-1"
          />
          <button
            onClick={() => customVendor && selectVendor(customVendor)}
            disabled={!customVendor || loading}
            className="btn-primary whitespace-nowrap"
          >
            {loading && loadingVendor === customVendor
              ? "Researching..."
              : "Research Vendor"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 text-center text-sm text-gray-500">
          <span className="animate-pulse-slow">
            AI is researching {loadingVendor} as a vendor negotiation expert...
          </span>
        </div>
      )}
    </div>
  );
}
