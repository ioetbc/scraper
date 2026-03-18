# Plan: Streaming Results

> Source PRD: `docs/prd-streaming-results.md`

## Architectural Decisions

Durable decisions that apply across all phases:

### Routes

- `POST /api/brand-explorer/stream` - SSE streaming brand exploration
- `POST /api/search/stream` - SSE streaming keyword search
- Existing endpoints (`POST /api/brand-explorer`, `POST /api/search`) unchanged for cached results

### SSE Event Schema

```typescript
type StreamEvent =
  | { type: 'init'; searchId: string }
  | { type: 'video'; data: SearchResultItem }
  | { type: 'progress'; total: number; completed: number }
  | { type: 'complete'; summary: Summary }
  | { type: 'error'; videoId?: string; message: string }
```

### Database Pattern

1. Create `Search` record at stream start (generates `searchId`)
2. Create each `Video` record immediately after classification
3. Create `BrandExplorerSummary` at the end with final totals

### Frontend State

- Single `useStreamingSearch` hook manages EventSource connection
- Accumulates `SearchResultItem[]` as events arrive
- Exposes `results`, `progress`, `summary`, `searchId`, `isPending`, `error`

---

## Phase 1: Minimal SSE Endpoint

**User stories**: 11 (reusable streaming modules), 12 (typed SSE events)

### What to build

A proof-of-concept SSE endpoint that demonstrates Hono's `streamSSE` works end-to-end. The endpoint streams hardcoded fake data: an `init` event with a mock searchId, 3 fake `video` events with `progress` updates, and a `complete` event with mock summary. No real data processing, no database, no frontend integration.

This validates the SSE infrastructure before building real functionality on top.

### Acceptance criteria

- [ ] `POST /api/brand-explorer/stream` returns `Content-Type: text/event-stream`
- [ ] Endpoint streams `init`, `video`, `progress`, and `complete` events in correct order
- [ ] Events are properly formatted SSE (data/event/id fields)
- [ ] Can test with `curl` or browser DevTools and see events arriving over time
- [ ] Streaming service module created with typed event helpers

---

## Phase 2: Streaming Brand Explorer with DB Persistence

**User stories**: 1 (results appear one by one), 2 (progress indicator), 4 (summary at end), 8 (smooth updates), 9 (results persist)

### What to build

Wire up real brand exploration with streaming and incremental database writes. Refactor the brand explorer service to process videos sequentially (not `Promise.all`) and emit events via callback. Each classified video is:
1. Saved to the database immediately
2. Streamed to the client

The search record is created at stream start so `searchId` is available immediately. Summary is written at the end. This ensures partial results survive connection drops.

### Acceptance criteria

- [ ] Stream endpoint creates `Search` record and streams `searchId` in `init` event
- [ ] Videos from Apify are classified sequentially (not in parallel)
- [ ] Each classified video is saved to DB before streaming
- [ ] `video` event contains full `SearchResultItem` data
- [ ] `progress` event shows accurate `completed` / `total` counts
- [ ] `complete` event contains correct summary (totalVideos, totalInfluencers, totalReach)
- [ ] Summary record created in DB at stream end
- [ ] Partial results visible in DB if stream interrupted mid-processing

---

## Phase 3: Frontend Streaming Hook & Integration

**User stories**: 1 (results appear one by one), 2 (progress indicator), 4 (summary at end), 8 (smooth updates), 10 (search in sidebar)

### What to build

Create `useStreamingSearch` hook that opens an EventSource connection to the streaming endpoint. The hook accumulates results in state as `video` events arrive, tracks progress, and signals completion. Integrate into `HomePage` so the DataGrid updates live as rows arrive. After `complete` event, invalidate history queries so the search appears in sidebar.

### Acceptance criteria

- [ ] `useStreamingSearch` hook opens EventSource to streaming endpoint
- [ ] Hook accumulates `results` array as `video` events arrive
- [ ] Hook exposes `progress: { total, completed }` from progress events
- [ ] Hook exposes `summary` after `complete` event
- [ ] Hook exposes `searchId` immediately after `init` event
- [ ] Hook exposes `isPending` (true while streaming, false after complete/error)
- [ ] Hook cleans up EventSource on unmount
- [ ] `HomePage` uses hook and DataGrid shows rows appearing incrementally
- [ ] History sidebar refreshes after search completes

---

## Phase 4: Error Handling & Resilience

**User stories**: 6 (partial failures don't block), 7 (see failed videos), 13 (auto-reconnect), 14 (error on total failure), 15 (no timeouts)

### What to build

Handle failure scenarios gracefully. When a single video fails to classify, emit an `error` event with the video ID and continue processing remaining videos. When Apify fails entirely, emit a fatal error and close the stream. Frontend displays appropriate error states and handles connection drops.

### Acceptance criteria

- [ ] Single video classification failure emits `error` event and continues processing
- [ ] `error` event contains `videoId` and `message`
- [ ] Apify failure emits `error` event (no videoId) and closes stream
- [ ] Frontend hook sets `error` state on fatal errors
- [ ] Frontend displays error banner for fatal errors
- [ ] Non-fatal errors (individual video failures) shown but don't block results
- [ ] Long-running streams don't timeout (appropriate keep-alive if needed)

---

## Phase 5: Streaming Keyword Search

**User stories**: 5 (consistent experience for both search types)

### What to build

Apply the same streaming pattern to keyword search. Refactor `classifyVideos` to support sequential processing with callback. Create `POST /api/search/stream` endpoint that mirrors brand explorer streaming behavior. Frontend hook handles both search types seamlessly.

### Acceptance criteria

- [ ] `POST /api/search/stream` endpoint streams keyword search results
- [ ] Same event schema as brand explorer (`init`, `video`, `progress`, `complete`, `error`)
- [ ] Keyword search videos saved incrementally to DB
- [ ] `useStreamingSearch` hook works for both search modes
- [ ] UI behavior identical between brand explorer and keyword search

---

## Phase 6: Cache-Aware Routing

**User stories**: 3 (cached searches instant)

### What to build

Frontend checks cache status before deciding which endpoint to use. For cached results, use existing JSON endpoints for instant response. For uncached searches, use streaming endpoints. The decision is transparent to the user - they always see results, either instantly (cached) or progressively (streaming).

### Acceptance criteria

- [ ] Frontend detects when results might be cached (e.g., from history selection)
- [ ] Cached requests use existing JSON endpoints (no SSE overhead)
- [ ] Uncached requests use streaming endpoints
- [ ] Seamless UX regardless of cache status
- [ ] `cached: true` flag available in response for logging/debugging
