# Brand Explorer Feature Spec

**Status:** Implemented (MVP)
**Date:** March 2026
**Last Updated:** March 15, 2026

---

## 1. Concept

The inverse of keyword search. Instead of "show me who's paying to rank for this keyword," it's **"show me everything this brand is paying for."**

Ahrefs equivalent: **Site Explorer** — the most-used feature.

---

## 2. Design Decisions

These decisions were made during planning:

| Question | Decision |
|----------|----------|
| How should users identify a brand? | **TikTok handle only** (e.g., `@submagic.co`) — most accurate |
| Search strategy? | **Multi-signal search** — parallel @mention + #hashtag searches |
| MVP scope? | **Videos + Influencers only** — no keyword analysis or spend estimation |
| Database? | **No database** — live queries only for MVP |
| Include brand's own content? | **No** — only show content from influencers promoting the brand |

---

## 3. Implementation

### 3.1 Files Created/Modified

| File | Purpose |
|------|---------|
| `src/services/apify.ts` | Added `searchByMention()` and `searchByHashtag()` functions |
| `src/services/brand-explorer.ts` | **New** — orchestration service for brand exploration |
| `src/index.ts` | Added `POST /api/brand-explorer` endpoint |
| `src/logger.ts` | Added `brandExplorerLogger` |

### 3.2 Architecture

```
User enters handle (e.g., "@submagic.co")
        ↓
Normalize handle → { handle: "@submagic.co", username: "submagic.co", hashtag: "submagic" }
        ↓
Run 2 parallel Apify searches:
  1. searchByMention("@submagic.co") → videos mentioning the handle
  2. searchByHashtag("submagic") → videos with #submagic hashtag
        ↓
Merge results + dedupe by video ID
        ↓
Filter out brand's own content (creator.handle !== brand username)
        ↓
Classify each video with LLM to confirm it promotes target brand
        ↓
Filter to only videos where detected brand matches target
        ↓
Aggregate by influencer + calculate reach
        ↓
Return structured response
```

### 3.3 New Apify Functions

```typescript
// src/services/apify.ts

// Search for videos mentioning a handle in captions
searchByMention(handle: string, maxResults = 20): Promise<TikTokVideo[]>
  // Uses: searchQueries: [`@${handle}`]

// Search for videos with a specific hashtag
searchByHashtag(hashtag: string, maxResults = 20): Promise<TikTokVideo[]>
  // Uses: hashtags: [hashtag]
```

### 3.4 Brand Explorer Service

```typescript
// src/services/brand-explorer.ts

interface BrandExplorerInput {
  handle: string;  // e.g., "submagic.co" or "@submagic.co"
}

interface BrandExplorerResult {
  brand: string;
  summary: {
    totalVideos: number;
    totalInfluencers: number;
    totalReach: number;
  };
  influencers: Array<{
    handle: string;
    followers: number;
    videosForBrand: number;
    totalViews: number;
  }>;
  videos: Array<{
    id: string;
    creator: { handle: string; followers: number };
    caption: string;
    views: number;
    videoUrl: string;
    confidence: number;
  }>;
}

async function exploreBrand(input: BrandExplorerInput): Promise<BrandExplorerResult>
```

### 3.5 Handle Normalization

The service normalizes various input formats:

```typescript
function normalizeHandle(input: string): {
  handle: string;   // @submagic.co
  username: string; // submagic.co
  hashtag: string;  // submagic (dots removed for hashtag search)
}

// Examples:
// "submagic.co"   → { handle: "@submagic.co", username: "submagic.co", hashtag: "submagic" }
// "@submagic.co"  → { handle: "@submagic.co", username: "submagic.co", hashtag: "submagic" }
```

### 3.6 Brand Matching Logic

After LLM classification, we check if the detected brand matches the target:

```typescript
function isMatchingBrand(detectedBrand: string | null, normalized: NormalizedHandle): boolean {
  // Checks if detected brand contains or is contained by:
  // - normalized.username (e.g., "submagic.co")
  // - normalized.hashtag (e.g., "submagic")
  // - normalized.handle (e.g., "@submagic.co")
}
```

---

## 4. API Reference

### Endpoint

```
POST /api/brand-explorer
```

### Request

```json
{
  "handle": "submagic.co"
}
```

The handle can be provided with or without the `@` prefix.

### Response

```json
{
  "brand": "submagic.co",
  "summary": {
    "totalVideos": 12,
    "totalInfluencers": 8,
    "totalReach": 2450000
  },
  "influencers": [
    {
      "handle": "migs.visuals",
      "followers": 14400,
      "videosForBrand": 3,
      "totalViews": 450000
    },
    {
      "handle": "sebastienjefferies",
      "followers": 558800,
      "videosForBrand": 1,
      "totalViews": 120000
    }
  ],
  "videos": [
    {
      "id": "7345678901234567890",
      "creator": {
        "handle": "migs.visuals",
        "followers": 14400
      },
      "caption": "All auto-captions look the same... @submagic.co released Captions Edit...",
      "views": 150000,
      "videoUrl": "https://www.tiktok.com/@migs.visuals/video/7345678901234567890",
      "confidence": 0.9
    }
  ]
}
```

### Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing or invalid handle | `{ "error": "handle is required..." }` |
| 502 | Apify/search failure | `{ "error": "Failed to explore brand", "details": "..." }` |
| 500 | Internal error | `{ "error": "Internal server error" }` |

---

## 5. Testing

```bash
# Start the server
bun run dev:server

# Test with curl
curl -X POST http://localhost:3000/api/brand-explorer \
  -H "Content-Type: application/json" \
  -d '{"handle": "submagic.co"}'

# With @ prefix (also works)
curl -X POST http://localhost:3000/api/brand-explorer \
  -H "Content-Type: application/json" \
  -d '{"handle": "@submagic.co"}'
```

---

## 6. Cost Estimate

Per brand search:
- 2 Apify searches × ~$0.005/result × 20 results = ~$0.20
- LLM classification for ~40 videos (after dedupe) = ~$0.015
- **Total: ~$0.22 per brand search**

---

## 7. Limitations

| Limitation | Impact | Future Mitigation |
|------------|--------|-------------------|
| Only finds content with @mention or #hashtag | Misses subtle promotions without tags | Add caption text search |
| No historical data | Only sees recent TikTok results (~30 days) | Add database to accumulate over time |
| No date information | Can't show campaign timeline | Extract dates from Apify response if available |
| May miss brand variations | "Submagic" vs "SubMagic" vs "sub magic" | Improve fuzzy matching |

---

## 8. Future Enhancements

### Phase 2: Enrichment
- [ ] Extract top keywords/hashtags from matched content
- [ ] Add date/timeline data
- [ ] Estimate influencer rates based on follower count

### Phase 3: Database Layer
- [ ] Store all brand explorer results
- [ ] Enable historical trend analysis
- [ ] Faster repeat queries (cache)

### Phase 4: Additional Search Signals
- [ ] Caption text search (e.g., `"submagic"` in quotes)
- [ ] Brand's own profile → find duets/stitches/collabs
- [ ] Industry keyword expansion

---

## 9. Logging

The service uses structured logging with the `brandExplorerLogger`:

```
# Successful request
2026-03-15T10:30:00.000Z INFO  [habitz.brand-explorer] Brand exploration complete
  brand="submagic.co" totalVideos=12 totalInfluencers=8 totalReach=2450000 durationMs=8500

# Partial failure (one search failed)
2026-03-15T10:30:00.000Z WARN  [habitz.brand-explorer] Hashtag search failed
  hashtag="submagic" error="..."

# Request logging
2026-03-15T10:30:00.000Z INFO  [habitz.brand-explorer] Brand explorer request completed
  requestId="..." handle="submagic.co" statusCode=200 durationMs=8500
```
