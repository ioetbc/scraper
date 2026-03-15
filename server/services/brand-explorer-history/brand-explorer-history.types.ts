import type { BrandExplorerResult } from "../brand-explorer";

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

export type { BrandExplorerResult };
