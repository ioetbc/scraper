export {
  classifyVideos,
  findKeywordSearch,
  saveKeywordSearch,
  refreshKeywordSearch,
  getKeywordSearchData,
  // Streaming-specific functions
  createKeywordSearchRecord,
  saveStreamingKeywordResult,
  finalizeKeywordSearch,
  classifyVideosStreaming,
} from "./keyword-search-history";

export type {
  KeywordSearchResult,
  SavedKeywordSearch,
  KeywordStreamingCallbacks,
} from "./keyword-search-history.types";
