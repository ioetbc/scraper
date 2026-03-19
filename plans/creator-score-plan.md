Creator Score Implementation Plan

First read the @docs/creator-score.md file

Architecture:

1. New service server/services/creator-score/ - calculation logic
2. DB storage - Add score fields to SearchResult model (already has VideoStats with likes/comments/shares/views)
3. Server-side calculation - Score computed when saving SearchResult, only final score passed to UI
4. UI display - New "CS" column in DataGrid with colored badge + hover tooltip

Key decisions:

- Uses existing VideoStats data (likes, comments, shares, views) - no new API calls
- Consistency score = neutral 50 for MVP (requires multi-video data for full implementation)
- Score stored in DB for fast retrieval on cached searches

Files to create: 3 (creator-score service)
Files to modify: 5 (schema, history services, types, DataGrid)

Creator Score Feature Implementation Plan

Overview

Add a Creator Score (CS) 0-100 metric calculated server-side, stored in DB,
displayed in the UI table.

Formula: CS = (Reach × 0.4) + (Engagement × 0.4) + (Consistency × 0.2)

---

Implementation Steps

1.  Create Creator Score Service

New files in server/services/creator-score/:

server/services/creator-score/
├── index.ts
├── creator-score.ts
├── creator-score.types.ts

Types:
type CreatorScoreBreakdown = {
reach: number // 0-100
engagement: number // 0-100
consistency: number // 0-100 (neutral 50 for single video)
}

type CreatorScoreResult = {
score: number // 0-100 weighted total
tier: 'high' | 'solid' | 'low'
breakdown: CreatorScoreBreakdown
}

Calculation logic:

- Reach: Based on views (uses existing thresholds from spec)
- Engagement: (likes + comments + shares) / views (uses VideoStats)
- Consistency: Neutral 50 for MVP (single video data)

---

2.  Update Database Schema

File: prisma/schema.prisma

Add to SearchResult model:
model SearchResult {
// ... existing fields ...

     // Creator Score
     creatorScore         Int?
     creatorScoreTier     String?   // 'high' | 'solid' | 'low'
     creatorScoreReach    Int?
     creatorScoreEngagement Int?
     creatorScoreConsistency Int?

}

Run migration after schema update.

---

3.  Integrate into Search Pipeline

Files to modify:

- server/index.ts - Calculate score when building SearchResult
- server/services/keyword-search-history/keyword-search-history.ts
- server/services/brand-explorer-history/brand-explorer-history.ts

When saving a SearchResult:

1.  Get VideoStats (likes, comments, shares, views)
2.  Call calculateCreatorScore()
3.  Store score + breakdown in SearchResult record

---

4.  Update API Response Types

File: app/types/index.ts

type SearchResultItem = {
// ... existing fields ...

     creatorScore?: {
       score: number
       tier: 'high' | 'solid' | 'low'
       breakdown: {
         reach: number
         engagement: number
         consistency: number
       }
     }

}

---

5.  Add UI Column

File: app/components/DataGrid.tsx

Add "CS" column after Followers:

- Display score as colored badge
- Color coding: green (80+), yellow (50-79), red (<50)
- Tooltip shows breakdown on hover
- Sortable and filterable

---

Files to Create

| File                                                 | Purpose           |
| ---------------------------------------------------- | ----------------- |
| server/services/creator-score/creator-score.types.ts | Type definitions  |
| server/services/creator-score/creator-score.ts       | Calculation logic |
| server/services/creator-score/index.ts               | Re-exports        |

Files to Modify

| File | Changes
|
|------------------------------------------------------------------|---------
---------------------------|
| prisma/schema.prisma | Add scor
fields to SearchResult |
| server/services/keyword-search-history/keyword-search-history.ts | Calculat

- save score |
  | server/services/brand-explorer-history/brand-explorer-history.ts | Calculat
- save score |
  | app/types/index.ts | Add
  creatorScore to SearchResultItem |
  | app/components/DataGrid.tsx | Add CS
  column with badge + tooltip |

---

Score Thresholds (from spec)

Reach (avg views):

- <10K → 20
- 10K–50K → 40
- 50K–200K → 60
- 200K–1M → 80
- 1M+ → 100

Engagement Rate:

- <2% → 20
- 2–5% → 40
- 5–8% → 60
- 8–12% → 80
- 12%+ → 100

Consistency (MVP):

- Single video → neutral 50

Tier colors:

- 80-100 → green ("High Impact")
- 50-79 → yellow ("Solid")
- <50 → red ("Low Impact")
