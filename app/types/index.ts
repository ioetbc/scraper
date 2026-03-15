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
  summary: {
    totalVideos: number
    totalInfluencers: number
    totalReach: number
  }
  influencers: BrandExplorerInfluencer[]
  videos: BrandExplorerVideo[]
}
