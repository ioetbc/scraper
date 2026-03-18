# PRD: Streaming Results for Brand Explorer and Keyword Search

**Version:** 1.0
**Date:** March 2026
**Status:** Draft for Review

---

## Problem Statement

Users currently wait 45-90 seconds with no feedback before seeing any search results. The application fetches all videos from Apify (10-30s), classifies each video with an LLM (30-60s), saves everything to the database, and only then returns the complete response. This creates a poor user experience where users stare at a loading state with no indication of progress or partial results.

Users should see results appearing incrementally as they are processed, giving them immediate value and clear progress indication while the full search completes.

---

## Solution

Implement Server-Sent Events (SSE) streaming using Hono's built-in `streamSSE` helper. As each video is classified, it will be:

1. Streamed to the frontend immediately
2. Saved to the database incrementally

The frontend will accumulate results in real-time, showing rows appearing one by one in the data grid. Progress indicators will show how many videos have been processed out of the total. When processing completes, a final summary event will be sent.

Cached results will continue to return instantly via standard JSON response (no streaming overhead for cached data).

---

## User Stories

1. As a brand manager, I want to see search results appear one by one as they're processed, so that I can start reviewing data immediately instead of waiting for the full search to complete.

2. As a user running a brand exploration, I want to see a progress indicator showing "Processing 5 of 30 videos", so that I know the search is making progress and how long I might wait.

3. As a user, I want cached searches to return instantly without streaming overhead, so that repeat searches remain fast.

4. As a user, I want to see the final summary (total videos, influencers, reach) appear when the search completes, so that I have aggregate metrics for my analysis.

5. As a user running a keyword search, I want the same streaming experience as brand exploration, so that both search types feel consistent.

6. As a user, I want searches to continue processing even if one video fails to classify, so that partial failures don't block my results.

7. As a user, I want to see which videos failed to classify (if any), so that I understand if some data is missing.

8. As a user, I want the data grid to update smoothly as new rows arrive, so that the streaming feels responsive and not jarring.

9. As a user, I want to be able to navigate away and come back to see my completed results in history, so that streaming doesn't prevent data persistence.

10. As a user, I want the search to appear in my history sidebar as soon as I start it, so that I can track ongoing searches.

11. As a developer, I want streaming logic encapsulated in reusable modules, so that I can add streaming to new endpoints easily.

12. As a developer, I want typed SSE events, so that frontend and backend stay in sync on event structure.

13. As a user, I want the browser to automatically reconnect if my connection drops mid-stream, so that I don't lose my search progress.

14. As a user, I want to see an error message if the entire search fails (e.g., Apify is down), so that I know to try again later.

15. As a user on a slow connection, I want streaming to work reliably without timeouts, so that long searches complete successfully.

---

## Implementation Decisions

### Streaming Technology

- **Hono's `streamSSE` helper** will be used for Server-Sent Events
- SSE chosen over WebSockets because:
  - One-way server-to-client streaming is all we need
  - Built-in browser reconnection support
  - Simpler implementation with Hono's native helper
  - No need for additional WebSocket infrastructure

### SSE Event Types

Four event types will be streamed:

1. **`video`** - A single classified video result
   - Contains full `SearchResultItem` data
   - Sent immediately after each video is classified and saved

2. **`progress`** - Processing progress update
   - Contains `{ total: number, completed: number }`
   - Sent after each video (alongside the video event)

3. **`complete`** - Search finished successfully
   - Contains `{ summary: Summary, searchId: string }`
   - Sent once after all videos processed

4. **`error`** - Classification failed for a specific video
   - Contains `{ videoId: string, message: string }`
   - Search continues processing other videos (skip and continue)

### Endpoint Design

New streaming endpoints will be added:

- `POST /api/brand-explorer/stream` - Streaming brand exploration
- `POST /api/search/stream` - Streaming keyword search

Existing endpoints remain unchanged for backwards compatibility and cached results.

**Request flow:**

1. Check cache - if cached, return JSON immediately (no streaming)
2. If not cached, create search record first to get `searchId`
3. Stream `searchId` to client immediately
4. Fetch videos from Apify
5. Stream `progress` event with total count
6. For each video: classify, save to DB, stream `video` + `progress` events
7. Stream `complete` event with summary
8. Close SSE connection

### Database Changes

**Incremental write pattern:**

1. Create `Search` record at start (generates `searchId`)
2. Create each `Video` record immediately after classification
3. Create `BrandExplorerSummary` / update totals at the end

This ensures:

- Partial results survive if connection drops
- `searchId` is available immediately for client tracking
- No transaction needed (each write is independent)

### Frontend Architecture

**New hook: `useStreamingSearch`**

A custom hook that:

- Starts an SSE connection via `EventSource`
- Accumulates `SearchResultItem[]` in state as `video` events arrive
- Tracks `progress` state for UI indicators
- Exposes interface compatible with current mutations:
  - `startSearch(term, mode)` - Initiates streaming search
  - `results: SearchResultItem[]` - Accumulated results
  - `progress: { total: number, completed: number } | null`
  - `summary: Summary | null` - Available after `complete` event
  - `searchId: string | null` - Available immediately
  - `isPending: boolean` - True while streaming
  - `error: Error | null`

**Integration with existing code:**

- `HomePage` will use `useStreamingSearch` instead of separate mutation hooks
- `DataGrid` receives results array (no changes needed - just gets more items over time)
- History sidebar refreshes after `complete` event

### Processing Changes

**Brand Explorer refactor:**

- Current `Promise.all` for classification will become sequential `for...of` loop
- Each iteration: classify video, call `onVideo` callback, continue
- Callback pattern allows same core logic for streaming and non-streaming use

**Keyword Search refactor:**

- Same pattern as brand explorer
- `classifyVideos` will accept optional `onVideo` callback

### Error Handling

- **Single video classification fails:** Log error, stream `error` event, skip video, continue processing
- **Apify fails:** Stream error event, close connection with error status
- **Connection drops:** Browser's EventSource auto-reconnects; server should handle reconnection gracefully
- **All classifications fail:** Still complete successfully with empty results + summary

### Cached Results Behavior

When results are cached:

1. Existing non-streaming endpoints return JSON immediately
2. Frontend detects `cached: true` flag
3. No SSE connection opened for cached results
4. This keeps cached searches instant (no streaming overhead)

---

## Testing Decisions

No tests are needed

### Prior Art

- Existing mutation hooks in `app/hooks/` for hook patterns
- Existing service tests (if any) for backend testing patterns

---

## Out of Scope

- **WebSocket implementation** - SSE is sufficient for one-way streaming
- **Cancellation mid-stream** - User cannot abort an in-progress search (future enhancement)
- **Resume interrupted streams** - If connection drops, results are in DB but client must refresh
- **Parallel classification** - Videos classified sequentially to enable streaming (could optimize later with batching)
- **Real-time collaboration** - Multiple users don't see each other's searches
- **Mobile app support** - Web only for now

---

## Further Notes

### Performance Considerations

- Sequential classification is slightly slower than parallel, but UX improvement outweighs this
- Future optimization: Batch 3-5 classifications in parallel, stream batch when complete
- EventSource has 6 connection limit per domain on HTTP/1.1 (not an issue for single-user app)

### Migration Path

- New streaming endpoints are additive (no breaking changes)
- Frontend can feature-flag between old mutations and new streaming hook
- Once stable, old mutation hooks can be deprecated

### Monitoring

- Log streaming session duration
- Log videos streamed per session
- Track SSE connection drops/reconnects
- Alert on high classification failure rates

### Sources

- [Hono Streaming Helper Documentation](https://hono.dev/docs/helpers/streaming)
- [Server-Sent Events with Hono](https://yanael.io/articles/hono-sse/)
