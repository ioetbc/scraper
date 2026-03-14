import { ApifyClient } from 'apify-client';

// TikTok Scraper actor ID (clockworks/tiktok-scraper)
const TIKTOK_SCRAPER_ACTOR = 'clockworks/tiktok-scraper';

function getClient() {
  return new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
  });
}

export interface TikTokVideo {
  id: string;
  caption: string;
  mentions: string[];
  hashtags: string[];
  isAd: boolean;
  isSponsored: boolean;
  creator: {
    handle: string;
    followers: number;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  videoUrl: string;
}

export async function searchTikTok(keyword: string, maxResults = 20): Promise<TikTokVideo[]> {
  const client = getClient();

  const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
    searchQueries: [keyword],
    resultsPerPage: maxResults,
    searchSection: 'top',
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
    shouldDownloadSlideshowImages: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: any) => ({
    id: item.id || item.videoId || '',
    caption: item.text || item.desc || '',
    mentions: extractMentions(item.text || item.desc || ''),
    hashtags: item.hashtags?.map((h: any) => h.name || h) || extractHashtags(item.text || item.desc || ''),
    isAd: item.isAd || false,
    isSponsored: item.isSponsored || item.isPaidPartnership || false,
    creator: {
      handle: item.authorMeta?.name || item.author?.uniqueId || '',
      followers: item.authorMeta?.fans || item.author?.followerCount || 0,
    },
    stats: {
      likes: item.diggCount || item.stats?.diggCount || 0,
      comments: item.commentCount || item.stats?.commentCount || 0,
      shares: item.shareCount || item.stats?.shareCount || 0,
      views: item.playCount || item.stats?.playCount || 0,
    },
    videoUrl: item.webVideoUrl || item.videoUrl || '',
  }));
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches || [];
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches?.map(h => h.slice(1)) || [];
}
