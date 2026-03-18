import {generateText, Output} from "ai";
import {openai} from "@ai-sdk/openai";
import {insightsLogger} from "../../logger";
import {insightsSchema} from "./insights.schema";
import {INSIGHTS_SYSTEM_PROMPT, buildInsightsUserPrompt} from "./insights.prompt";
import {
  InsightsError,
  type InsightsInput,
  type InsightsResult,
} from "./insights.types";

const MIN_CAPTIONS = 3;

export async function generateInsights(
  input: InsightsInput,
): Promise<InsightsResult> {
  // Require minimum captions for meaningful analysis
  if (input.captions.length < MIN_CAPTIONS) {
    insightsLogger.debug("Insufficient captions for insights", {
      searchId: input.searchId,
      captionCount: input.captions.length,
      minRequired: MIN_CAPTIONS,
    });
    throw new InsightsError(
      `Need at least ${MIN_CAPTIONS} captions for insights analysis, got ${input.captions.length}`,
    );
  }

  // Filter out empty captions
  const validCaptions = input.captions.filter((c) => c.trim().length > 0);

  if (validCaptions.length < MIN_CAPTIONS) {
    insightsLogger.debug("Insufficient non-empty captions for insights", {
      searchId: input.searchId,
      totalCaptions: input.captions.length,
      validCaptions: validCaptions.length,
      minRequired: MIN_CAPTIONS,
    });
    throw new InsightsError(
      `Need at least ${MIN_CAPTIONS} non-empty captions for insights analysis`,
    );
  }

  const model = "gpt-4o-mini";
  const startTime = performance.now();

  try {
    const {output} = await generateText({
      model: openai(model),
      output: Output.object({schema: insightsSchema}),
      system: INSIGHTS_SYSTEM_PROMPT,
      prompt: buildInsightsUserPrompt({
        ...input,
        captions: validCaptions,
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    insightsLogger.debug("Insights generated", {
      searchId: input.searchId,
      model,
      captionCount: validCaptions.length,
      themesCount: output.contentPatterns.themes.length,
      hooksCount: output.contentPatterns.hooks.length,
      actionsCount: output.suggestedActions.length,
      saturation: output.opportunitySignals.saturationLevel,
      durationMs,
    });

    return output;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    insightsLogger.error("Insights generation failed", {
      searchId: input.searchId,
      model,
      captionCount: validCaptions.length,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new InsightsError(
      `Failed to generate insights for search ${input.searchId}`,
      error,
    );
  }
}
