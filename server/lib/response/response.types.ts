// Unified result item for both keyword search and brand explorer
export type SearchResultItem = {
  position: number;
  creator: { handle: string; followers: number; avatarUrl: string | null };
  caption: string;
  videoUrl: string;
  views: number;
  isPromotion: boolean;
  isAd: boolean;
  isSponsored: boolean;
  brand: string | null;
  confidence: number;
  signals: string[];
  tier: 1 | 2 | null;
  error?: string;
};

// Summary stats for search results
export type SearchSummary = {
  totalVideos: number;
  totalInfluencers: number;
  totalReach: number;
};

// Return type for save/refresh operations - shared by keyword search and brand explorer
export type SearchData = {
  id: string;
  query: string;
  summary: SearchSummary;
  results: SearchResultItem[];
};

// Unified search response for both keyword and brand explorer
export type SearchResponse = {
  query: string;
  searchId: string;
  cached: boolean;
  summary: SearchSummary;
  results: SearchResultItem[];
};

// History list item
export type HistorySearchItem = {
  id: string;
  type: "keyword" | "brand_explorer";
  query: string;
  createdAt: Date;
  updatedAt: Date;
  resultCount: number;
  summary: SearchSummary | null;
};

// History list response
export type HistoryListResponse = {
  searches: HistorySearchItem[];
};
