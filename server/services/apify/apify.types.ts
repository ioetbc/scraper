export class ApifyError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ApifyError';
  }
}

export type TikTokVideo = {
  id: string;
  caption: string;
  mentions: string[];
  hashtags: string[];
  isAd: boolean;
  isSponsored: boolean;
  creator: {
    handle: string;
    followers: number;
    avatarUrl: string | null;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  videoUrl: string;
  shopProductUrl: string | null;
}
