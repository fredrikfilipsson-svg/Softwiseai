"use client";

import { useState, useRef } from "react";

interface StepContractProps {
  onSubmit: (contractText: string) => void;
  vendor: string;
  industry: string;
  onBack: () => void;
}

export default function StepContract({
  onSubmit,
  vendor,
  industry,
  onBack,
}: StepContractProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        setText(content);
        setMode("paste");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Industry Selection
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Contract Details
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload your {vendor} contract or describe the proposal for your{" "}
          {industry} organization. The more detail you provide, the better the
          benchmark.
        </p>
      </div>

      <div className="card">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-6">
          <button
            onClick={() => setMode("paste")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "paste"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Paste / Type
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Upload File
          </button>
        </div>

        {mode === "upload" ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Click to upload your contract
            </p>
            <p className="text-xs text-gray-400 mt-1">
              TXT, PDF, DOC, DOCX, CSV supported
            </p>
            {fileName && (
              <p className="mt-3 text-sm text-brand-600 font-medium">
                Loaded: {fileName}
              </p>
            )}
          </div>
        ) : null}

        <div className={mode === "upload" && !text ? "hidden" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contract text or proposal description
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="input-field resize-y font-mono text-xs"
            placeholder={`Paste your ${vendor} contract here or describe the proposal details...

Examples of what to include:
- License type and number of users/seats
- Annual or monthly pricing
- Contract duration and renewal terms
- Support level (basic, premium, enterprise)
- SLA commitments
- Data handling and privacy terms
- Any specific modules or products included
- Payment terms
- Auto-renewal clauses`}
          />
          <p className="mt-1.5 text-xs text-gray-400">
            {text.length > 0
              ? `${text.length.toLocaleString()} characters`
              : "Minimum 50 characters for meaningful analysis"}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSubmit(text)}
            disabled={text.length < 50}
            className="btn-primary"
          >
            Analyze & Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
