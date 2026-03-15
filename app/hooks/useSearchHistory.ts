import { useState, useEffect, useCallback } from 'react'
import type { SearchHistoryItem } from '#/types'

const STORAGE_KEY = 'habitz-search-history'
const MAX_HISTORY_ITEMS = 20

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const addToHistory = useCallback((keyword: string, resultCount: number, type: 'query' | 'brand' = 'query') => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.keyword !== keyword || item.type !== type)
      const newHistory = [
        { keyword, timestamp: Date.now(), resultCount, type },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setHistory([])
  }, [])

  const removeFromHistory = useCallback((keyword: string, type: 'query' | 'brand' = 'query') => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => !(item.keyword === keyword && (item.type ?? 'query') === type))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  return { history, addToHistory, clearHistory, removeFromHistory }
}
