import { prisma, PLACEHOLDER_USER_ID } from "../../lib/prisma";
import type { KeywordSearchResult, SavedKeywordSearch, KeywordSearchResultResponse } from "./keyword-search-history.types";

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
  results: KeywordSearchResult[]
): Promise<SavedKeywordSearch> {
  const normalizedQuery = query.toLowerCase();

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
      results: {
        create: await Promise.all(
          results.map(async (result, index) => {
            const video = await upsertVideo(result.video);
            await createVideoStats(result.video);

            const isPromotion = result.video.isAd || result.video.isSponsored || (result.classification?.isPromotion ?? false);
            let brand = result.classification?.brand ?? null;
            if (isPromotion && !brand) {
              brand = 'NOT_FOUND';
            }

            return {
              videoId: video.id,
              position: index,
              isPromotion,
              brand,
              confidence: result.classification?.confidence ?? 0,
              signals: result.classification?.signals ?? [],
              tier: result.classification?.tier ?? null,
              error: result.error ?? null,
            };
          })
        ),
      },
    },
    include: {
      _count: {
        select: { results: true },
      },
    },
  });

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    resultCount: search._count.results,
  };
}

export async function refreshKeywordSearch(
  searchId: string,
  results: KeywordSearchResult[]
): Promise<SavedKeywordSearch> {
  // Delete existing results
  await prisma.searchResult.deleteMany({
    where: { searchId },
  });

  // Create new results
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const video = await upsertVideo(result.video);
    await createVideoStats(result.video);

    await prisma.searchResult.create({
      data: {
        searchId,
        videoId: video.id,
        position: index,
        isPromotion: result.classification?.isPromotion ?? false,
        brand: result.classification?.brand ?? null,
        confidence: result.classification?.confidence ?? 0,
        signals: result.classification?.signals ?? [],
        tier: result.classification?.tier ?? null,
        error: result.error ?? null,
      },
    });
  }

  // Update search timestamp
  const search = await prisma.search.update({
    where: { id: searchId },
    data: { updatedAt: new Date() },
    include: {
      _count: {
        select: { results: true },
      },
    },
  });

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    resultCount: search._count.results,
  };
}

export async function getKeywordSearchResults(
  searchId: string
): Promise<KeywordSearchResultResponse[]> {
  const results = await prisma.searchResult.findMany({
    where: { searchId },
    orderBy: { position: "asc" },
    include: {
      video: true,
    },
  });

  return results.map((result) => ({
    position: result.position + 1,
    creator: {
      handle: result.video.creatorHandle,
      followers: result.video.creatorFollowers,
    },
    caption: result.video.caption,
    videoUrl: result.video.videoUrl,
    isPromotion: result.isPromotion,
    isAd: result.video.isAd,
    isSponsored: result.video.isSponsored,
    brand: result.brand,
    confidence: result.confidence,
    signals: result.signals as string[],
    tier: result.tier as 1 | 2 | null,
    error: result.error ?? undefined,
  }));
}

async function upsertVideo(video: KeywordSearchResult["video"]) {
  return prisma.video.upsert({
    where: { id: video.id },
    update: {
      caption: video.caption,
      isAd: video.isAd,
      isSponsored: video.isSponsored,
      creatorHandle: video.creator.handle,
      creatorFollowers: video.creator.followers,
      videoUrl: video.videoUrl,
      shopProductUrl: video.shopProductUrl,
      mentions: {
        deleteMany: {},
        create: video.mentions.map((mention) => ({ mention })),
      },
      hashtags: {
        deleteMany: {},
        create: video.hashtags.map((hashtag) => ({ hashtag })),
      },
    },
    create: {
      id: video.id,
      caption: video.caption,
      isAd: video.isAd,
      isSponsored: video.isSponsored,
      creatorHandle: video.creator.handle,
      creatorFollowers: video.creator.followers,
      videoUrl: video.videoUrl,
      shopProductUrl: video.shopProductUrl,
      mentions: {
        create: video.mentions.map((mention) => ({ mention })),
      },
      hashtags: {
        create: video.hashtags.map((hashtag) => ({ hashtag })),
      },
    },
  });
}

async function createVideoStats(video: KeywordSearchResult["video"]) {
  await prisma.videoStats.create({
    data: {
      videoId: video.id,
      likes: video.stats.likes,
      comments: video.stats.comments,
      shares: video.stats.shares,
      views: video.stats.views,
    },
  });
}
