export interface BenchmarkFormData {
  vendor: string;
  industry: string;
  contractText: string;
  email: string;
}

export interface VendorResearch {
  overview: string;
  pricingStrategies: string[];
  commonDiscounts: string[];
  negotiationLeverage: string[];
  marketPosition: string;
  recentTrends: string;
}

export interface PeerComparison {
  company: string;
  industry: string;
  dealSize: string;
  discount: string;
  keyTerms: string;
}

export interface BenchmarkReport {
  executiveSummary: string;
  vendorAnalysis: {
    overview: string;
    marketPosition: string;
    pricingModel: string;
  };
  peerComparisons: PeerComparison[];
  pricingBenchmark: {
    yourPricing: string;
    marketAverage: string;
    bestInClass: string;
    savingsOpportunity: string;
  };
  complianceGaps: string[];
  areasForImprovement: string[];
  negotiationSteps: string[];
  riskAssessment: string;
  conclusion: string;
}
