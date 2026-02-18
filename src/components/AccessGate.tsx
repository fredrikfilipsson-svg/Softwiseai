"use client";

import { useState } from "react";

interface AccessGateProps {
  onAccessGranted: (email: string, name: string, company: string) => void;
}

export default function AccessGate({ onAccessGranted }: AccessGateProps) {
  const [mode, setMode] = useState<"signin" | "request">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.hasAccess) {
        onAccessGranted(email, data.name, data.company);
      } else if (data.status === "pending") {
        setMessage("Your access request is pending approval. Please check back later.");
        setMessageType("info");
      } else {
        setMessage("No account found. Please request access first.");
        setMessageType("error");
        setMode("request");
      }
    } catch {
      setMessage("Connection error. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error);
        setMessageType("error");
      } else if (data.status === "approved") {
        onAccessGranted(email, name, company);
      } else {
        setMessage(data.message);
        setMessageType("success");
      }
    } catch {
      setMessage("Connection error. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-12 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to SoftwiseAI
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in or request access to start benchmarking your software contracts
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-6">
          <button
            onClick={() => { setMode("signin"); setMessage(""); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("request"); setMessage(""); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "request"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Request Access
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              messageType === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : messageType === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {message}
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Business Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-field mb-4"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Checking..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestAccess} className="card">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Free email providers (Gmail, Hotmail, Yahoo) are not accepted
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corporation"
                  className="input-field"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
              {loading ? "Submitting..." : "Request Access"}
            </button>
            <p className="mt-3 text-xs text-gray-400 text-center">
              Your request will be reviewed by our team. Approval notifications are sent to your email.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
