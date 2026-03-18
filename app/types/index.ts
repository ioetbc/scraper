export type Creator = {
  handle: string
  followers: number
  avatarUrl: string | null
}

// Unified result item for both keyword search and brand explorer
export type SearchResultItem = {
  position: number
  creator: Creator
  caption: string
  videoUrl: string
  views: number
  isPromotion: boolean
  isAd: boolean
  isSponsored: boolean
  brand: string | null
  confidence: number
  signals: string[]
  tier: 1 | 2 | null
  error?: string
}

// Summary stats for search results
export type SearchSummary = {
  totalVideos: number
  totalInfluencers: number
  totalReach: number
}

// Unified search response for both keyword and brand explorer
export type SearchResponse = {
  query: string
  searchId: string
  cached: boolean
  summary: SearchSummary
  results: SearchResultItem[]
}

export type HistorySearchItem = {
  id: string
  type: 'keyword' | 'brand_explorer'
  query: string
  createdAt: string
  updatedAt: string
  resultCount: number
  summary: SearchSummary | null
}

export type HistoryResponse = {
  searches: HistorySearchItem[]
}
