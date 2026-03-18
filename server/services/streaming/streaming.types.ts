import type { SearchResultItem, SearchSummary } from '../../lib/response'

// SSE Event Types for streaming search results
export type StreamEventInit = {
  type: 'init'
  searchId: string
}

export type StreamEventVideo = {
  type: 'video'
  data: SearchResultItem
}

export type StreamEventProgress = {
  type: 'progress'
  total: number
  completed: number
}

export type StreamEventComplete = {
  type: 'complete'
  summary: SearchSummary
}

export type StreamEventError = {
  type: 'error'
  videoId?: string
  message: string
}

export type StreamEvent =
  | StreamEventInit
  | StreamEventVideo
  | StreamEventProgress
  | StreamEventComplete
  | StreamEventError
