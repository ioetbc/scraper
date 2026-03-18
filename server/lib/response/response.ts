import type {
  HistorySearchItem,
  HistoryListResponse,
} from "./response.types";

/**
 * Formats the history list response.
 */
export function formatHistoryListResponse(
  searches: HistorySearchItem[]
): HistoryListResponse {
  return { searches };
}
