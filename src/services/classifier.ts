import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export interface ClassificationInput {
  caption: string;
  mentions: string[];
  hashtags: string[];
  isAd: boolean;
  isSponsored: boolean;
}

export interface ClassificationResult {
  isPromotion: boolean;
  brand: string | null;
  confidence: number;
  signals: string[];
  tier: 1 | 2;
}

const classificationSchema = z.object({
  isPromotion: z.boolean().describe('Whether this content is promoting a brand or product'),
  brand: z.string().nullable().describe('The brand being promoted, or null if not identifiable'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  signals: z.array(z.string()).describe('List of signals that indicate promotion (e.g., "mentions brand handle", "uses #ad hashtag", "partnership language")'),
});

const SYSTEM_PROMPT = `You are an expert at identifying sponsored content and brand promotions on TikTok.

Analyze the provided video metadata and determine:
1. Whether this is promotional content (paid partnership, sponsorship, or brand deal)
2. Which brand is being promoted (if any)
3. Your confidence level (0-1)
4. The specific signals that led to your conclusion

Common promotion signals:
- Explicit ad/sponsorship hashtags: #ad, #sponsored, #partner, #gifted, #collab
- Brand mentions with @ handles
- Partnership language: "partnered with", "thanks to", "in collaboration with"
- Discount codes or affiliate links mentioned
- Product placement with brand tags
- "Link in bio" with brand context

Be thorough but avoid false positives. Not every brand mention is a paid promotion.`;

export async function classifyVideo(input: ClassificationInput): Promise<ClassificationResult> {
  // Tier 1: Use GPT-4o for flagged content (isAd or isSponsored)
  // Tier 2: Use GPT-4o-mini for non-flagged content
  const useTier1 = input.isAd || input.isSponsored;
  const model = useTier1 ? 'gpt-4o' : 'gpt-4o-mini';
  const confidenceThreshold = useTier1 ? 0.70 : 0.85;

  const userPrompt = `Analyze this TikTok video for brand promotion:

Caption: ${input.caption}

Mentions: ${input.mentions.length > 0 ? input.mentions.join(', ') : 'None'}

Hashtags: ${input.hashtags.length > 0 ? input.hashtags.map(h => `#${h}`).join(', ') : 'None'}

Platform flags:
- isAd: ${input.isAd}
- isSponsored: ${input.isSponsored}

Determine if this is promotional content and identify the brand if applicable.`;

  const { object } = await generateObject({
    model: openai(model),
    schema: classificationSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  // Apply confidence threshold - if below threshold, mark as not promotional
  const meetsThreshold = object.confidence >= confidenceThreshold;

  return {
    isPromotion: meetsThreshold && object.isPromotion,
    brand: meetsThreshold && object.isPromotion ? object.brand : null,
    confidence: object.confidence,
    signals: object.signals,
    tier: useTier1 ? 1 : 2,
  };
}
