import { ApifyClient } from 'apify-client';
import { apifyLogger } from '../../logger';
import { ApifyError, type TikTokVideo } from './apify.types';

// TikTok Scraper actor ID (clockworks/tiktok-scraper)
const TIKTOK_SCRAPER_ACTOR = 'clockworks/tiktok-scraper';

// Default max results - configurable via env var for easy local testing
const DEFAULT_MAX_RESULTS = Number(process.env.APIFY_MAX_RESULTS) || 1000000;

// Polling interval for streaming (ms)
const STREAM_POLL_INTERVAL = 2000;

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new ApifyError('APIFY_API_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token });
}

export async function searchTikTok(keyword: string, maxResults = DEFAULT_MAX_RESULTS): Promise<TikTokVideo[]> {
  const client = getClient();
  const startTime = performance.now();

  console.log('DEFAULT_MAX_RESULTS', DEFAULT_MAX_RESULTS);

  try {
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
      searchQueries: [keyword],
      resultsPerPage: maxResults,
      searchSection: '',  // Empty string = "Top" tab (most relevant results)
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
 * Streaming version of searchTikTok - yields batches of videos as they become available
 * Uses an async generator to stream results while the Apify actor is still running
 */
export async function* searchTikTokStreaming(
  keyword: string,
  maxResults = DEFAULT_MAX_RESULTS
): AsyncGenerator<TikTokVideo[], void, unknown> {
  const client = getClient();
  const startTime = performance.now();

  apifyLogger.info("Starting streaming TikTok search", { keyword, maxResults });

  try {
    // Start the actor without waiting for completion
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).start({
      searchQueries: [keyword],
      resultsPerPage: maxResults,
      searchSection: '',
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    });

    const runId = run.id;
    const datasetId = run.defaultDatasetId;
    let offset = 0;
    let totalYielded = 0;

    apifyLogger.info("Apify actor started", { runId, datasetId });

    // Poll until the run completes
    while (true) {
      // Check run status
      const runInfo = await client.run(runId).get();
      const status = runInfo?.status;

      // Fetch new items from dataset
      const { items } = await client.dataset(datasetId).listItems({
        offset,
        limit: 100,
      });

      if (items.length > 0) {
        const videos = mapApifyResults(items);
        offset += items.length;
        totalYielded += videos.length;

        apifyLogger.info("Streaming batch", {
          runId,
          batchSize: videos.length,
          totalYielded,
          runStatus: status,
        });

        yield videos;
      }

      // Check if run is complete
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        // Fetch any remaining items
        const { items: remainingItems } = await client.dataset(datasetId).listItems({
          offset,
        });

        if (remainingItems.length > 0) {
          const videos = mapApifyResults(remainingItems);
          totalYielded += videos.length;

          apifyLogger.info("Streaming final batch", {
            runId,
            batchSize: videos.length,
            totalYielded,
          });

          yield videos;
        }

        const durationMs = Math.round(performance.now() - startTime);

        if (status === 'SUCCEEDED') {
          apifyLogger.info("Streaming TikTok search completed", {
            keyword,
            runId,
            totalVideos: totalYielded,
            durationMs,
          });
        } else {
          apifyLogger.error("Streaming TikTok search ended with status", {
            keyword,
            runId,
            status,
            totalVideos: totalYielded,
            durationMs,
          });

          if (status === 'FAILED' || status === 'ABORTED') {
            throw new ApifyError(`Apify run ${status.toLowerCase()}: ${runId}`);
          }
        }

        break;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, STREAM_POLL_INTERVAL));
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    apifyLogger.error("Streaming TikTok search failed", {
      keyword,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApifyError(
      `Failed to stream TikTok search for keyword "${keyword}"`,
      error
    );
  }
}

/**
 * Search for videos mentioning a specific handle (e.g., @submagic.co)
 */
export async function searchByMention(handle: string, maxResults = DEFAULT_MAX_RESULTS): Promise<TikTokVideo[]> {
  const client = getClient();
  const startTime = performance.now();
  // Ensure handle starts with @
  const searchHandle = handle.startsWith('@') ? handle : `@${handle}`;

  try {
    const run = await client.actor(TIKTOK_SCRAPER_ACTOR).call({
      searchQueries: [searchHandle],
      resultsPerPage: maxResults,
      searchSection: '',  // Empty string = "Top" tab (most relevant results)
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
export async function searchByHashtag(hashtag: string, maxResults = DEFAULT_MAX_RESULTS): Promise<TikTokVideo[]> {
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
        avatarUrl: item.authorMeta?.avatar || item.author?.avatarThumb || item.author?.avatarMedium || null,
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
