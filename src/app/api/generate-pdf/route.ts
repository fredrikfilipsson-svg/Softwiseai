import { NextRequest, NextResponse } from "next/server";
import { BenchmarkReport } from "@/lib/types";
import jsPDF from "jspdf";

export async function POST(req: NextRequest) {
  try {
    const { report, vendor, industry, email } = await req.json();

    if (!report || !vendor || !email) {
      return NextResponse.json(
        { error: "Report data and email are required." },
        { status: 400 }
      );
    }

    const pdf = generateReport(report as BenchmarkReport, vendor, industry);

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SoftwiseAI-Benchmark-${vendor.replace(/\s+/g, "-")}-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF." },
      { status: 500 }
    );
  }
}

function generateReport(
  report: BenchmarkReport,
  vendor: string,
  industry: string
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;

  const colors = {
    primary: [30, 64, 175] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    gray: [100, 116, 139] as [number, number, number],
    lightGray: [241, 245, 249] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    accent: [59, 130, 246] as [number, number, number],
    green: [22, 163, 74] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
  };

  function addHeader() {
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 45, pageWidth, 2, "F");

    doc.setTextColor(...colors.white);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SoftwiseAI", margin, 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("REDRESS & COMPLIANCE TOOL", margin, 24);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Software Contract Benchmarking Report", margin, 35);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${vendor} | ${industry} | ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      margin,
      41
    );

    return 55;
  }

  function addFooter(pageNum: number, totalPages: number) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...colors.gray);
    doc.setFontSize(7);
    doc.text("SoftwiseAI - Redress & Compliance Tool | Confidential", margin, pageHeight - 10);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" }
    );
  }

  function addSectionTitle(title: string, yPos: number): number {
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, 3, 7, "F");
    doc.setTextColor(...colors.dark);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 6, yPos + 6);
    return yPos + 14;
  }

  function addParagraph(text: string, yPos: number, fontSize = 9): number {
    doc.setTextColor(...colors.dark);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    return yPos + lines.length * (fontSize * 0.45) + 4;
  }

  function addBullet(text: string, yPos: number, indent = 0): number {
    doc.setTextColor(...colors.gray);
    doc.setFontSize(8);
    doc.text("\u2022", margin + indent, yPos);
    doc.setTextColor(...colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, contentWidth - 6 - indent);
    doc.text(lines, margin + 5 + indent, yPos);
    return yPos + lines.length * 4.2 + 1.5;
  }

  function checkPageBreak(yPos: number, needed: number): number {
    if (yPos + needed > pageHeight - 25) {
      doc.addPage();
      return 20;
    }
    return yPos;
  }

  // ======= PAGE 1: Executive Summary + Vendor Analysis + Peer Comparison =======
  y = addHeader();

  // Executive Summary
  y = addSectionTitle("Executive Summary", y);
  y = addParagraph(report.executiveSummary, y);
  y += 4;

  // Vendor Analysis
  y = addSectionTitle("Vendor Analysis", y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.dark);
  doc.text("Market Overview", margin, y);
  y += 5;
  y = addParagraph(report.vendorAnalysis.overview, y);

  doc.setFont("helvetica", "bold");
  doc.text("Market Position", margin, y);
  y += 5;
  y = addParagraph(report.vendorAnalysis.marketPosition, y);

  doc.setFont("helvetica", "bold");
  doc.text("Pricing Model", margin, y);
  y += 5;
  y = addParagraph(report.vendorAnalysis.pricingModel, y);
  y += 2;

  // Pricing Benchmark Box
  y = checkPageBreak(y, 40);
  y = addSectionTitle("Pricing Benchmark", y);
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, "F");
  const boxY = y + 6;
  const colW = contentWidth / 4;

  const benchItems = [
    { label: "Your Pricing", value: report.pricingBenchmark.yourPricing, color: colors.dark },
    { label: "Market Average", value: report.pricingBenchmark.marketAverage, color: colors.accent },
    { label: "Best in Class", value: report.pricingBenchmark.bestInClass, color: colors.green },
    { label: "Savings Opportunity", value: report.pricingBenchmark.savingsOpportunity, color: colors.red },
  ];

  benchItems.forEach((item, i) => {
    const x = margin + i * colW + 4;
    doc.setFontSize(7);
    doc.setTextColor(...colors.gray);
    doc.text(item.label.toUpperCase(), x, boxY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...item.color);
    const valLines = doc.splitTextToSize(item.value, colW - 8);
    doc.text(valLines, x, boxY + 6);
    doc.setFont("helvetica", "normal");
  });

  y += 42;

  // Peer Comparison Table
  y = checkPageBreak(y, 80);
  y = addSectionTitle("Peer Comparison (10 Organizations)", y);

  // Table header
  doc.setFillColor(...colors.primary);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(...colors.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const cols = [0, 45, 80, 108, 130];
  const headers = ["Organization", "Deal Size", "Discount", "Key Terms"];
  headers.forEach((h, i) => {
    doc.text(h, margin + cols[i] + 2, y + 5);
  });
  y += 7;

  // Table rows
  const peers = (report.peerComparisons || []).slice(0, 10);
  peers.forEach((peer, i) => {
    y = checkPageBreak(y, 8);
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 7, "F");
    }
    doc.setTextColor(...colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text((peer.company || "").slice(0, 28), margin + cols[0] + 2, y + 5);
    doc.text((peer.dealSize || "").slice(0, 18), margin + cols[1] + 2, y + 5);
    doc.setTextColor(...colors.green);
    doc.setFont("helvetica", "bold");
    doc.text((peer.discount || "").slice(0, 14), margin + cols[2] + 2, y + 5);
    doc.setTextColor(...colors.dark);
    doc.setFont("helvetica", "normal");
    doc.text((peer.keyTerms || "").slice(0, 40), margin + cols[3] + 2, y + 5);
    y += 7;
  });

  addFooter(1, 3);

  // ======= PAGE 2: Compliance + Areas for Improvement + Risk =======
  doc.addPage();
  y = 20;

  // Compliance header bar
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setTextColor(...colors.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    `SoftwiseAI Benchmarking Report | ${vendor} | ${industry}`,
    margin,
    8
  );
  y = 22;

  y = addSectionTitle("Compliance & Redress Gaps", y);
  (report.complianceGaps || []).forEach((gap) => {
    y = checkPageBreak(y, 8);
    y = addBullet(gap, y);
  });
  y += 6;

  y = addSectionTitle("Areas for Improvement", y);
  (report.areasForImprovement || []).forEach((area) => {
    y = checkPageBreak(y, 8);
    y = addBullet(area, y);
  });
  y += 6;

  y = checkPageBreak(y, 50);
  y = addSectionTitle("Risk Assessment", y);
  y = addParagraph(report.riskAssessment, y);

  addFooter(2, 3);

  // ======= PAGE 3: 7 Negotiation Steps + Conclusion =======
  doc.addPage();
  y = 20;

  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setTextColor(...colors.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    `SoftwiseAI Benchmarking Report | ${vendor} | ${industry}`,
    margin,
    8
  );
  y = 22;

  y = addSectionTitle("7 Steps to Negotiate Better", y);

  (report.negotiationSteps || []).slice(0, 7).forEach((step, i) => {
    y = checkPageBreak(y, 22);

    // Step number circle
    doc.setFillColor(...colors.primary);
    doc.circle(margin + 5, y + 2, 4, "F");
    doc.setTextColor(...colors.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), margin + 3.5, y + 4);

    // Step text
    doc.setTextColor(...colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const stepText = step.replace(/^Step\s*\d+:\s*/i, "");
    const lines = doc.splitTextToSize(stepText, contentWidth - 16);
    doc.text(lines, margin + 14, y + 3);
    y += lines.length * 4.2 + 8;
  });

  y += 4;
  y = checkPageBreak(y, 40);
  y = addSectionTitle("Conclusion", y);
  y = addParagraph(report.conclusion, y);

  // Final CTA box
  y += 8;
  y = checkPageBreak(y, 30);
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");
  doc.setFillColor(...colors.primary);
  doc.rect(margin, y, 3, 22, "F");
  doc.setTextColor(...colors.primary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to negotiate?", margin + 8, y + 8);
  doc.setTextColor(...colors.gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Contact SoftwiseAI for hands-on negotiation support: info@redresscompliance.com",
    margin + 8,
    y + 15
  );

  addFooter(3, 3);

  return doc;
}
