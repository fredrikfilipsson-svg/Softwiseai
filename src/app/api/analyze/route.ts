import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BenchmarkReport } from "@/lib/types";
import { saveContract, saveBenchmarkEntry, getBenchmarkEntries } from "@/lib/storage";
import { getAdminContextForVendor } from "@/lib/admin-data";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { vendor, industry, contractText, email } = await req.json();

    if (!vendor || !industry || !contractText || !email) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured." },
        { status: 500 }
      );
    }

    // Save the contract for knowledge base building
    saveContract({ vendor, industry, contractText, email });

    // Get existing benchmark knowledge for context
    const existingKnowledge = getBenchmarkEntries(vendor, industry);
    const knowledgeContext =
      existingKnowledge.length > 0
        ? `\n\nPrevious benchmark data for reference (${existingKnowledge.length} entries):\n` +
          existingKnowledge
            .slice(-5)
            .map((e) => `- ${e.summary} | Pricing: ${e.pricingInsights}`)
            .join("\n")
        : "";

    // Get admin-curated guidelines for this vendor (takes priority over AI knowledge)
    const adminContext = getAdminContextForVendor(vendor);

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a world-class software procurement analyst and vendor negotiation expert. Analyze the following software contract/proposal and create a comprehensive benchmarking report.
${adminContext}
VENDOR: ${vendor}
INDUSTRY: ${industry}
CONTRACT/PROPOSAL DETAILS:
${contractText}
${knowledgeContext}

Create a detailed benchmarking report in the following JSON format ONLY (no other text). Make the analysis realistic, data-driven, and specific to the vendor and industry. Generate realistic peer comparison data based on industry knowledge.

{
  "executiveSummary": "A 3-4 sentence executive summary of the benchmarking findings, key risks, and top recommendation",
  "vendorAnalysis": {
    "overview": "2-3 sentence overview of the vendor's current market position and strategy",
    "marketPosition": "Detailed market position analysis — leader/challenger status, market share estimates, competitive threats",
    "pricingModel": "Analysis of the vendor's pricing model, typical structures, and how this contract compares"
  },
  "peerComparisons": [
    {
      "company": "Anonymous Company 1 (realistic industry peer)",
      "industry": "${industry}",
      "dealSize": "Realistic deal size like $X.XM/year",
      "discount": "Realistic discount percentage like 15-25%",
      "keyTerms": "Key contract terms they negotiated"
    }
  ],
  "pricingBenchmark": {
    "yourPricing": "Assessment of the submitted pricing",
    "marketAverage": "What similar companies typically pay",
    "bestInClass": "What the best negotiators achieve",
    "savingsOpportunity": "Estimated savings opportunity in $ and %"
  },
  "complianceGaps": ["List of 5-6 compliance and redress gaps identified in the contract"],
  "areasForImprovement": ["List of 6-8 specific areas where the contract terms could be improved"],
  "negotiationSteps": [
    "Step 1: [Specific, actionable negotiation step with rationale]",
    "Step 2: ...",
    "Step 3: ...",
    "Step 4: ...",
    "Step 5: ...",
    "Step 6: ...",
    "Step 7: ..."
  ],
  "riskAssessment": "Comprehensive risk assessment covering vendor lock-in, price escalation, SLA adequacy, data portability, and exit strategy",
  "conclusion": "2-3 sentence conclusion with the most important action to take"
}

IMPORTANT: Generate exactly 10 peer comparisons in the peerComparisons array. Make them realistic for the ${industry} industry. Include exactly 7 negotiation steps.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format." },
        { status: 500 }
      );
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse analysis." },
        { status: 500 }
      );
    }

    const report: BenchmarkReport = JSON.parse(jsonMatch[0]);

    // Save to knowledge base for future benchmarks
    saveBenchmarkEntry({
      vendor,
      industry,
      summary: report.executiveSummary.slice(0, 200),
      pricingInsights: report.pricingBenchmark.savingsOpportunity,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze contract. Please try again." },
      { status: 500 }
    );
  }
}
