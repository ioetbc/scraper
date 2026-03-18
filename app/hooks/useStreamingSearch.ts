import { useState, useCallback, useRef, useEffect } from 'react'
import type { SearchResultItem, SearchSummary, SearchResponse } from '#/types'

// SSE Event types (matching server types)
type StreamEventInit = {
  type: 'init'
  searchId: string
}

type StreamEventVideo = {
  type: 'video'
  data: SearchResultItem
}

type StreamEventProgress = {
  type: 'progress'
  total: number
  completed: number
}

type StreamEventComplete = {
  type: 'complete'
  summary: SearchSummary
}

type StreamEventError = {
  type: 'error'
  videoId?: string
  message: string
}

type StreamEvent =
  | StreamEventInit
  | StreamEventVideo
  | StreamEventProgress
  | StreamEventComplete
  | StreamEventError

export type StreamingSearchMode = 'brand' | 'keyword'

export type StreamingProgress = {
  total: number
  completed: number
}

type UseStreamingSearchOptions = {
  onComplete?: (searchId: string) => void
  onError?: (error: Error) => void
}

export function useStreamingSearch(options?: UseStreamingSearchOptions) {
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [progress, setProgress] = useState<StreamingProgress | null>(null)
  const [summary, setSummary] = useState<SearchSummary | null>(null)
  const [searchId, setSearchId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [query, setQuery] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const reset = useCallback(() => {
    setResults([])
    setProgress(null)
    setSummary(null)
    setSearchId(null)
    setError(null)
    setQuery(null)
  }, [])

  const startSearch = useCallback(
    async (searchTerm: string, mode: StreamingSearchMode) => {
      // Abort any existing search
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      // Reset state for new search
      reset()
      setIsPending(true)
      setQuery(searchTerm)

      const endpoint =
        mode === 'brand'
          ? '/api/brand-explorer/stream'
          : '/api/search/stream'

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            mode === 'brand' ? { handle: searchTerm } : { keyword: searchTerm }
          ),
          signal: abortControllerRef.current.signal,
        })

        // Check if we got a cached JSON response instead of SSE stream
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const data: SearchResponse = await response.json()

          if ('error' in data) {
            throw new Error((data as { error: string }).error)
          }

          // Set all data at once for cached response
          setSearchId(data.searchId)
          setResults(data.results)
          setSummary(data.summary)
          setProgress({ total: data.results.length, completed: data.results.length })
          setIsPending(false)
          options?.onComplete?.(data.searchId)
          return
        }

        // Handle SSE stream
        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE messages
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event:')) {
              // Event type is embedded in the data JSON, so we don't need to track it separately
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data) {
                try {
                  const event: StreamEvent = JSON.parse(data)
                  handleEvent(event)
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Search was cancelled, don't set error
          return
        }

        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        options?.onError?.(error)
      } finally {
        setIsPending(false)
      }
    },
    [options, reset]
  )

  const handleEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case 'init':
          setSearchId(event.searchId)
          break

        case 'video':
          setResults((prev) => [...prev, event.data])
          break

        case 'progress':
          setProgress({ total: event.total, completed: event.completed })
          break

        case 'complete':
          setSummary(event.summary)
          setIsPending(false)
          if (searchId) {
            options?.onComplete?.(searchId)
          }
          break

        case 'error':
          if (!event.videoId) {
            // Fatal error
            setError(new Error(event.message))
            setIsPending(false)
          }
          // Non-fatal errors (individual video failures) are logged but don't stop the stream
          break
      }
    },
    [options, searchId]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsPending(false)
  }, [])

  return {
    // Actions
    startSearch,
    cancel,
    reset,

    // State
    results,
    progress,
    summary,
    searchId,
    query,
    isPending,
    error,
  }
}
