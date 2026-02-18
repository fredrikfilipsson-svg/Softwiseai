"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessGate from "@/components/AccessGate";
import StepVendor from "@/components/StepVendor";
import StepIndustry from "@/components/StepIndustry";
import StepContract from "@/components/StepContract";
import ReportView from "@/components/ReportView";
import { VendorResearch, BenchmarkReport } from "@/lib/types";

type Step = "access" | "vendor" | "industry" | "contract" | "analyzing" | "report";

export default function BenchmarkPage() {
  const [step, setStep] = useState<Step>("access");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userCompany, setUserCompany] = useState("");
  const [vendor, setVendor] = useState("");
  const [industry, setIndustry] = useState("");
  const [contractText, setContractText] = useState("");
  const [vendorResearch, setVendorResearch] = useState<VendorResearch | null>(null);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [error, setError] = useState("");

  const stepNumber =
    step === "access" ? 0 :
    step === "vendor" ? 1 :
    step === "industry" ? 2 :
    step === "contract" ? 3 :
    step === "analyzing" ? 4 : 5;

  const handleAccessGranted = (email: string, name: string, company: string) => {
    setUserEmail(email);
    setUserName(name);
    setUserCompany(company);
    setStep("vendor");
  };

  const handleVendorSelect = (selectedVendor: string, research: VendorResearch) => {
    setVendor(selectedVendor);
    setVendorResearch(research);
    setStep("industry");
  };

  const handleIndustrySelect = (selectedIndustry: string) => {
    setIndustry(selectedIndustry);
    setStep("contract");
  };

  const handleContractSubmit = async (text: string) => {
    setContractText(text);
    setStep("analyzing");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor,
          industry,
          contractText: text,
          email: userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data.report);
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setStep("contract");
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        {/* Progress bar */}
        {step !== "access" && (
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between mb-2">
                {["Vendor", "Industry", "Contract", "Report"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        i + 1 < stepNumber
                          ? "bg-green-500 text-white"
                          : i + 1 === stepNumber
                            ? "bg-brand-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {i + 1 < stepNumber ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        i + 1 <= stepNumber ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                    {i < 3 && (
                      <div className="hidden sm:block w-12 lg:w-20 h-px bg-gray-300 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button
                onClick={() => setError("")}
                className="ml-2 font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {step === "access" && (
            <AccessGate onAccessGranted={handleAccessGranted} />
          )}

          {step === "vendor" && (
            <StepVendor onSelect={handleVendorSelect} selectedIndustry={industry} />
          )}

          {step === "industry" && (
            <StepIndustry
              onSelect={handleIndustrySelect}
              vendor={vendor}
              vendorResearch={vendorResearch}
              onBack={() => setStep("vendor")}
            />
          )}

          {step === "contract" && (
            <StepContract
              onSubmit={handleContractSubmit}
              vendor={vendor}
              industry={industry}
              onBack={() => setStep("industry")}
            />
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Analyzing Your Contract
              </h2>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Our AI is comparing your {vendor} contract against industry
                benchmarks for {industry}. This includes peer comparisons,
                pricing analysis, and negotiation strategies.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-xs text-gray-400">
                <span className="animate-pulse-slow">Researching vendor pricing data...</span>
                <span className="animate-pulse-slow" style={{ animationDelay: "0.5s" }}>
                  Comparing with peer organizations...
                </span>
                <span className="animate-pulse-slow" style={{ animationDelay: "1s" }}>
                  Generating negotiation strategies...
                </span>
              </div>
            </div>
          )}

          {step === "report" && report && (
            <ReportView
              report={report}
              vendor={vendor}
              industry={industry}
              email={userEmail}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
