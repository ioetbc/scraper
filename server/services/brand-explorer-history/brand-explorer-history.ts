import { prisma, PLACEHOLDER_USER_ID } from "../../lib/prisma";
import type { BrandExplorerResult, BrandVideo, BrandInfluencer, ClassifiedVideo } from "../brand-explorer";
import type { SavedBrandExplorerSearch, BrandExplorerData } from "./brand-explorer-history.types";
import type { SearchResultItem, SearchSummary, SearchData } from "../../lib/response";

/**
 * Creates videos for a brand explorer search.
 * Returns a map of tiktokId -> new video id for linking.
 */
async function createBrandExplorerVideos(
  searchId: string,
  videos: BrandVideo[]
): Promise<Map<string, string>> {
  const tiktokIdToVideoId = new Map<string, string>();

  for (const video of videos) {
    const created = await prisma.video.create({
      data: {
        searchId,
        tiktokId: video.id,
        caption: video.caption,
        isAd: false,
        isSponsored: false,
        creatorHandle: video.creator.handle,
        creatorFollowers: video.creator.followers,
        creatorAvatarUrl: video.creator.avatarUrl,
        videoUrl: video.videoUrl,
        stats: {
          create: {
            views: video.views,
            likes: 0,
            comments: 0,
            shares: 0,
          },
        },
      },
    });

    tiktokIdToVideoId.set(video.id, created.id);
  }

  return tiktokIdToVideoId;
}

/**
 * Creates influencer records with video connections.
 */
async function createBrandExplorerInfluencers(
  searchId: string,
  summaryId: string,
  influencers: BrandInfluencer[],
  videos: BrandVideo[],
  tiktokIdToVideoId: Map<string, string>
): Promise<void> {
  for (const influencer of influencers) {
    const influencerVideoIds = videos
      .filter((v) => v.creator.handle === influencer.handle)
      .map((v) => {
        const videoId = tiktokIdToVideoId.get(v.id);
        return videoId ? { id: videoId } : null;
      })
      .filter((v): v is { id: string } => v !== null);

    await prisma.brandExplorerInfluencer.create({
      data: {
        searchId,
        summaryId,
        handle: influencer.handle,
        followers: influencer.followers,
        videoCount: influencer.videosForBrand,
        totalViews: influencer.totalViews,
        totalLikes: 0,
        videos: {
          connect: influencerVideoIds,
        },
      },
    });
  }
}

export async function findBrandExplorerSearch(
  handle: string
): Promise<SavedBrandExplorerSearch | null> {
  const normalizedQuery = handle.toLowerCase();

  const search = await prisma.search.findUnique({
    where: {
      userId_type_query: {
        userId: PLACEHOLDER_USER_ID,
        type: "brand_explorer",
        query: normalizedQuery,
      },
    },
    include: {
      summary: true,
    },
  });

  if (!search || !search.summary) return null;

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    summary: {
      totalVideos: search.summary.totalVideos,
      totalInfluencers: search.summary.totalInfluencers,
      totalReach: search.summary.totalReach,
    },
  };
}

/**
 * Builds SearchResultItem[] from brand explorer videos.
 * Brand explorer videos are promotions by definition (found via brand mention).
 */
function buildBrandExplorerResults(
  query: string,
  videos: BrandVideo[]
): SearchResultItem[] {
  return videos.map((video, index) => ({
    position: index + 1,
    creator: {
      handle: video.creator.handle,
      followers: video.creator.followers,
      avatarUrl: video.creator.avatarUrl,
    },
    caption: video.caption,
    videoUrl: video.videoUrl,
    views: video.views,
    isPromotion: true,
    isAd: false,
    isSponsored: false,
    brand: query,
    confidence: 0.9,
    signals: ["brand_mention"],
    tier: 1 as const,
    error: undefined,
  }));
}

export async function saveBrandExplorerSearch(
  handle: string,
  result: BrandExplorerResult
): Promise<SearchData> {
  const normalizedQuery = handle.toLowerCase();

  // Create the search first
  const search = await prisma.search.create({
    data: {
      user: {
        connectOrCreate: {
          where: { id: PLACEHOLDER_USER_ID },
          create: { id: PLACEHOLDER_USER_ID },
        },
      },
      type: "brand_explorer",
      query: normalizedQuery,
    },
  });

  // Create videos linked to this search
  const tiktokIdToVideoId = await createBrandExplorerVideos(search.id, result.videos);

  // Create summary with video connections
  const summary = await prisma.brandExplorerSummary.create({
    data: {
      searchId: search.id,
      totalVideos: result.summary.totalVideos,
      totalInfluencers: result.summary.totalInfluencers,
      totalReach: result.summary.totalReach,
      videos: {
        connect: result.videos.map((v) => ({ id: tiktokIdToVideoId.get(v.id)! })),
      },
    },
  });

  await createBrandExplorerInfluencers(
    search.id,
    summary.id,
    result.influencers,
    result.videos,
    tiktokIdToVideoId
  );

  return {
    id: search.id,
    query: search.query,
    summary: result.summary,
    results: buildBrandExplorerResults(search.query, result.videos),
  };
}

export async function refreshBrandExplorerSearch(
  searchId: string,
  result: BrandExplorerResult
): Promise<SearchData> {
  // Delete existing data (videos cascade their mentions/hashtags/stats)
  await prisma.brandExplorerInfluencer.deleteMany({
    where: { searchId },
  });
  await prisma.brandExplorerSummary.deleteMany({
    where: { searchId },
  });
  await prisma.video.deleteMany({
    where: { searchId },
  });

  // Create new videos linked to this search
  const tiktokIdToVideoId = await createBrandExplorerVideos(searchId, result.videos);

  // Create summary with video connections
  const summary = await prisma.brandExplorerSummary.create({
    data: {
      searchId,
      totalVideos: result.summary.totalVideos,
      totalInfluencers: result.summary.totalInfluencers,
      totalReach: result.summary.totalReach,
      videos: {
        connect: result.videos.map((v) => ({ id: tiktokIdToVideoId.get(v.id)! })),
      },
    },
  });

  await createBrandExplorerInfluencers(
    searchId,
    summary.id,
    result.influencers,
    result.videos,
    tiktokIdToVideoId
  );

  // Update search timestamp and get query
  const search = await prisma.search.update({
    where: { id: searchId },
    data: { updatedAt: new Date() },
  });

  return {
    id: search.id,
    query: search.query,
    summary: result.summary,
    results: buildBrandExplorerResults(search.query, result.videos),
  };
}

export async function getBrandExplorerData(
  searchId: string
): Promise<BrandExplorerData | null> {
  const search = await prisma.search.findUnique({
    where: { id: searchId },
    include: {
      summary: {
        include: {
          videos: {
            include: {
              stats: {
                orderBy: { recordedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!search || !search.summary) return null;

  const summary: SearchSummary = {
    totalVideos: search.summary.totalVideos,
    totalInfluencers: search.summary.totalInfluencers,
    totalReach: search.summary.totalReach,
  };

  const results: SearchResultItem[] = search.summary.videos.map((video, index) => ({
    position: index + 1,
    creator: {
      handle: video.creatorHandle,
      followers: video.creatorFollowers,
      avatarUrl: video.creatorAvatarUrl,
    },
    caption: video.caption,
    videoUrl: video.videoUrl,
    views: video.stats[0]?.views ?? 0,
    isPromotion: true, // Brand explorer videos are promotions by definition
    isAd: video.isAd,
    isSponsored: video.isSponsored,
    brand: search.query,
    confidence: 0.9, // High confidence since found via brand mention
    signals: ["brand_mention"],
    tier: 1,
    error: undefined,
  }));

  return { summary, results };
}

// ============================================================================
// Streaming-specific functions for incremental DB writes
// ============================================================================

/**
 * Creates a Search record at stream start to get searchId immediately.
 * Returns the searchId for use in subsequent operations.
 */
export async function createBrandExplorerSearchRecord(
  handle: string
): Promise<string> {
  const normalizedQuery = handle.toLowerCase();

  const search = await prisma.search.create({
    data: {
      user: {
        connectOrCreate: {
          where: { id: PLACEHOLDER_USER_ID },
          create: { id: PLACEHOLDER_USER_ID },
        },
      },
      type: "brand_explorer",
      query: normalizedQuery,
    },
  });

  return search.id;
}

/**
 * Saves a single video during streaming.
 * Returns the created video's database ID.
 */
export async function saveStreamingVideo(
  searchId: string,
  video: ClassifiedVideo,
  _position: number
): Promise<string> {
  const created = await prisma.video.create({
    data: {
      searchId,
      tiktokId: video.video.id,
      caption: video.video.caption,
      isAd: false,
      isSponsored: false,
      creatorHandle: video.video.creator.handle,
      creatorFollowers: video.video.creator.followers,
      creatorAvatarUrl: video.video.creator.avatarUrl,
      videoUrl: video.video.videoUrl,
      stats: {
        create: {
          views: video.video.stats.views,
          likes: 0,
          comments: 0,
          shares: 0,
        },
      },
    },
  });

  return created.id;
}

/**
 * Finalizes a streaming search by creating the summary record.
 * Called after all videos have been processed.
 */
export async function finalizeBrandExplorerSearch(
  searchId: string,
  summary: SearchSummary
): Promise<void> {
  // Get all video IDs for this search
  const videos = await prisma.video.findMany({
    where: { searchId },
    select: { id: true },
  });

  // Create the summary with video connections
  await prisma.brandExplorerSummary.create({
    data: {
      searchId,
      totalVideos: summary.totalVideos,
      totalInfluencers: summary.totalInfluencers,
      totalReach: summary.totalReach,
      videos: {
        connect: videos.map((v) => ({ id: v.id })),
      },
    },
  });

  // Update search timestamp
  await prisma.search.update({
    where: { id: searchId },
    data: { updatedAt: new Date() },
  });
}
