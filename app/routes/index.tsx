import {createFileRoute} from "@tanstack/react-router";
import {useState, useMemo, useEffect} from "react";
import {useQueryClient} from "@tanstack/react-query";
import type {SearchMode} from "#/components/SearchInput";
import {SearchInput} from "#/components/SearchInput";
import {Sidebar} from "#/components/Sidebar";
import {DataGrid} from "#/components/DataGrid";
import {useHistoryQuery} from "#/hooks/useHistoryQuery";
import {useHistoryDetailQuery} from "#/hooks/useHistoryDetailQuery";
import {useSearchMutation} from "#/hooks/useSearchMutation";
import {useStreamingSearch} from "#/hooks/useStreamingSearch";
import {useDeleteSearchMutation} from "#/hooks/useDeleteSearchMutation";
import type {SearchResultItem, HistorySearchItem} from "#/types";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const [searchMode, setSearchMode] = useState<SearchMode>("query");
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [currentSearchType, setCurrentSearchType] = useState<
    "keyword" | "brand_explorer" | null
  >(null);
  const [pendingSearch, setPendingSearch] = useState<{
    query: string;
    type: "keyword" | "brand_explorer";
  } | null>(null);

  // Fetch history from API
  const {data: historyData, isLoading: isHistoryLoading} = useHistoryQuery();
  const history = historyData?.searches ?? [];

  // Fetch results for selected search
  const {data: historyDetail, isLoading: isDetailLoading} =
    useHistoryDetailQuery(currentSearchId);

  const {
    mutate: search,
    data: searchData,
    isPending: isSearchPending,
    error: searchError,
  } = useSearchMutation({
    onSuccess: (result) => {
      // Invalidate history to refresh the list
      queryClient.invalidateQueries({queryKey: ["history"]});
      setCurrentSearchId(result.searchId);
      setCurrentSearchType("keyword");
      setPendingSearch(null);
    },
    onError: () => {
      setPendingSearch(null);
    },
  });

  // Streaming brand explorer
  const {
    startSearch: startBrandSearch,
    results: streamingResults,
    progress: streamingProgress,
    searchId: streamingSearchId,
    isPending: isBrandPending,
    error: brandError,
  } = useStreamingSearch({
    onComplete: (searchId) => {
      // Invalidate history to refresh the list
      queryClient.invalidateQueries({queryKey: ["history"]});
      setCurrentSearchId(searchId);
      setCurrentSearchType("brand_explorer");
      setPendingSearch(null);
    },
    onError: () => {
      setPendingSearch(null);
    },
  });

  // Update currentSearchId when streaming searchId becomes available
  useEffect(() => {
    if (streamingSearchId && currentSearchId === "pending") {
      setCurrentSearchId(streamingSearchId);
    }
  }, [streamingSearchId, currentSearchId]);

  const {mutate: deleteSearch} = useDeleteSearchMutation({
    onSuccess: (deletedId) => {
      // Clear selection if we deleted the currently selected search
      if (currentSearchId === deletedId) {
        setCurrentSearchId(null);
        setCurrentSearchType(null);
      }
    },
  });

  const isPending = isSearchPending || isBrandPending || isDetailLoading;
  const error = searchError || brandError;

  // Create optimistic history list with pending search at top
  const displayHistory: HistorySearchItem[] = useMemo(() => {
    if (pendingSearch) {
      const pendingItem: HistorySearchItem = {
        id: "pending",
        type: pendingSearch.type,
        query: pendingSearch.query,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resultCount: 0,
        summary: null,
      };
      return [pendingItem, ...history];
    }
    return history;
  }, [pendingSearch, history]);

  // Get current search query for display
  const currentSearch = displayHistory.find((s) => s.id === currentSearchId);
  const keyword = currentSearch?.query ?? pendingSearch?.query ?? null;

  const results: SearchResultItem[] = useMemo(() => {
    // If we're streaming brand explorer results, use those
    if (currentSearchType === "brand_explorer" && streamingResults.length > 0) {
      return streamingResults;
    }
    if (currentSearchType === "keyword" && searchData) {
      return searchData.results;
    }

    // Otherwise, use data from history detail query
    if (historyDetail) {
      return historyDetail.results;
    }

    return [];
  }, [currentSearchType, streamingResults, searchData, historyDetail]);

  const handleSearch = (searchTerm: string, mode: SearchMode) => {
    const searchType = mode === "brand" ? "brand_explorer" : "keyword";
    setSearchMode(mode);
    // Set pending search and select it immediately
    setPendingSearch({query: searchTerm, type: searchType});
    setCurrentSearchId("pending");
    setCurrentSearchType(searchType);
    if (mode === "brand") {
      startBrandSearch(searchTerm, "brand");
    } else {
      search(searchTerm);
    }
  };

  const handleSelectFromHistory = (searchId: string) => {
    const selectedSearch = history.find((s) => s.id === searchId);
    if (selectedSearch) {
      setSearchMode(
        selectedSearch.type === "brand_explorer" ? "brand" : "query",
      );
      setCurrentSearchId(searchId);
      setCurrentSearchType(selectedSearch.type);
    }
  };

  const handleDeleteSearch = (searchId: string) => {
    deleteSearch(searchId);
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        history={displayHistory}
        isLoading={isHistoryLoading}
        onSelectSearch={handleSelectFromHistory}
        onDeleteSearch={handleDeleteSearch}
        currentSearchId={currentSearchId}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-6">
          <h1 className="text-sm font-semibold text-gray-800 m-0 whitespace-nowrap">
            Habitz
          </h1>
          <SearchInput
            onSearch={handleSearch}
            isLoading={isPending}
            mode={searchMode}
            onModeChange={setSearchMode}
          />
        </header>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs">
            Error: {error instanceof Error ? error.message : "Search failed"}
          </div>
        )}

        {/* Data grid */}
        <div className="flex-1 overflow-hidden">
          <DataGrid
            data={results}
            keyword={keyword}
            isLoading={isSearchPending || isBrandPending}
            progress={streamingProgress}
          />
        </div>
      </main>
    </div>
  );
}
