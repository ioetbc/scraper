import { prisma, PLACEHOLDER_USER_ID } from "../../lib/prisma";
import { classifyVideo } from "../classifier";
import type { TikTokVideo } from "../apify";
import type { KeywordSearchResult, SavedKeywordSearch } from "./keyword-search-history.types";
import type { SearchResultItem, SearchSummary, SearchData } from "../../lib/response";

/**
 * Classifies an array of TikTok videos for brand promotion detection.
 * Returns classified results and error count for logging.
 */
export async function classifyVideos(
  videos: TikTokVideo[]
): Promise<{ results: KeywordSearchResult[]; errorCount: number }> {
  let errorCount = 0;
  const results: KeywordSearchResult[] = [];

  for (const video of videos) {
    try {
      const classification = await classifyVideo({
        caption: video.caption,
        mentions: video.mentions,
        hashtags: video.hashtags,
        isAd: video.isAd,
        isSponsored: video.isSponsored,
      });

      results.push({ video, classification });
    } catch {
      errorCount++;
      results.push({
        video,
        classification: null,
        error: "Classification failed",
      });
    }
  }

  return { results, errorCount };
}

export async function findKeywordSearch(query: string): Promise<SavedKeywordSearch | null> {
  const normalizedQuery = query.toLowerCase();

  const search = await prisma.search.findUnique({
    where: {
      userId_type_query: {
        userId: PLACEHOLDER_USER_ID,
        type: "keyword",
        query: normalizedQuery,
      },
    },
    include: {
      _count: {
        select: { results: true },
      },
    },
  });

  if (!search) return null;

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    resultCount: search._count.results,
  };
}

export async function saveKeywordSearch(
  query: string,
  classifiedResults: KeywordSearchResult[]
): Promise<SearchData> {
  const normalizedQuery = query.toLowerCase();

  // Create the search first
  const search = await prisma.search.create({
    data: {
      user: {
        connectOrCreate: {
          where: { id: PLACEHOLDER_USER_ID },
          create: { id: PLACEHOLDER_USER_ID },
        },
      },
      type: "keyword",
      query: normalizedQuery,
    },
  });

  // Build response items while saving to DB
  const responseItems: SearchResultItem[] = [];

  for (let index = 0; index < classifiedResults.length; index++) {
    const result = classifiedResults[index];
    const video = await createVideoForSearch(search.id, result.video);

    const isPromotion = result.video.isAd || result.video.isSponsored || (result.classification?.isPromotion ?? false);
    let brand = result.classification?.brand ?? null;
    if (isPromotion && !brand) {
      brand = 'NOT_FOUND';
    }

    await prisma.searchResult.create({
      data: {
        searchId: search.id,
        videoId: video.id,
        position: index,
        isPromotion,
        brand,
        confidence: result.classification?.confidence ?? 0,
        signals: result.classification?.signals ?? [],
        tier: result.classification?.tier ?? null,
        error: result.error ?? null,
      },
    });

    responseItems.push({
      position: index + 1,
      creator: {
        handle: result.video.creator.handle,
        followers: result.video.creator.followers,
        avatarUrl: result.video.creator.avatarUrl,
      },
      caption: result.video.caption,
      videoUrl: result.video.videoUrl,
      views: result.video.stats.views,
      isPromotion,
      isAd: result.video.isAd,
      isSponsored: result.video.isSponsored,
      brand,
      confidence: result.classification?.confidence ?? 0,
      signals: result.classification?.signals ?? [],
      tier: result.classification?.tier ?? null,
      error: result.error,
    });
  }

  // Calculate summary from data we already have
  const uniqueCreators = new Set(classifiedResults.map((r) => r.video.creator.handle));
  const totalReach = classifiedResults.reduce((sum, r) => sum + r.video.creator.followers, 0);

  return {
    id: search.id,
    query: search.query,
    summary: {
      totalVideos: classifiedResults.length,
      totalInfluencers: uniqueCreators.size,
      totalReach,
    },
    results: responseItems,
  };
}

export async function refreshKeywordSearch(
  searchId: string,
  classifiedResults: KeywordSearchResult[]
): Promise<SearchData> {
  // Delete existing results and videos (videos cascade from searchId)
  await prisma.searchResult.deleteMany({
    where: { searchId },
  });
  await prisma.video.deleteMany({
    where: { searchId },
  });

  // Build response items while saving to DB
  const responseItems: SearchResultItem[] = [];

  for (let index = 0; index < classifiedResults.length; index++) {
    const result = classifiedResults[index];
    const video = await createVideoForSearch(searchId, result.video);

    const isPromotion = result.video.isAd || result.video.isSponsored || (result.classification?.isPromotion ?? false);
    let brand = result.classification?.brand ?? null;
    if (isPromotion && !brand) {
      brand = 'NOT_FOUND';
    }

    await prisma.searchResult.create({
      data: {
        searchId,
        videoId: video.id,
        position: index,
        isPromotion,
        brand,
        confidence: result.classification?.confidence ?? 0,
        signals: result.classification?.signals ?? [],
        tier: result.classification?.tier ?? null,
        error: result.error ?? null,
      },
    });

    responseItems.push({
      position: index + 1,
      creator: {
        handle: result.video.creator.handle,
        followers: result.video.creator.followers,
        avatarUrl: result.video.creator.avatarUrl,
      },
      caption: result.video.caption,
      videoUrl: result.video.videoUrl,
      views: result.video.stats.views,
      isPromotion,
      isAd: result.video.isAd,
      isSponsored: result.video.isSponsored,
      brand,
      confidence: result.classification?.confidence ?? 0,
      signals: result.classification?.signals ?? [],
      tier: result.classification?.tier ?? null,
      error: result.error,
    });
  }

  // Update search timestamp and get query
  const search = await prisma.search.update({
    where: { id: searchId },
    data: { updatedAt: new Date() },
  });

  // Calculate summary from data we already have
  const uniqueCreators = new Set(classifiedResults.map((r) => r.video.creator.handle));
  const totalReach = classifiedResults.reduce((sum, r) => sum + r.video.creator.followers, 0);

  return {
    id: search.id,
    query: search.query,
    summary: {
      totalVideos: classifiedResults.length,
      totalInfluencers: uniqueCreators.size,
      totalReach,
    },
    results: responseItems,
  };
}

export async function getKeywordSearchData(
  searchId: string
): Promise<{ summary: SearchSummary; results: SearchResultItem[] }> {
  const results = await prisma.searchResult.findMany({
    where: { searchId },
    orderBy: { position: "asc" },
    include: {
      video: {
        include: {
          stats: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Calculate summary from results
  const uniqueCreators = new Set(results.map((r) => r.video.creatorHandle));
  const totalReach = results.reduce(
    (sum, r) => sum + r.video.creatorFollowers,
    0
  );

  const summary: SearchSummary = {
    totalVideos: results.length,
    totalInfluencers: uniqueCreators.size,
    totalReach,
  };

  const items: SearchResultItem[] = results.map((result) => ({
    position: result.position + 1,
    creator: {
      handle: result.video.creatorHandle,
      followers: result.video.creatorFollowers,
      avatarUrl: result.video.creatorAvatarUrl,
    },
    caption: result.video.caption,
    videoUrl: result.video.videoUrl,
    views: result.video.stats[0]?.views ?? 0,
    isPromotion: result.isPromotion,
    isAd: result.video.isAd,
    isSponsored: result.video.isSponsored,
    brand: result.brand,
    confidence: result.confidence,
    signals: result.signals as string[],
    tier: result.tier as 1 | 2 | null,
    error: result.error ?? undefined,
  }));

  return { summary, results: items };
}

async function createVideoForSearch(searchId: string, video: KeywordSearchResult["video"]) {
  return prisma.video.create({
    data: {
      searchId,
      tiktokId: video.id,
      caption: video.caption,
      isAd: video.isAd,
      isSponsored: video.isSponsored,
      creatorHandle: video.creator.handle,
      creatorFollowers: video.creator.followers,
      creatorAvatarUrl: video.creator.avatarUrl,
      videoUrl: video.videoUrl,
      shopProductUrl: video.shopProductUrl,
      mentions: {
        create: video.mentions.map((mention) => ({ mention })),
      },
      hashtags: {
        create: video.hashtags.map((hashtag) => ({ hashtag })),
      },
      stats: {
        create: {
          likes: video.stats.likes,
          comments: video.stats.comments,
          shares: video.stats.shares,
          views: video.stats.views,
        },
      },
    },
  });
}
