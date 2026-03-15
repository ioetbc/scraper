import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { classifierLogger } from '../../logger';
import { classificationSchema } from './classifier.schema';
import { CLASSIFIER_SYSTEM_PROMPT, buildClassifierUserPrompt } from './classifier.prompt';
import { ClassifierError, type ClassificationInput, type ClassificationResult } from './classifier.types';

export async function classifyVideo(input: ClassificationInput): Promise<ClassificationResult> {
  // Skip LLM if caption is empty - no data to classify
  if (!input.caption.trim()) {
    classifierLogger.debug("Skipping classification for empty caption", {
      reason: "empty_caption",
    });
    return {
      isPromotion: false,
      brand: null,
      confidence: 0,
      signals: ['empty_caption'],
      tier: 2,
    };
  }

  // Tier 1: Use GPT-4o for flagged content (isAd or isSponsored)
  // Tier 2: Use GPT-4o-mini for non-flagged content
  const useTier1 = input.isAd || input.isSponsored;
  const model = useTier1 ? 'gpt-4o' : 'gpt-4o-mini';
  const tier = useTier1 ? 1 : 2;
  const confidenceThreshold = useTier1 ? 0.70 : 0.85;
  const startTime = performance.now();

  try {
    const { output } = await generateText({
      model: openai(model),
      output: Output.object({ schema: classificationSchema }),
      system: CLASSIFIER_SYSTEM_PROMPT,
      prompt: buildClassifierUserPrompt(input),
    });

    const durationMs = Math.round(performance.now() - startTime);
    const meetsThreshold = output.confidence >= confidenceThreshold;
    const isPromotion = meetsThreshold && output.isPromotion;
    const brand = isPromotion ? output.brand : null;

    classifierLogger.debug("Classification completed", {
      tier,
      model,
      isPromotion,
      brand,
      confidence: output.confidence,
      confidenceThreshold,
      meetsThreshold,
      signalCount: output.signals.length,
      durationMs,
    });

    return {
      isPromotion,
      brand,
      confidence: output.confidence,
      signals: output.signals,
      tier,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    classifierLogger.error("Classification failed", {
      tier,
      model,
      captionPreview: input.caption.slice(0, 50),
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ClassifierError(
      `Failed to classify video with caption: "${input.caption.slice(0, 50)}..."`,
      error
    );
  }
}
