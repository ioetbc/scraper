import type { TikTokVideo } from "../apify";
import type { ClassificationResult } from "../classifier";

export type KeywordSearchResult = {
  video: TikTokVideo;
  classification: ClassificationResult | null;
  error?: string;
};

export type SavedKeywordSearch = {
  id: string;
  query: string;
  createdAt: Date;
  updatedAt: Date;
  resultCount: number;
};

export type SavedKeywordSearchResult = {
  id: string;
  position: number;
  video: TikTokVideo;
  isPromotion: boolean;
  brand: string | null;
  confidence: number;
  signals: string[];
  tier: number | null;
  error: string | null;
};
