export class BrandExplorerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BrandExplorerError';
  }
}

export type BrandExplorerInput = {
  handle: string; // e.g., "submagic.co" or "@submagic.co"
}

export type BrandInfluencer = {
  handle: string;
  followers: number;
  videosForBrand: number;
  totalViews: number;
}

export type BrandVideo = {
  id: string;
  creator: { handle: string; followers: number; avatarUrl: string | null };
  caption: string;
  views: number;
  videoUrl: string;
  confidence: number;
}

export type BrandExplorerResult = {
  brand: string;
  summary: {
    totalVideos: number;
    totalInfluencers: number;
    totalReach: number;
  };
  influencers: BrandInfluencer[];
  videos: BrandVideo[];
}

export type NormalizedHandle = {
  handle: string;   // @submagic.co
  username: string; // submagic.co
  hashtag: string;  // submagic (no dots)
}

// Callback types for streaming brand exploration
export type ClassifiedVideo = {
  video: {
    id: string
    creator: { handle: string; followers: number; avatarUrl: string | null }
    caption: string
    videoUrl: string
    stats: { views: number }
  }
  classification: {
    isPromotion: boolean
    brand: string | null
    confidence: number
    signals: string[]
    tier: 1 | 2
  }
}

export type StreamingCallbacks = {
  onVideo: (video: ClassifiedVideo, progress: { total: number; completed: number }) => Promise<void>
  onError: (videoId: string, message: string) => Promise<void>
}
