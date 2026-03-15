export type Creator = {
  handle: string
  followers: number
}

export type SearchResult = {
  position: number
  creator: Creator
  caption: string
  videoUrl: string
  isPromotion: boolean
  isAd: boolean
  isSponsored: boolean
  brand: string | null
  confidence: number
  signals: string[]
  tier: 1 | 2 | null
  error?: string
}

export type SearchResponse = {
  keyword: string
  searchId: string
  cached: boolean
  results: SearchResult[]
}

export type SearchHistoryItem = {
  keyword: string
  timestamp: number
  resultCount: number
  type: 'query' | 'brand'
}

export type BrandExplorerVideo = {
  id: string
  creator: { handle: string; followers: number }
  caption: string
  views: number
  videoUrl: string
  confidence: number
}

export type BrandExplorerInfluencer = {
  handle: string
  followers: number
  videosForBrand: number
  totalViews: number
}

export type BrandExplorerResponse = {
  brand: string
  searchId: string
  cached: boolean
  summary: {
    totalVideos: number
    totalInfluencers: number
    totalReach: number
  }
  influencers: BrandExplorerInfluencer[]
  videos: BrandExplorerVideo[]
}

export type HistorySearchItem = {
  id: string
  type: 'keyword' | 'brand_explorer'
  query: string
  createdAt: string
  updatedAt: string
  resultCount: number
  summary: {
    totalVideos: number
    totalInfluencers: number
    totalReach: number
  } | null
}

export type HistoryResponse = {
  searches: HistorySearchItem[]
}
