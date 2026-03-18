import type { TikTokVideo } from "../apify";
import type { ClassificationResult } from "../classifier";
import type { SearchResultItem } from "../../lib/response";

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

// Callback types for streaming keyword search
export type KeywordStreamingCallbacks = {
  onVideo: (result: SearchResultItem, progress: { total: number; completed: number }) => Promise<void>;
  onError: (videoId: string, message: string) => Promise<void>;
};
