import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { SearchInput, type SearchMode } from '#/components/SearchInput'
import { Sidebar } from '#/components/Sidebar'
import { DataGrid } from '#/components/DataGrid'
import { FilterTabs } from '#/components/FilterTabs'
import { useSearchHistory } from '#/hooks/useSearchHistory'
import { useSearchMutation } from '#/hooks/useSearchMutation'
import { useBrandExplorerMutation } from '#/hooks/useBrandExplorerMutation'
import type { SearchResult, BrandExplorerResponse } from '#/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function transformBrandResults(data: BrandExplorerResponse): SearchResult[] {
  return data.videos.map((video, index) => ({
    position: index + 1,
    creator: {
      handle: video.creator.handle,
      followers: video.creator.followers,
    },
    caption: video.caption,
    videoUrl: video.videoUrl,
    isPromotion: true,
    isAd: false,
    isSponsored: false,
    brand: data.brand,
    confidence: video.confidence,
    signals: [`${video.views.toLocaleString()} views`],
    tier: 1,
  }))
}

function HomePage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchMode, setSearchMode] = useState<SearchMode>('query')
  const [currentSearch, setCurrentSearch] = useState<{ keyword: string; type: SearchMode } | null>(null)
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory()

  const {
    mutate: search,
    data: searchData,
    isPending: isSearchPending,
    error: searchError,
  } = useSearchMutation({
    onSuccess: (result, keyword) => {
      addToHistory(keyword, result.results.length, 'query')
      setCurrentSearch({ keyword, type: 'query' })
    },
  })

  const {
    mutate: exploreBrand,
    data: brandData,
    isPending: isBrandPending,
    error: brandError,
  } = useBrandExplorerMutation({
    onSuccess: (result, handle) => {
      addToHistory(handle, result.summary.totalVideos, 'brand')
      setCurrentSearch({ keyword: handle, type: 'brand' })
    },
  })

  const isPending = isSearchPending || isBrandPending
  const error = searchError || brandError

  const results = useMemo(() => {
    if (currentSearch?.type === 'brand' && brandData) {
      return transformBrandResults(brandData)
    }
    return searchData?.results ?? []
  }, [currentSearch, brandData, searchData])

  const keyword = currentSearch?.keyword ?? null

  const handleSearch = (searchTerm: string, mode: SearchMode) => {
    setActiveFilter('all')
    setSearchMode(mode)
    if (mode === 'brand') {
      exploreBrand(searchTerm)
    } else {
      search(searchTerm)
    }
  }

  const handleSelectFromHistory = (term: string, type: 'query' | 'brand') => {
    setSearchMode(type)
    handleSearch(term, type)
  }

  const filteredResults = useMemo(() => {
    switch (activeFilter) {
      case 'promotions':
        return results.filter((r) => r.isPromotion)
      case 'highConfidence':
        return results.filter((r) => r.confidence >= 0.8)
      case 'tier1':
        return results.filter((r) => r.tier === 1)
      default:
        return results
    }
  }, [results, activeFilter])

  const resultCounts = useMemo(
    () => ({
      all: results.length,
      promotions: results.filter((r) => r.isPromotion).length,
      highConfidence: results.filter((r) => r.confidence >= 0.8).length,
      tier1: results.filter((r) => r.tier === 1).length,
    }),
    [results]
  )

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        history={history}
        onSelectSearch={handleSelectFromHistory}
        onRemoveItem={removeFromHistory}
        onClearHistory={clearHistory}
        currentKeyword={keyword}
        currentType={currentSearch?.type ?? null}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-4 border-b border-gray-200">
          <div className="max-w-2xl">
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              TikTok Brand Detection
            </h1>
            <SearchInput
              onSearch={handleSearch}
              isLoading={isPending}
              mode={searchMode}
              onModeChange={setSearchMode}
            />
          </div>
        </header>

        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error instanceof Error ? error.message : 'Search failed'}
          </div>
        )}

        {results.length > 0 && (
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            resultCounts={resultCounts}
          />
        )}

        <div className="flex-1 overflow-hidden">
          <DataGrid data={filteredResults} keyword={keyword} />
        </div>
      </main>
    </div>
  )
}
