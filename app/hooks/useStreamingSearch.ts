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

export type VideoError = {
  videoId: string
  message: string
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
  const [videoErrors, setVideoErrors] = useState<VideoError[]>([])
  const [query, setQuery] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const searchIdRef = useRef<string | null>(null)

  // Stable reference to options callbacks to avoid stale closures in async code
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

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
    searchIdRef.current = null
    setError(null)
    setVideoErrors([])
    setQuery(null)
  }, [])

  const handleEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case 'init':
          setSearchId(event.searchId)
          searchIdRef.current = event.searchId
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
          if (searchIdRef.current) {
            // Use ref to always call the latest callback
            optionsRef.current?.onComplete?.(searchIdRef.current)
          }
          break

        case 'error':
          if (!event.videoId) {
            // Fatal error - stop the stream
            setError(new Error(event.message))
            setIsPending(false)
            optionsRef.current?.onError?.(new Error(event.message))
          } else {
            // Non-fatal error - track it but continue
            setVideoErrors((prev) => [...prev, { videoId: event.videoId!, message: event.message }])
          }
          break
      }
    },
    [] // No dependencies needed - uses refs for callbacks
  )

  const startSearch = useCallback(
    async (searchTerm: string, mode: StreamingSearchMode) => {
      // Abort any existing search
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      // Reset state for new search
      reset()
      setIsPending(true)
      setQuery(searchTerm)

      // Always connect directly to API server for streaming to avoid proxy buffering
      // In production, use relative URL; in dev, bypass Vite's proxy
      const isLocalDev =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        window.location.port !== '8080' // Not already on API server
      const apiBase = isLocalDev ? 'http://localhost:8080' : ''
      const endpoint =
        mode === 'brand'
          ? `${apiBase}/api/brand-explorer/stream`
          : `${apiBase}/api/search/stream`

      console.log('[SSE] Config:', { isLocalDev, apiBase, endpoint, hostname: window?.location?.hostname, port: window?.location?.port })

      try {
        console.log('[SSE] Making fetch request to:', endpoint)
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

        console.log('[SSE] Fetch response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

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
          optionsRef.current?.onComplete?.(data.searchId)
          return
        }

        // Handle SSE stream
        const contentTypeForSSE = response.headers.get('content-type')
        console.log('[SSE] Content-Type:', contentTypeForSSE)
        console.log('[SSE] Response status:', response.status)

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let eventCount = 0

        console.log('[SSE] Starting to read stream...')

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log('[SSE] Stream done. Total events processed:', eventCount)
            // Process any remaining buffer content
            if (buffer.trim()) {
              console.log('[SSE] Remaining buffer:', buffer)
            }
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          console.log('[SSE] Received chunk (length:', chunk.length, '):', chunk.substring(0, 200))
          buffer += chunk

          // Process complete SSE messages (messages are separated by double newlines)
          // Split on single newlines and process line by line
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue // Skip empty lines

            if (trimmedLine.startsWith('data:')) {
              const data = trimmedLine.slice(5).trim()
              if (data) {
                try {
                  const event: StreamEvent = JSON.parse(data)
                  console.log('[SSE] Parsed event:', event.type, event)
                  handleEvent(event)
                  eventCount++
                } catch (parseError) {
                  console.error('[SSE] Failed to parse event data:', data, parseError)
                }
              }
            }
            // event: lines are informational only, we get type from the JSON data
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Search was cancelled, don't set error
          return
        }

        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        optionsRef.current?.onError?.(error)
      } finally {
        setIsPending(false)
      }
    },
    [reset, handleEvent]
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
    videoErrors,
  }
}
