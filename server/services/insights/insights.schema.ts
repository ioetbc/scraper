import {z} from "zod";

export const insightsSchema = z.object({
  contentPatterns: z.object({
    themes: z
      .array(z.string())
      .describe(
        "3-5 common themes or topics found across the captions (e.g., 'morning routines', 'product reviews', 'day in my life')",
      ),
    hooks: z
      .array(z.string())
      .describe(
        "3-5 effective opening hooks or patterns used to grab attention (e.g., 'POV: ...', 'Wait for it...', 'Things I wish I knew...')",
      ),
  }),
  opportunitySignals: z.object({
    marketGaps: z
      .array(z.string())
      .describe(
        "2-4 underserved areas or content gaps that could be opportunities",
      ),
    saturationLevel: z
      .enum(["low", "medium", "high"])
      .describe(
        "Overall market saturation level based on brand presence and content variety",
      ),
    emergingOpportunities: z
      .array(z.string())
      .describe("2-3 emerging trends or opportunities spotted in the content"),
  }),
  suggestedActions: z
    .array(
      z.object({
        action: z.string().describe("A specific, actionable recommendation"),
        rationale: z
          .string()
          .describe("Why this action is recommended based on the data"),
        priority: z
          .enum(["high", "medium", "low"])
          .describe("Priority level for this action"),
      }),
    )
    .describe("3-5 prioritized recommendations based on the analysis"),
});
