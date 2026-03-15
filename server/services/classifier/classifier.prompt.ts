import type { ClassificationInput } from './classifier.types';

export const CLASSIFIER_SYSTEM_PROMPT = `You are an expert at identifying sponsored content and brand promotions on TikTok.

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

export function buildClassifierUserPrompt(input: ClassificationInput): string {
  return `Analyze this TikTok video for brand promotion:

Caption: ${input.caption}

Mentions: ${input.mentions.length > 0 ? input.mentions.join(', ') : 'None'}

Hashtags: ${input.hashtags.length > 0 ? input.hashtags.map(h => `#${h}`).join(', ') : 'None'}

Platform flags:
- isAd: ${input.isAd}
- isSponsored: ${input.isSponsored}

Determine if this is promotional content and identify the brand if applicable.`;
}
