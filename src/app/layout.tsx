import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoftwiseAI - Software Contract Benchmarking & Redress Compliance",
  description:
    "AI-powered benchmarking tool for software contracts. Compare vendor pricing, get industry insights, and negotiate better deals with Gartner-style reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
