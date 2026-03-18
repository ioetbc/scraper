import {useMemo} from "react";
import type {
  SearchResultItem,
  ContentPatternsData,
  OpportunitySignalsData,
  SuggestedAction,
} from "#/types";
import {useInsights} from "#/hooks/useInsights";

export type ViewMode = "results" | "insights";

type InsightsPanelProps = {
  data: SearchResultItem[];
  keyword: string | null;
  searchId: string | null;
  isLoading?: boolean;
  progress?: {total: number; completed: number} | null;
};

const MIN_RESULTS_FOR_LLM = 3;

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
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[100px]">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Market Snapshot
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

function BrandBreakdown({
  brands,
  isLoading,
}: {
  brands: BrandBreakdownItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[180px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Brand Breakdown
        </h3>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{width: `${40 + i * 10}%`}}
              />
              <div className="flex items-center gap-2">
                <div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[180px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Brand Breakdown
        </h3>
        <p className="text-xs text-gray-500">No brands detected yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[180px]">
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
  isLoading,
}: {
  topByReach: InfluencerItem[];
  likelySponsored: InfluencerItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[240px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Influencer Clusters
        </h3>
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            Top by Reach
          </h4>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{width: `${50 + i * 10}%`}}
                />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            Likely Sponsored
          </h4>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{width: `${40 + i * 15}%`}}
                />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = topByReach.length === 0;

  if (hasNoData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[240px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Influencer Clusters
        </h3>
        <p className="text-xs text-gray-500">No creators found yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[240px]">
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

function ContentPatterns({
  data,
  isLoading,
  error,
  onRetry,
}: {
  data: ContentPatternsData | null;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2 min-h-[140px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Content Patterns
        </h3>
        <div className="text-center py-4">
          <p className="text-xs text-red-600 mb-2">{error.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2 min-h-[140px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Content Patterns
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Themes</h4>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{width: `${60 + i * 10}%`}}
                />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Hooks</h4>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{width: `${70 + i * 8}%`}}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2 min-h-[140px]">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Content Patterns
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">Themes</h4>
          <ul className="space-y-1">
            {data.themes.map((theme, i) => (
              <li key={i} className="text-sm text-gray-700">
                {theme}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">Hooks</h4>
          <ul className="space-y-1">
            {data.hooks.map((hook, i) => (
              <li key={i} className="text-sm text-gray-700 italic">
                "{hook}"
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OpportunitySignals({
  data,
  isLoading,
}: {
  data: OpportunitySignalsData | null;
  isLoading: boolean;
}) {
  if (isLoading || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Opportunity Signals
        </h3>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{width: `${50 + i * 15}%`}}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const saturationColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px]">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Opportunity Signals
      </h3>

      {/* Saturation Level */}
      <div className="mb-4">
        <span className="text-xs text-gray-500">Market Saturation: </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${saturationColors[data.saturationLevel]}`}
        >
          {data.saturationLevel.charAt(0).toUpperCase() +
            data.saturationLevel.slice(1)}
        </span>
      </div>

      {/* Market Gaps */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2">Market Gaps</h4>
        <ul className="space-y-1">
          {data.marketGaps.map((gap, i) => (
            <li key={i} className="text-sm text-gray-700">
              {gap}
            </li>
          ))}
        </ul>
      </div>

      {/* Emerging Opportunities */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">
          Emerging Opportunities
        </h4>
        <ul className="space-y-1">
          {data.emergingOpportunities.map((opp, i) => (
            <li key={i} className="text-sm text-gray-700">
              {opp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SuggestedActions({
  actions,
  isLoading,
}: {
  actions: SuggestedAction[] | null;
  isLoading: boolean;
}) {
  if (isLoading || !actions) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2 min-h-[160px]">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Suggested Actions
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{width: `${60 + i * 10}%`}}
              />
              <div
                className="h-3 bg-gray-100 rounded animate-pulse"
                style={{width: `${70 + i * 8}%`}}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2 min-h-[160px]">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Suggested Actions
      </h3>
      <div className="space-y-3">
        {actions.map((action, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-3">
            <div className="flex items-start gap-2">
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${priorityColors[action.priority]}`}
              >
                {action.priority}
              </span>
              <p className="text-sm text-gray-900">{action.action}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-12">
              {action.rationale}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsPanel({
  data,
  keyword,
  searchId,
  isLoading,
  progress,
}: InsightsPanelProps) {
  const snapshot = useMemo(() => computeMarketSnapshot(data), [data]);
  const brandBreakdown = useMemo(() => computeBrandBreakdown(data), [data]);
  const influencerClusters = useMemo(
    () => computeInfluencerClusters(data),
    [data],
  );

  // Only fetch LLM insights after streaming completes and we have enough data
  const shouldFetchInsights =
    !isLoading && data.length >= MIN_RESULTS_FOR_LLM && searchId !== null;

  const {
    data: insights,
    isLoading: isInsightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useInsights(searchId, shouldFetchInsights);

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
        {/* Market Snapshot Block - spans full width */}
        <div className="md:col-span-2">
          <MarketSnapshot
            data={snapshot}
            isLoading={isLoading && data.length === 0}
          />
        </div>

        {/* Brand Breakdown Block */}
        <BrandBreakdown brands={brandBreakdown} isLoading={isLoading} />

        {/* Influencer Clusters Block */}
        <InfluencerClusters
          topByReach={influencerClusters.topByReach}
          likelySponsored={influencerClusters.likelySponsored}
          isLoading={isLoading}
        />

        {/* LLM-powered blocks - only shown after streaming completes */}
        {shouldFetchInsights ? (
          <>
            {/* Content Patterns Block */}
            <ContentPatterns
              data={insights?.contentPatterns ?? null}
              isLoading={isInsightsLoading}
              error={insightsError}
              onRetry={() => refetchInsights()}
            />

            {/* Opportunity Signals Block */}
            <OpportunitySignals
              data={insights?.opportunitySignals ?? null}
              isLoading={isInsightsLoading}
            />

            {/* Suggested Actions Block - spans full width */}
            <SuggestedActions
              actions={insights?.suggestedActions ?? null}
              isLoading={isInsightsLoading}
            />
          </>
        ) : !isLoading && data.length > 0 && data.length < MIN_RESULTS_FOR_LLM ? (
          /* Insufficient data message */
          <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">
                Need at least {MIN_RESULTS_FOR_LLM} results for AI-powered insights
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Currently analyzing {data.length} video{data.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
