import { ApifyClient } from 'apify-client';
import { apifyLogger } from '../../logger';
import { ApifyError, type TikTokVideo } from './apify.types';

// TikTok Scraper actor ID (clockworks/tiktok-scraper)
const TIKTOK_SCRAPER_ACTOR = 'clockworks/tiktok-scraper';

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new ApifyError('APIFY_API_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token });
}

export async function searchTikTok(keyword: string, maxResults = 20): Promise<TikTokVideo[]> {
  const client = getClient();
  const startTime = performance.now();

  try {
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
      searchQueries: [keyword],
      resultsPerPage: maxResults,
      searchSection: '/video',
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const videos = mapApifyResults(items);

    const durationMs = Math.round(performance.now() - startTime);
    const flaggedCount = videos.filter(v => v.isAd || v.isSponsored).length;

    apifyLogger.info("TikTok search completed", {
      keyword,
      maxResults,
      runId: run.id,
      videoCount: videos.length,
      flaggedAsAdCount: flaggedCount,
      durationMs,
    });

    return videos;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    apifyLogger.error("TikTok search failed", {
      keyword,
      maxResults,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApifyError(
      `Failed to search TikTok for keyword "${keyword}"`,
      error
    );
  }
}

/**
 * Search for videos mentioning a specific handle (e.g., @submagic.co)
 */
export async function searchByMention(handle: string, maxResults = 20): Promise<TikTokVideo[]> {
  const client = getClient();
  const startTime = performance.now();
  // Ensure handle starts with @
  const searchHandle = handle.startsWith('@') ? handle : `@${handle}`;

  try {
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
      searchQueries: [searchHandle],
      resultsPerPage: maxResults,
      searchSection: '/video',
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const videos = mapApifyResults(items);

    const durationMs = Math.round(performance.now() - startTime);
    apifyLogger.info("TikTok mention search completed", {
      handle: searchHandle,
      maxResults,
      runId: run.id,
      videoCount: videos.length,
      durationMs,
    });

    return videos;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    apifyLogger.error("TikTok mention search failed", {
      handle: searchHandle,
      maxResults,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApifyError(
      `Failed to search TikTok for mention "${searchHandle}"`,
      error
    );
  }
}

/**
 * Search for videos with a specific hashtag (e.g., #submagic)
 */
export async function searchByHashtag(hashtag: string, maxResults = 20): Promise<TikTokVideo[]> {
  const client = getClient();
  const startTime = performance.now();
  // Remove # if present - the API expects hashtag without #
  const cleanHashtag = hashtag.replace(/^#/, '');

  try {
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
      hashtags: [cleanHashtag],
      resultsPerPage: maxResults,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const videos = mapApifyResults(items);

    const durationMs = Math.round(performance.now() - startTime);
    apifyLogger.info("TikTok hashtag search completed", {
      hashtag: cleanHashtag,
      maxResults,
      runId: run.id,
      videoCount: videos.length,
      durationMs,
    });

    return videos;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    apifyLogger.error("TikTok hashtag search failed", {
      hashtag: cleanHashtag,
      maxResults,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApifyError(
      `Failed to search TikTok for hashtag "#${cleanHashtag}"`,
      error
    );
  }
}

function mapApifyResults(items: any[]): TikTokVideo[] {
  return items.map((item: any) => {
    const caption = item.text || item.desc || '';
    return {
      id: item.id || item.videoId || '',
      caption,
      mentions: extractMentions(caption),
      hashtags: extractHashtags(caption),
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
      shopProductUrl: item.shopProductUrl || item.shop_product_url || null,
    };
  });
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches || [];
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g);
  return matches?.map(h => h.slice(1)) || [];
}
