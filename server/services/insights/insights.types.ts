export type InsightsInput = {
  searchId: string;
  captions: string[];
};

export type ContentPatternsData = {
  themes: string[];
  hooks: string[];
};

export type OpportunitySignalsData = {
  marketGaps: string[];
  saturationLevel: "low" | "medium" | "high";
  emergingOpportunities: string[];
};

export type SuggestedAction = {
  action: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

export type InsightsResult = {
  contentPatterns: ContentPatternsData;
  opportunitySignals: OpportunitySignalsData;
  suggestedActions: SuggestedAction[];
};

export class InsightsError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InsightsError";
  }
}
