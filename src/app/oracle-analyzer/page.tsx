import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OracleAnalyzer from "@/components/OracleAnalyzer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oracle EBS License Analyzer - SoftwiseAI",
  description:
    "Analyze Oracle LMS collection output to determine which E-Business Suite licenses are required. Drag & drop your CSV files for instant analysis.",
};

export default function OracleAnalyzerPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50/30">
        <OracleAnalyzer />
      </main>
      <Footer />
    </>
  );
}
