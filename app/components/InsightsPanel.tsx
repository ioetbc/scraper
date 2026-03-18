import {useMemo} from "react";
import type {SearchResultItem} from "#/types";

export type ViewMode = "results" | "insights";

type InsightsPanelProps = {
  data: SearchResultItem[];
  keyword: string | null;
  isLoading?: boolean;
  progress?: {total: number; completed: number} | null;
};

type MarketSnapshotData = {
  activeBrands: number;
  totalCreators: number;
  sponsoredPosts: number;
  sponsoredPercentage: number;
  estimatedReach: {min: number; max: number};
};

function computeMarketSnapshot(results: SearchResultItem[]): MarketSnapshotData {
  // Unique brands (non-null brand values)
  const brands = new Set<string>();
  results.forEach((r) => {
    if (r.brand) {
      brands.add(r.brand.toLowerCase());
    }
  });

  // Unique creators by handle
  const creators = new Set<string>();
  results.forEach((r) => {
    creators.add(r.creator.handle.toLowerCase());
  });

  // Sponsored posts (isSponsored OR isAd)
  const sponsoredPosts = results.filter((r) => r.isSponsored || r.isAd).length;
  const sponsoredPercentage =
    results.length > 0 ? (sponsoredPosts / results.length) * 100 : 0;

  // Estimated reach - sum of unique creator followers
  const creatorFollowers = new Map<string, number>();
  results.forEach((r) => {
    const handle = r.creator.handle.toLowerCase();
    // Keep highest follower count if same creator appears multiple times
    const existing = creatorFollowers.get(handle) ?? 0;
    if (r.creator.followers > existing) {
      creatorFollowers.set(handle, r.creator.followers);
    }
  });

  const totalFollowers = Array.from(creatorFollowers.values()).reduce(
    (sum, f) => sum + f,
    0,
  );

  // Reach range: estimate 5-15% engagement rate
  const minReach = Math.round(totalFollowers * 0.05);
  const maxReach = Math.round(totalFollowers * 0.15);

  return {
    activeBrands: brands.size,
    totalCreators: creators.size,
    sponsoredPosts,
    sponsoredPercentage,
    estimatedReach: {min: minReach, max: maxReach},
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function MarketSnapshot({
  data,
  isLoading,
}: {
  data: MarketSnapshotData;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Market Snapshot
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Active Brands</p>
          <p className="text-xl font-semibold text-gray-900">
            {isLoading ? (
              <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              data.activeBrands
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Total Creators</p>
          <p className="text-xl font-semibold text-gray-900">
            {isLoading ? (
              <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              data.totalCreators
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Sponsored Posts</p>
          <p className="text-xl font-semibold text-gray-900">
            {isLoading ? (
              <span className="inline-block w-12 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                {data.sponsoredPosts}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({data.sponsoredPercentage.toFixed(0)}%)
                </span>
              </>
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Estimated Reach</p>
          <p className="text-xl font-semibold text-gray-900">
            {isLoading ? (
              <span className="inline-block w-16 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                {formatNumber(data.estimatedReach.min)} -{" "}
                {formatNumber(data.estimatedReach.max)}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel({
  data,
  keyword,
  isLoading,
  progress,
}: InsightsPanelProps) {
  const snapshot = useMemo(() => computeMarketSnapshot(data), [data]);

  // Show empty state if no results and not loading
  if (data.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-sm">No data to analyze</p>
          <p className="text-xs mt-1">Run a search to see insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* Info bar */}
      <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
        <div>
          {keyword && (
            <span>
              Insights for <span className="font-medium">{keyword}</span>
            </span>
          )}
        </div>
        <div>
          {isLoading && progress ? (
            <span>
              Analyzing {progress.completed} of {progress.total} videos...
            </span>
          ) : (
            <span>{data.length} videos analyzed</span>
          )}
        </div>
      </div>

      {/* Market Snapshot Block */}
      <MarketSnapshot
        data={snapshot}
        isLoading={isLoading && data.length === 0}
      />

      {/* Placeholder for future blocks */}
      {/* Phase 2 will add Brand Breakdown and Influencer Clusters here */}
      {/* Phase 3+ will add Content Patterns, Opportunity Signals, Suggested Actions */}
    </div>
  );
}
