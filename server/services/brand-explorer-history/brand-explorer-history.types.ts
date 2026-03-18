import type { BrandExplorerResult } from "../brand-explorer";
import type { SearchResultItem, SearchSummary } from "../../lib/response";

export type SavedBrandExplorerSearch = {
  id: string;
  query: string;
  createdAt: Date;
  updatedAt: Date;
  summary: {
    totalVideos: number;
    totalInfluencers: number;
    totalReach: number;
  };
};

// Unified data format for brand explorer results (used by getBrandExplorerData)
export type BrandExplorerData = {
  summary: SearchSummary;
  results: SearchResultItem[];
};

export type { BrandExplorerResult };
