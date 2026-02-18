"use client";

import { useState } from "react";
import { INDUSTRIES } from "@/lib/vendors";
import { VendorResearch } from "@/lib/types";

interface StepIndustryProps {
  onSelect: (industry: string) => void;
  vendor: string;
  vendorResearch: VendorResearch | null;
  onBack: () => void;
}

export default function StepIndustry({
  onSelect,
  vendor,
  vendorResearch,
  onBack,
}: StepIndustryProps) {
  const [customIndustry, setCustomIndustry] = useState("");

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Vendor Selection
      </button>

      {/* Vendor research insights */}
      {vendorResearch && (
        <div className="card mb-8 border-brand-200 bg-brand-50/50">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 flex-shrink-0">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-800">
                AI Vendor Intelligence: {vendor}
              </h3>
              <p className="text-xs text-brand-600 mt-0.5">
                {vendorResearch.overview}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold text-brand-700 mb-1.5 uppercase tracking-wider">
                Pricing Strategies
              </h4>
              <ul className="space-y-1">
                {vendorResearch.pricingStrategies.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-brand-500 mt-0.5 flex-shrink-0">&#8226;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-700 mb-1.5 uppercase tracking-wider">
                Common Discounts
              </h4>
              <ul className="space-y-1">
                {vendorResearch.commonDiscounts.map((d, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">&#8226;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-700 mb-1.5 uppercase tracking-wider">
                Negotiation Leverage
              </h4>
              <ul className="space-y-1">
                {vendorResearch.negotiationLeverage.map((l, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">&#8226;</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-700 mb-1.5 uppercase tracking-wider">
                Market Position
              </h4>
              <p className="text-xs text-gray-700">{vendorResearch.marketPosition}</p>
              <h4 className="text-xs font-semibold text-brand-700 mb-1.5 mt-3 uppercase tracking-wider">
                Recent Trends
              </h4>
              <p className="text-xs text-gray-700">{vendorResearch.recentTrends}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Select Your Industry
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose your industry so we can compare your {vendor} contract against
          relevant peers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => onSelect(ind)}
            className="card text-left transition-all hover:shadow-md hover:border-brand-300"
          >
            <span className="font-medium text-gray-900 text-sm">{ind}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Industry not listed?
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={customIndustry}
            onChange={(e) => setCustomIndustry(e.target.value)}
            placeholder="Enter your industry..."
            className="input-field flex-1"
          />
          <button
            onClick={() => customIndustry && onSelect(customIndustry)}
            disabled={!customIndustry}
            className="btn-primary whitespace-nowrap"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
