# Plan: Insights Tab

> Source PRD: Conversation - "Insights tab decision engine for TikTok brand discovery"

## Architectural Decisions

Durable decisions that apply across all phases:

- **Route**: No new routes - Insights is a view mode toggle within `/` page
- **API**: `POST /api/insights` accepts `{ searchId }`, returns `InsightsResult`
- **Schema**: No database changes - insights computed on-demand from existing `Search` + `Result` tables
- **Service Pattern**: `server/services/insights/` following classifier service structure
- **Key Models**:
  - Backend: `InsightsInput`, `InsightsResult`, `InsightsError`
  - Frontend computed: `MarketSnapshotData`, `BrandBreakdownItem`, `InfluencerClusterItem`
  - Frontend LLM: `ContentPatternsData`, `OpportunitySignalsData`, `SuggestedActionsData`
- **Toggle UI**: In header bar, matching Keyword/Brand toggle pattern
- **Streaming Behavior**: Blocks 1-3 update progressively via `useMemo`; Blocks 4-6 fetch after streaming completes

---

## Phase 1: Toggle + Market Snapshot

**User stories**: "I understand this market in 10 seconds"

### What to build

Add a Results/Insights toggle in the header bar. When Insights is selected, render an InsightsPanel instead of DataGrid. The panel displays a Market Snapshot block showing:

- Active brands detected (count)
- Total creators (count)
- Sponsored posts (count + percentage)
- Estimated reach (range)

The Market Snapshot computes client-side from the existing `results` array and updates progressively as results stream in.

### Acceptance criteria

- [ ] Toggle appears in header next to search input
- [ ] Clicking "Insights" shows InsightsPanel, "Results" shows DataGrid
- [ ] Market Snapshot displays all 4 metrics
- [ ] Stats update in real-time as results stream
- [ ] Works with both new searches and cached history items

---

## Phase 2: Brand & Influencer Blocks

**User stories**: "Who is spending on influencer marketing?" + "Who should I hire?"

### What to build

Add two more client-side computed blocks to InsightsPanel:

**Brand Breakdown**:
- List of detected brands with sponsored post counts
- Sorted by count descending
- Shows percentage of total

**Influencer Clusters**:
- Top influencers section (sorted by followers)
- Likely sponsored creators section (those with brand associations)
- Each entry shows handle, follower count, and associated brand if any

Both blocks compute from existing results and update progressively during streaming.

### Acceptance criteria

- [ ] Brand Breakdown shows top brands with counts and percentages
- [ ] Influencer Clusters shows two groups: top by reach, likely sponsored
- [ ] Both blocks update progressively as results stream
- [ ] Handles edge case: no brands detected (shows appropriate message)
- [ ] Handles edge case: no sponsored content detected

---

## Phase 3: LLM Backend + Content Patterns

**User stories**: "What content is working?"

### What to build

Create the insights backend service and surface the first LLM-powered block.

**Backend**:
- `server/services/insights/` service with types, schema, prompt, and main function
- `POST /api/insights` endpoint that fetches search results and calls LLM
- LLM analyzes captions to extract common themes and hooks

**Frontend**:
- `useInsights` hook (TanStack Query) to fetch from `/api/insights`
- Content Patterns component displaying themes and hooks
- Triggers fetch when streaming completes (minimum 3 results)

### Acceptance criteria

- [ ] `/api/insights` endpoint returns structured LLM response
- [ ] Content Patterns block shows themes extracted from captions
- [ ] Content Patterns block shows top hooks/opening patterns
- [ ] LLM insights only requested after streaming completes
- [ ] Loading state shown while LLM processes
- [ ] Insights cached per searchId (no re-fetch on tab toggle)

---

## Phase 4: Opportunity Signals + Suggested Actions

**User stories**: "What should I do next?"

### What to build

Complete the LLM-powered section with the remaining two blocks:

**Opportunity Signals**:
- Market gaps (underserved areas)
- Saturation level indicator (low/medium/high)
- Emerging opportunities

**Suggested Actions**:
- Prioritized list of recommendations (high/medium/low)
- Each action has a rationale explaining why

These come from the same `/api/insights` call (already returns all three LLM blocks).

### Acceptance criteria

- [ ] Opportunity Signals displays market gaps and saturation level
- [ ] Suggested Actions shows prioritized recommendations with rationale
- [ ] Full InsightsPanel now shows all 6 blocks
- [ ] Layout: 2-column grid with Market Snapshot and Actions spanning full width

---

## Phase 5: Polish & Edge Cases

**User stories**: "The tool feels alive and handles errors gracefully"

### What to build

Production-ready polish across all blocks:

- **Loading states**: Skeleton loaders matching each block's dimensions
- **Error handling**: Graceful degradation if LLM fails (show client-side blocks, hide LLM blocks with retry option)
- **Empty states**: Meaningful messages for insufficient data (< 3 results)
- **Visual refinement**: Counts, percentages, badges, comparison indicators

### Acceptance criteria

- [ ] Each block shows skeleton loader while computing/fetching
- [ ] LLM failure shows error state with retry button
- [ ] Insufficient data (< 3 results) shows helpful message instead of LLM blocks
- [ ] Switching between history items loads correct insights
- [ ] No layout shift as blocks load progressively
