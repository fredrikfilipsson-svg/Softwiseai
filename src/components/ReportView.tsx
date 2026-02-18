"use client";

import { useState } from "react";
import { BenchmarkReport } from "@/lib/types";

interface ReportViewProps {
  report: BenchmarkReport;
  vendor: string;
  industry: string;
  email: string;
}

export default function ReportView({
  report,
  vendor,
  industry,
  email,
}: ReportViewProps) {
  const [downloadEmail, setDownloadEmail] = useState(email);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!downloadEmail) {
      setShowEmailGate(true);
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, vendor, industry, email: downloadEmail }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SoftwiseAI-Benchmark-${vendor.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Benchmarking Report
          </h1>
          <p className="text-sm text-gray-500">
            {vendor} | {industry} |{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => (downloadEmail ? handleDownload() : setShowEmailGate(true))}
          disabled={downloading}
          className="btn-primary"
        >
          {downloading ? (
            <>
              <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF Report
            </>
          )}
        </button>
      </div>

      {/* Email gate modal */}
      {showEmailGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Enter your email to download
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              We&apos;ll send the report to your email and start your download.
            </p>
            <input
              type="email"
              value={downloadEmail}
              onChange={(e) => setDownloadEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-field mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailGate(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEmailGate(false);
                  handleDownload();
                }}
                disabled={!downloadEmail}
                className="btn-primary flex-1"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      <div className="card mb-6 border-brand-200 bg-gradient-to-r from-brand-50 to-white">
        <h2 className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-2">
          Executive Summary
        </h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Vendor Analysis */}
        <div className="card">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Vendor Analysis
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">
                Overview
              </h3>
              <p className="text-sm text-gray-700">
                {report.vendorAnalysis.overview}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">
                Market Position
              </h3>
              <p className="text-sm text-gray-700">
                {report.vendorAnalysis.marketPosition}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">
                Pricing Model
              </h3>
              <p className="text-sm text-gray-700">
                {report.vendorAnalysis.pricingModel}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Benchmark */}
        <div className="card">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Pricing Benchmark
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Your Pricing</p>
              <p className="text-sm font-semibold text-gray-900">
                {report.pricingBenchmark.yourPricing}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Market Average</p>
              <p className="text-sm font-semibold text-blue-700">
                {report.pricingBenchmark.marketAverage}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">Best in Class</p>
              <p className="text-sm font-semibold text-green-700">
                {report.pricingBenchmark.bestInClass}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-gray-500 mb-0.5">
                Savings Opportunity
              </p>
              <p className="text-sm font-semibold text-red-700">
                {report.pricingBenchmark.savingsOpportunity}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Peer Comparison Table */}
      <div className="card mb-6 overflow-x-auto">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
          Peer Comparison (10 Organizations)
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-xs font-semibold text-gray-500">
                Organization
              </th>
              <th className="pb-2 text-xs font-semibold text-gray-500">
                Deal Size
              </th>
              <th className="pb-2 text-xs font-semibold text-gray-500">
                Discount
              </th>
              <th className="pb-2 text-xs font-semibold text-gray-500">
                Key Terms
              </th>
            </tr>
          </thead>
          <tbody>
            {(report.peerComparisons || []).map((peer, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="py-2 text-sm text-gray-900">{peer.company}</td>
                <td className="py-2 text-sm text-gray-600">{peer.dealSize}</td>
                <td className="py-2 text-sm font-medium text-green-600">
                  {peer.discount}
                </td>
                <td className="py-2 text-sm text-gray-600">{peer.keyTerms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Compliance Gaps */}
        <div className="card">
          <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-3">
            Compliance & Redress Gaps
          </h2>
          <ul className="space-y-2">
            {(report.complianceGaps || []).map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {gap}
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="card">
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3">
            Areas for Improvement
          </h2>
          <ul className="space-y-2">
            {(report.areasForImprovement || []).map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="card mb-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
          Risk Assessment
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.riskAssessment}
        </p>
      </div>

      {/* 7 Negotiation Steps */}
      <div className="card mb-6 border-brand-200">
        <h2 className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-4">
          7 Steps to Negotiate Better
        </h2>
        <div className="space-y-4">
          {(report.negotiationSteps || []).slice(0, 7).map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pt-0.5">
                {step.replace(/^Step\s*\d+:\s*/i, "")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conclusion */}
      <div className="card mb-6 bg-gray-50">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
          Conclusion
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.conclusion}
        </p>
      </div>

      {/* Download CTA */}
      <div className="rounded-2xl bg-brand-700 p-8 text-center">
        <h3 className="text-lg font-bold text-white mb-2">
          Download Your Full Report
        </h3>
        <p className="text-sm text-brand-200 mb-6">
          Get the complete 3-page Gartner-style PDF report for stakeholder
          presentations.
        </p>
        <button
          onClick={() => (downloadEmail ? handleDownload() : setShowEmailGate(true))}
          disabled={downloading}
          className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow-sm transition-all hover:bg-brand-50"
        >
          {downloading ? "Generating..." : "Download PDF Report"}
        </button>
      </div>
    </div>
  );
}
