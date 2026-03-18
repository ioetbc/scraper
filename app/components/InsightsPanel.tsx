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

type BrandBreakdownItem = {
  brand: string;
  count: number;
  percentage: number;
};

type InfluencerItem = {
  handle: string;
  followers: number;
  brand: string | null;
  avatarUrl: string | null;
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

function computeBrandBreakdown(results: SearchResultItem[]): BrandBreakdownItem[] {
  const brandCounts = new Map<string, number>();

  results.forEach((r) => {
    if (r.brand) {
      const brandLower = r.brand.toLowerCase();
      brandCounts.set(brandLower, (brandCounts.get(brandLower) ?? 0) + 1);
    }
  });

  const totalWithBrands = Array.from(brandCounts.values()).reduce(
    (sum, c) => sum + c,
    0,
  );

  return Array.from(brandCounts.entries())
    .map(([brand, count]) => ({
      brand,
      count,
      percentage: totalWithBrands > 0 ? (count / totalWithBrands) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function computeInfluencerClusters(results: SearchResultItem[]): {
  topByReach: InfluencerItem[];
  likelySponsored: InfluencerItem[];
} {
  // Build unique creator map with highest follower count and brand association
  const creatorMap = new Map<
    string,
    {followers: number; brand: string | null; avatarUrl: string | null}
  >();

  results.forEach((r) => {
    const handle = r.creator.handle.toLowerCase();
    const existing = creatorMap.get(handle);

    if (!existing || r.creator.followers > existing.followers) {
      creatorMap.set(handle, {
        followers: r.creator.followers,
        brand: r.brand ?? existing?.brand ?? null,
        avatarUrl: r.creator.avatarUrl ?? existing?.avatarUrl ?? null,
      });
    } else if (r.brand && !existing.brand) {
      // Keep higher followers but update brand if we found one
      creatorMap.set(handle, {...existing, brand: r.brand});
    }
  });

  const allCreators: InfluencerItem[] = Array.from(creatorMap.entries()).map(
    ([handle, data]) => ({
      handle,
      followers: data.followers,
      brand: data.brand,
      avatarUrl: data.avatarUrl,
    }),
  );

  // Top by reach: sorted by followers, take top 5
  const topByReach = [...allCreators]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 5);

  // Likely sponsored: creators with brand associations, sorted by followers
  const likelySponsored = allCreators
    .filter((c) => c.brand !== null)
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 5);

  return {topByReach, likelySponsored};
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

function BrandBreakdown({brands}: {brands: BrandBreakdownItem[]}) {
  if (brands.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Brand Breakdown
        </h3>
        <p className="text-xs text-gray-500">No brands detected yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Brand Breakdown
      </h3>
      <div className="space-y-2">
        {brands.slice(0, 8).map((item) => (
          <div key={item.brand} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 capitalize truncate flex-1">
              {item.brand}
            </span>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm font-medium text-gray-900">
                {item.count}
              </span>
              <span className="text-xs text-gray-500 w-12 text-right">
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfluencerClusters({
  topByReach,
  likelySponsored,
}: {
  topByReach: InfluencerItem[];
  likelySponsored: InfluencerItem[];
}) {
  const hasNoData = topByReach.length === 0;

  if (hasNoData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Influencer Clusters
        </h3>
        <p className="text-xs text-gray-500">No creators found yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Influencer Clusters
      </h3>

      {/* Top by Reach */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2">
          Top by Reach
        </h4>
        <div className="space-y-2">
          {topByReach.map((creator) => (
            <div
              key={creator.handle}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-700 truncate flex-1">
                @{creator.handle}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {formatNumber(creator.followers)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Likely Sponsored */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">
          Likely Sponsored
        </h4>
        {likelySponsored.length === 0 ? (
          <p className="text-xs text-gray-400">No sponsored creators detected</p>
        ) : (
          <div className="space-y-2">
            {likelySponsored.map((creator) => (
              <div
                key={creator.handle}
                className="flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate block">
                    @{creator.handle}
                  </span>
                  {creator.brand && (
                    <span className="text-xs text-blue-600 capitalize">
                      {creator.brand}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {formatNumber(creator.followers)}
                </span>
              </div>
            ))}
          </div>
        )}
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
  const brandBreakdown = useMemo(() => computeBrandBreakdown(data), [data]);
  const influencerClusters = useMemo(
    () => computeInfluencerClusters(data),
    [data],
  );

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

      {/* Grid layout for blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Market Snapshot Block */}
        <MarketSnapshot
          data={snapshot}
          isLoading={isLoading && data.length === 0}
        />

        {/* Brand Breakdown Block */}
        <BrandBreakdown brands={brandBreakdown} />

        {/* Influencer Clusters Block */}
        <InfluencerClusters
          topByReach={influencerClusters.topByReach}
          likelySponsored={influencerClusters.likelySponsored}
        />
      </div>

      {/* Phase 3+ will add Content Patterns, Opportunity Signals, Suggested Actions */}
    </div>
  );
}
