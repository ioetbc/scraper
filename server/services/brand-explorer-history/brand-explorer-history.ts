import { prisma, PLACEHOLDER_USER_ID } from "../../lib/prisma";
import type { BrandExplorerResult } from "../brand-explorer";
import type { SavedBrandExplorerSearch } from "./brand-explorer-history.types";

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

export async function saveBrandExplorerSearch(
  handle: string,
  result: BrandExplorerResult
): Promise<SavedBrandExplorerSearch> {
  const normalizedQuery = handle.toLowerCase();

  // Upsert all videos first
  for (const video of result.videos) {
    await prisma.video.upsert({
      where: { id: video.id },
      update: {
        caption: video.caption,
        creatorHandle: video.creator.handle,
        creatorFollowers: video.creator.followers,
        videoUrl: video.videoUrl,
      },
      create: {
        id: video.id,
        caption: video.caption,
        isAd: false,
        isSponsored: false,
        creatorHandle: video.creator.handle,
        creatorFollowers: video.creator.followers,
        videoUrl: video.videoUrl,
      },
    });

    // Create stats snapshot
    await prisma.videoStats.create({
      data: {
        videoId: video.id,
        views: video.views,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
  }

  // Create search with summary and influencers
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
      summary: {
        create: {
          totalVideos: result.summary.totalVideos,
          totalInfluencers: result.summary.totalInfluencers,
          totalReach: result.summary.totalReach,
          videos: {
            connect: result.videos.map((v) => ({ id: v.id })),
          },
        },
      },
    },
    include: {
      summary: true,
    },
  });

  // Create influencers with their video connections
  for (const influencer of result.influencers) {
    const influencerVideoIds = result.videos
      .filter((v) => v.creator.handle === influencer.handle)
      .map((v) => ({ id: v.id }));

    await prisma.brandExplorerInfluencer.create({
      data: {
        searchId: search.id,
        summaryId: search.summary!.id,
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

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    summary: {
      totalVideos: search.summary!.totalVideos,
      totalInfluencers: search.summary!.totalInfluencers,
      totalReach: search.summary!.totalReach,
    },
  };
}

export async function refreshBrandExplorerSearch(
  searchId: string,
  result: BrandExplorerResult
): Promise<SavedBrandExplorerSearch> {
  // Delete existing summary and influencers (cascade will handle related records)
  await prisma.brandExplorerInfluencer.deleteMany({
    where: { searchId },
  });
  await prisma.brandExplorerSummary.deleteMany({
    where: { searchId },
  });

  // Upsert all videos
  for (const video of result.videos) {
    await prisma.video.upsert({
      where: { id: video.id },
      update: {
        caption: video.caption,
        creatorHandle: video.creator.handle,
        creatorFollowers: video.creator.followers,
        videoUrl: video.videoUrl,
      },
      create: {
        id: video.id,
        caption: video.caption,
        isAd: false,
        isSponsored: false,
        creatorHandle: video.creator.handle,
        creatorFollowers: video.creator.followers,
        videoUrl: video.videoUrl,
      },
    });

    // Create stats snapshot
    await prisma.videoStats.create({
      data: {
        videoId: video.id,
        views: video.views,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
  }

  // Create new summary
  const summary = await prisma.brandExplorerSummary.create({
    data: {
      searchId,
      totalVideos: result.summary.totalVideos,
      totalInfluencers: result.summary.totalInfluencers,
      totalReach: result.summary.totalReach,
      videos: {
        connect: result.videos.map((v) => ({ id: v.id })),
      },
    },
  });

  // Create influencers
  for (const influencer of result.influencers) {
    const influencerVideoIds = result.videos
      .filter((v) => v.creator.handle === influencer.handle)
      .map((v) => ({ id: v.id }));

    await prisma.brandExplorerInfluencer.create({
      data: {
        searchId,
        summaryId: summary.id,
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

  // Update search timestamp
  const search = await prisma.search.update({
    where: { id: searchId },
    data: { updatedAt: new Date() },
    include: {
      summary: true,
    },
  });

  return {
    id: search.id,
    query: search.query,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    summary: {
      totalVideos: search.summary!.totalVideos,
      totalInfluencers: search.summary!.totalInfluencers,
      totalReach: search.summary!.totalReach,
    },
  };
}

export async function getBrandExplorerResults(
  searchId: string
): Promise<BrandExplorerResult | null> {
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
          influencers: {
            include: {
              videos: true,
            },
          },
        },
      },
    },
  });

  if (!search || !search.summary) return null;

  return {
    brand: search.query,
    summary: {
      totalVideos: search.summary.totalVideos,
      totalInfluencers: search.summary.totalInfluencers,
      totalReach: search.summary.totalReach,
    },
    influencers: search.summary.influencers.map((inf) => ({
      handle: inf.handle,
      followers: inf.followers,
      videosForBrand: inf.videoCount,
      totalViews: inf.totalViews,
    })),
    videos: search.summary.videos.map((video) => ({
      id: video.id,
      creator: {
        handle: video.creatorHandle,
        followers: video.creatorFollowers,
      },
      caption: video.caption,
      views: video.stats[0]?.views ?? 0,
      videoUrl: video.videoUrl,
      confidence: 0, // Not stored, would need SearchResult for this
    })),
  };
}
