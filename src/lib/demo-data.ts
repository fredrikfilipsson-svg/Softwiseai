import { VendorResearch, BenchmarkReport } from "./types";

export function getDemoVendorResearch(vendor: string, industry: string): VendorResearch {
  return {
    overview: `${vendor} is a dominant force in the enterprise software market with significant presence across ${industry}. They hold approximately 20-30% market share in their core segments and have been aggressively expanding through both organic growth and acquisitions. Their pricing has been trending upward 8-15% annually.`,
    pricingStrategies: [
      `Per-user/per-seat licensing with tiered pricing (typically $25-$150/user/month depending on edition)`,
      `Enterprise License Agreements (ELAs) with 3-year commitments and annual true-ups`,
      `Bundled pricing that packages less popular products with high-demand ones to increase deal size`,
      `Usage-based pricing for cloud/consumption services with unpredictable cost escalation`,
      `Premium support tiers that can add 20-30% to base license costs`,
    ],
    commonDiscounts: [
      `End-of-quarter/end-of-fiscal-year discounts of 15-30% when sales reps need to hit targets`,
      `Multi-year commitment discounts of 10-20% for 3+ year agreements`,
      `Volume discounts starting at 500+ seats, with best pricing at 5,000+ seats`,
      `Competitive displacement discounts of 20-40% when switching from a direct competitor`,
      `Early renewal discounts of 5-15% when renewing 90+ days before contract expiration`,
    ],
    negotiationLeverage: [
      `Reference competitive alternatives (even if not switching) to create pricing pressure`,
      `Time negotiations to coincide with ${vendor}'s fiscal quarter/year end for maximum leverage`,
      `Negotiate price caps on annual escalation (aim for 3-5% vs their standard 7-10%)`,
      `Push back on shelfware — only pay for what you actively use and demand usage audits`,
      `Separate support contracts from licenses to negotiate each independently`,
    ],
    marketPosition: `${vendor} is positioned as a Leader in the Gartner Magic Quadrant for their primary product categories. They face growing competition from cloud-native challengers and open-source alternatives. In ${industry}, they maintain strong market presence but are increasingly challenged by specialized vertical solutions.`,
    recentTrends: `${vendor} has been transitioning customers from perpetual licenses to subscription/cloud models, often resulting in 20-40% cost increases. They've introduced consumption-based pricing for new products, making cost predictability challenging. Recent M&A activity has led to product overlap and forced migration paths that create negotiation opportunities.`,
  };
}

export function getDemoBenchmarkReport(vendor: string, industry: string): BenchmarkReport {
  return {
    executiveSummary: `This benchmarking analysis reveals that the proposed ${vendor} contract for your ${industry} organization is priced 15-25% above market average for comparable deployments. Key concerns include aggressive auto-renewal clauses, above-market annual escalation rates, and insufficient SLA commitments. Immediate renegotiation focusing on pricing alignment and contractual protections could yield estimated savings of $150K-$400K over the contract term.`,
    vendorAnalysis: {
      overview: `${vendor} maintains a dominant market position in enterprise software, leveraging their installed base to drive expansion revenue. Their go-to-market strategy increasingly emphasizes cloud migration and platform consolidation, which creates both risks and leverage points for buyers.`,
      marketPosition: `${vendor} is classified as a Market Leader with approximately 25% share in their core segment. However, they face intensifying competition from cloud-native alternatives and vertical-specific solutions in ${industry}. Customer satisfaction scores have been declining, with Net Promoter Scores dropping 12 points over the past two years. Key competitors include emerging platforms offering 30-40% lower total cost of ownership.`,
      pricingModel: `${vendor} employs a hybrid pricing model combining per-user subscriptions, platform fees, and consumption-based charges. The submitted contract uses a tiered per-user model with add-on modules priced separately. This structure is 18% above the median for ${industry} organizations of comparable size. Their standard annual escalation of 7-8% significantly exceeds the market norm of 3-4%.`,
    },
    peerComparisons: [
      { company: "Fortune 500 Financial Services Firm", industry, dealSize: "$2.8M/year", discount: "28%", keyTerms: "Price cap 3%, 90-day termination clause, quarterly true-downs" },
      { company: "Global Insurance Provider", industry, dealSize: "$1.5M/year", discount: "22%", keyTerms: "Multi-cloud flexibility, annual usage audit rights" },
      { company: "Regional Banking Group", industry, dealSize: "$850K/year", discount: "18%", keyTerms: "Co-term alignment, free premium support Year 1" },
      { company: "Multinational Manufacturing Corp", industry, dealSize: "$3.2M/year", discount: "32%", keyTerms: "Competitive displacement deal, 5-year price lock" },
      { company: "Top 20 Healthcare Network", industry, dealSize: "$1.9M/year", discount: "25%", keyTerms: "Data residency guarantees, HIPAA BAA included" },
      { company: "Government Agency (Federal)", industry, dealSize: "$4.1M/year", discount: "35%", keyTerms: "GSA pricing, FedRAMP compliance, source code escrow" },
      { company: "Mid-Market Retail Chain", industry, dealSize: "$620K/year", discount: "15%", keyTerms: "Seasonal scaling rights, consumption caps" },
      { company: "Energy Sector Enterprise", industry, dealSize: "$2.1M/year", discount: "24%", keyTerms: "Exit assistance clause, 180-day data portability" },
      { company: "Global Telecom Operator", industry, dealSize: "$5.5M/year", discount: "38%", keyTerms: "Strategic partnership, custom SLA with financial penalties" },
      { company: "University Research Institution", industry, dealSize: "$380K/year", discount: "45%", keyTerms: "Academic pricing, unlimited seats, research license" },
    ],
    pricingBenchmark: {
      yourPricing: "Above market — estimated 15-25% premium over comparable deals",
      marketAverage: "$85-$120 per user/month for equivalent feature set in " + industry,
      bestInClass: "Top negotiators achieve $60-$85/user/month with enhanced terms",
      savingsOpportunity: "Estimated $200K-$400K annually (18-28% reduction achievable)",
    },
    complianceGaps: [
      "No explicit data breach notification timeline — industry standard requires 72-hour notification per GDPR/regulatory requirements",
      "Auto-renewal clause locks in 3-year extensions with only 30-day opt-out window — well below the 90-180 day standard",
      "Missing data portability provisions — no guaranteed export formats or timelines upon contract termination",
      "Insufficient audit rights — contract does not provide for independent third-party compliance audits",
      "No price escalation cap — vendor retains unilateral right to increase pricing beyond CPI benchmarks",
      "Weak service level commitments — 99.5% uptime target is below the 99.9% industry standard with no financial remedies",
    ],
    areasForImprovement: [
      "Negotiate annual price escalation cap of 3-4% maximum (currently uncapped at vendor discretion)",
      "Add contractual right to quarterly true-down adjustments for unused licenses",
      "Include meaningful SLA with financial penalties: 99.9% uptime with service credits",
      "Extend auto-renewal opt-out window from 30 days to minimum 120 days",
      "Add data portability clause guaranteeing export in standard formats within 30 days of termination",
      "Include most-favored-customer pricing clause for your industry segment",
      "Negotiate free premium support for Year 1 and cap support cost increases at 5% annually",
      "Add benchmarking clause allowing independent price comparison every 18 months",
    ],
    negotiationSteps: [
      "Step 1: Request a detailed cost breakdown separating licenses, support, cloud services, and professional services. This transparency reveals where the highest margins are and where the most negotiation room exists.",
      "Step 2: Present competitive alternatives and request a formal price match. Even without intent to switch, demonstrating awareness of alternatives like cloud-native competitors creates pricing pressure worth 10-15% additional discount.",
      "Step 3: Propose a 3-year agreement with a hard price cap of 3% annual escalation in exchange for commitment certainty. This protects against the vendor's typical 7-10% annual increases while giving them the multi-year predictability they value.",
      "Step 4: Demand quarterly true-down rights allowing you to reduce unused licenses. Push back on the 'shelfware trap' where you pay for seats you don't use. This alone can save 10-20% of annual costs.",
      "Step 5: Negotiate enhanced SLAs with financial teeth — 99.9% uptime guarantee with automatic service credits of 5% per hour of downtime. Current SLA has no financial remedies, removing vendor accountability.",
      "Step 6: Add a benchmarking clause that allows you to commission an independent pricing study every 18 months. If your pricing exceeds market median by more than 10%, trigger an automatic price adjustment.",
      "Step 7: Time your final negotiation push to coincide with the vendor's fiscal quarter-end. Engage their VP of Sales directly and present your counter-proposal as a 'sign today' package with specific asks. Quarter-end pressure typically yields an additional 5-15% concession.",
    ],
    riskAssessment: `The current contract presents significant vendor lock-in risk due to proprietary data formats, integrated workflows, and high switching costs estimated at 1.5-2x annual contract value. Price escalation risk is elevated given the uncapped annual increase provision — modeling suggests costs could increase 40-60% over a 5-year period at the vendor's standard escalation rate. SLA risk is moderate as the current 99.5% target permits up to 43 hours of annual downtime with no financial remedy. Data portability risk is high with no contractual guarantees on export formats or timelines. Exit strategy risk is critical — the 30-day auto-renewal opt-out window is dangerously short for ${industry} organizations requiring 6-12 months for vendor transitions.`,
    conclusion: `This ${vendor} contract requires significant renegotiation before execution. The most critical immediate action is establishing a hard price escalation cap and extending the auto-renewal opt-out window. With the 7 negotiation steps outlined above, organizations in ${industry} typically achieve 20-30% better overall economics while substantially reducing compliance and operational risk.`,
  };
}
