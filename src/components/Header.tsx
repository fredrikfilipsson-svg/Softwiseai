"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-brand-700">
                SoftwiseAI
              </span>
              <span className="ml-1.5 hidden sm:inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 uppercase tracking-wider">
                Redress & Compliance
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/finance"
              className="text-sm font-medium text-gray-600 hover:text-brand-600 transition"
            >
              Finance Tracker
            </Link>
            <Link
              href="/benchmark"
              className="btn-primary text-sm"
            >
              Start Benchmark
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
