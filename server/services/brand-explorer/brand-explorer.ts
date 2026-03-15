import { searchByMention, searchByHashtag, searchTikTok, type TikTokVideo } from '../apify';
import { classifyVideo } from '../classifier';
import { brandExplorerLogger } from '../../logger';
import {
  BrandExplorerError,
  type BrandExplorerInput,
  type BrandExplorerResult,
  type BrandInfluencer,
  type BrandVideo,
  type NormalizedHandle,
} from './brand-explorer.types';

function normalizeHandle(input: string): NormalizedHandle {
  const cleaned = input.replace(/^@/, '').replace(/\.+$/, '');
  return {
    handle: `@${cleaned}`,
    username: cleaned,
    hashtag: cleaned.replace(/\./g, ''),
  };
}

function dedupeVideos(videos: TikTokVideo[]): TikTokVideo[] {
  const seen = new Set<string>();
  return videos.filter(v => {
    if (!v.id || seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

function isMatchingBrand(detectedBrand: string | null, normalized: NormalizedHandle): boolean {
  if (!detectedBrand) return false;

  const detected = detectedBrand.toLowerCase();
  const targets = [
    normalized.username.toLowerCase(),
    normalized.hashtag.toLowerCase(),
    normalized.handle.toLowerCase(),
  ];

  // Check if detected brand matches any of our target variations
  return targets.some(target =>
    detected.includes(target) || target.includes(detected)
  );
}

export async function exploreBrand(input: BrandExplorerInput): Promise<BrandExplorerResult> {
  const startTime = performance.now();
  const normalized = normalizeHandle(input.handle);

  brandExplorerLogger.info("Starting brand exploration", {
    inputHandle: input.handle,
    normalizedHandle: normalized.handle,
    hashtag: normalized.hashtag,
  });

  // Run parallel searches: mentions, hashtags, and keyword (plain text in captions)
  const [mentionResults, hashtagResults, keywordResults] = await Promise.allSettled([
    searchByMention(normalized.handle),
    searchByHashtag(normalized.hashtag),
    searchTikTok(normalized.hashtag), // Search brand name as keyword in captions
  ]);

  // Collect results, handling partial failures
  const allVideos: TikTokVideo[] = [];
  const errors: string[] = [];

  if (mentionResults.status === 'fulfilled') {
    allVideos.push(...mentionResults.value);
  } else {
    errors.push(`Mention search failed: ${mentionResults.reason}`);
    brandExplorerLogger.warn("Mention search failed", {
      handle: normalized.handle,
      error: mentionResults.reason instanceof Error ? mentionResults.reason.message : String(mentionResults.reason),
    });
  }

  if (hashtagResults.status === 'fulfilled') {
    allVideos.push(...hashtagResults.value);
  } else {
    errors.push(`Hashtag search failed: ${hashtagResults.reason}`);
    brandExplorerLogger.warn("Hashtag search failed", {
      hashtag: normalized.hashtag,
      error: hashtagResults.reason instanceof Error ? hashtagResults.reason.message : String(hashtagResults.reason),
    });
  }

  if (keywordResults.status === 'fulfilled') {
    allVideos.push(...keywordResults.value);
  } else {
    errors.push(`Keyword search failed: ${keywordResults.reason}`);
    brandExplorerLogger.warn("Keyword search failed", {
      keyword: normalized.hashtag,
      error: keywordResults.reason instanceof Error ? keywordResults.reason.message : String(keywordResults.reason),
    });
  }

  // If all searches failed, throw
  if (allVideos.length === 0 && errors.length === 3) {
    throw new BrandExplorerError(`All searches failed for brand "${input.handle}": ${errors.join('; ')}`);
  }

  // Dedupe by video ID
  const uniqueVideos = dedupeVideos(allVideos);

  // Filter out the brand's own content
  const brandUsername = normalized.username.toLowerCase();
  const influencerVideos = uniqueVideos.filter(v =>
    v.creator.handle.toLowerCase() !== brandUsername
  );

  brandExplorerLogger.info("Deduplication complete", {
    totalRaw: allVideos.length,
    afterDedupe: uniqueVideos.length,
    afterFilteringBrandOwn: influencerVideos.length,
  });

  // Classify each video to confirm it promotes the target brand
  const classifiedVideos = await Promise.all(
    influencerVideos.map(async (video) => {
      try {
        const classification = await classifyVideo({
          caption: video.caption,
          mentions: video.mentions,
          hashtags: video.hashtags,
          isAd: video.isAd,
          isSponsored: video.isSponsored,
        });

        return {
          video,
          classification,
          isMatch: isMatchingBrand(classification.brand, normalized),
        };
      } catch (error) {
        brandExplorerLogger.warn("Classification failed for video", {
          videoId: video.id,
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          video,
          classification: null,
          isMatch: false,
        };
      }
    })
  );

  // Filter to only videos that promote the target brand
  const matchedVideos = classifiedVideos.filter(v => v.isMatch && v.classification);

  brandExplorerLogger.info("Classification complete", {
    classified: classifiedVideos.length,
    matchedBrand: matchedVideos.length,
  });

  // Aggregate by influencer
  const influencerMap = new Map<string, { followers: number; videos: typeof matchedVideos; totalViews: number }>();

  for (const item of matchedVideos) {
    const key = item.video.creator.handle;
    const existing = influencerMap.get(key) || {
      followers: item.video.creator.followers,
      videos: [],
      totalViews: 0,
    };
    existing.videos.push(item);
    existing.totalViews += item.video.stats.views;
    influencerMap.set(key, existing);
  }

  // Build response
  const influencers: BrandInfluencer[] = Array.from(influencerMap.entries())
    .map(([handle, data]) => ({
      handle,
      followers: data.followers,
      videosForBrand: data.videos.length,
      totalViews: data.totalViews,
    }))
    .sort((a, b) => b.totalViews - a.totalViews); // Sort by reach

  const videos: BrandVideo[] = matchedVideos.map(item => ({
    id: item.video.id,
    creator: item.video.creator,
    caption: item.video.caption,
    views: item.video.stats.views,
    videoUrl: item.video.videoUrl,
    confidence: item.classification!.confidence,
  }));

  const totalReach = videos.reduce((sum, v) => sum + v.views, 0);

  const durationMs = Math.round(performance.now() - startTime);

  brandExplorerLogger.info("Brand exploration complete", {
    brand: normalized.username,
    totalVideos: videos.length,
    totalInfluencers: influencers.length,
    totalReach,
    durationMs,
  });

  return {
    brand: normalized.username,
    summary: {
      totalVideos: videos.length,
      totalInfluencers: influencers.length,
      totalReach,
    },
    influencers,
    videos,
  };
}
