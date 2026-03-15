import { z } from 'zod';

export const classificationSchema = z.object({
  isPromotion: z.boolean().describe('Whether this content is promoting a brand or product'),
  brand: z.string().nullable().describe('The brand being promoted, or null if not identifiable'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  signals: z.array(z.string()).describe('List of signals that indicate promotion (e.g., "mentions brand handle", "uses #ad hashtag", "partnership language")'),
});
