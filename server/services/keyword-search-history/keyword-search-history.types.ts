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
