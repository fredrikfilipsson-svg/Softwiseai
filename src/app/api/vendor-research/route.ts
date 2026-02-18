import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { VendorResearch } from "@/lib/types";
import { getAdminContextForVendor } from "@/lib/admin-data";
import { getDemoVendorResearch } from "@/lib/demo-data";

export async function POST(req: NextRequest) {
  try {
    const { vendor, industry } = await req.json();

    if (!vendor || !industry) {
      return NextResponse.json(
        { error: "Vendor and industry are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Demo mode — return realistic mock data
      const research = getDemoVendorResearch(vendor, industry);
      return NextResponse.json({ research, demo: true });
    }

    const adminContext = getAdminContextForVendor(vendor);

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a senior software vendor negotiation expert and procurement consultant with 20+ years of experience. Provide detailed research on the following vendor for a client in the specified industry.
${adminContext}
Vendor: ${vendor}
Client Industry: ${industry}

Respond in the following JSON format ONLY (no other text):
{
  "overview": "Brief overview of the vendor's position in the market and relevance to this industry",
  "pricingStrategies": ["List of 4-5 known pricing strategies this vendor uses"],
  "commonDiscounts": ["List of 4-5 common discounts and concessions available from this vendor"],
  "negotiationLeverage": ["List of 4-5 specific leverage points for negotiating with this vendor"],
  "marketPosition": "Description of the vendor's market position (leader/challenger/niche) and competitive landscape",
  "recentTrends": "Recent pricing and licensing trends, changes, or concerns with this vendor"
}`,
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

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse vendor research." },
        { status: 500 }
      );
    }

    const research: VendorResearch = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ research });
  } catch (error) {
    console.error("Vendor research error:", error);
    return NextResponse.json(
      { error: "Failed to research vendor. Please check your API key." },
      { status: 500 }
    );
  }
}
