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

// API response format - single source of truth
export type KeywordSearchResultResponse = {
  position: number;
  creator: { handle: string; followers: number };
  caption: string;
  videoUrl: string;
  isPromotion: boolean;
  isAd: boolean;
  isSponsored: boolean;
  brand: string | null;
  confidence: number;
  signals: string[];
  tier: 1 | 2 | null;
  error?: string;
};
