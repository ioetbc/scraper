# PRD: Search Result Persistence

## Problem Statement

Every search in Habitz triggers a fresh Apify scrape, burning credits even for repeated searches. There's no way to view previous search results across sessions - the client-side localStorage history only stores metadata (keyword, timestamp, count), not actual results. Users lose valuable data when they close their browser.

## Solution

Persist all search results to a PostgreSQL database (Supabase) using Prisma ORM. Implement a DB-first approach where existing searches are served from the database without hitting Apify. Users can browse their full search history and view complete results from past searches. A refresh action allows users to invalidate stored results and fetch fresh data when needed.

## User Stories

1. As a user, I want my search results saved automatically, so that I don't lose data when I close my browser
2. As a user, I want to see a list of my previous searches, so that I can quickly access past results
3. As a user, I want to click on a past search and see the full results, so that I can review data without re-running the search
4. As a user, I want repeated searches to use saved data, so that I don't waste Apify credits on duplicate queries
5. As a user, I want to refresh a search to get fresh data, so that I can see updated results when needed
6. As a user, I want to see the same search history UI (list on left, results in table), so that the experience is consistent with what I'm used to
7. As a user, I want my keyword searches persisted, so that I can review past keyword explorations
8. As a user, I want my brand explorer searches persisted, so that I can review past brand analyses
9. As a user, I want video stats tracked over time, so that I can eventually see historical trends
10. As a user, I want videos deduplicated across searches, so that storage is efficient
11. As a user, I want brand explorer aggregations (totalReach, influencer stats) saved, so that I can view computed insights without re-processing
12. As a user, I want to see which influencers were found for a brand and their specific videos, so that I can drill down into the data
13. As a future user with an account, I want my searches tied to my user ID, so that my data is private and portable

## Implementation Decisions

### Database Schema

**User**
- id (cuid, primary key)
- createdAt
- Placeholder user with hardcoded ID used until auth is implemented
- userId column on Search ready for multi-user support

**Search**
- id (cuid, primary key)
- userId (foreign key to User)
- type: enum ('keyword' | 'brand_explorer')
- query: string (lowercase, normalized)
- createdAt
- updatedAt (tracks last refresh)
- Unique constraint on (userId, type, query) to identify "same search"

**Video**
- id (string, TikTok's video ID used as primary key for natural deduplication)
- caption
- isAd
- isSponsored
- creatorHandle
- creatorFollowers
- videoUrl
- shopProductUrl (nullable)
- createdAt
- updatedAt

**VideoMention**
- id (cuid)
- videoId (foreign key to Video)
- mention (the @handle string)

**VideoHashtag**
- id (cuid)
- videoId (foreign key to Video)
- hashtag (the #tag string)

**VideoStats**
- id (cuid)
- videoId (foreign key to Video)
- likes, comments, shares, views (integers)
- recordedAt (timestamp)
- New snapshot created on each search/refresh for historical tracking

**SearchResult**
- id (cuid)
- searchId (foreign key to Search)
- videoId (foreign key to Video)
- position (integer, order in results)
- isPromotion (boolean)
- brand (nullable string)
- confidence (float)
- signals (JSON array of strings)
- tier (nullable, 1 or 2)
- error (nullable string, if classification failed)
- createdAt

**BrandExplorerSummary**
- id (cuid)
- searchId (foreign key to Search, unique one-to-one)
- totalVideos
- totalInfluencers
- totalReach
- Many-to-many relation to Video (all videos found)

**BrandExplorerInfluencer**
- id (cuid)
- searchId (foreign key to Search)
- summaryId (foreign key to BrandExplorerSummary)
- handle
- followers
- videoCount
- totalViews
- totalLikes
- Many-to-many relation to Video (this influencer's videos)

### Modules

**server/lib/prisma/**
- client.ts - Singleton Prisma client export
- schema.prisma - Full schema definition

**server/services/keyword-search-history/**
- keyword-search-history.ts - Core functions:
  - `findKeywordSearch(query)` - Find existing search by query
  - `saveKeywordSearch(query, results)` - Persist new keyword search
  - `refreshKeywordSearch(searchId, results)` - Replace results for existing search
  - `getKeywordSearchResults(searchId)` - Get full results with videos
- keyword-search-history.types.ts - Type definitions
- index.ts - Public API exports

**server/services/brand-explorer-history/**
- brand-explorer-history.ts - Core functions:
  - `findBrandExplorerSearch(handle)` - Find existing search by handle
  - `saveBrandExplorerSearch(handle, results, summary, influencers)` - Persist new brand exploration
  - `refreshBrandExplorerSearch(searchId, results, summary, influencers)` - Replace results
  - `getBrandExplorerResults(searchId)` - Get full results with videos, summary, influencers
- brand-explorer-history.types.ts - Type definitions
- index.ts - Public API exports

### API Changes

**Modified endpoints:**

POST /api/search
1. Normalize query (lowercase)
2. Call `findKeywordSearch(query)`
3. If found → call `getKeywordSearchResults()` and return
4. If not found → run Apify search + classification
5. Call `saveKeywordSearch()` to persist
6. Return results

POST /api/brand-explorer
1. Normalize handle (lowercase)
2. Call `findBrandExplorerSearch(handle)`
3. If found → call `getBrandExplorerResults()` and return
4. If not found → run Apify searches + classification + aggregation
5. Call `saveBrandExplorerSearch()` to persist
6. Return results

**New endpoints:**

GET /api/searches
- Returns list of all searches for current user (placeholder user for now)
- Includes: id, type, query, createdAt, updatedAt, result count

GET /api/searches/:id
- Returns full results for a specific search
- Handles both keyword and brand explorer types

POST /api/searches/:id/refresh
- Re-runs the search (Apify + classification)
- Calls appropriate refresh function to replace stored results
- Returns fresh results

### Search Identification

- Keyword searches matched by: lowercase query
- Brand explorer searches matched by: lowercase handle
- Unique constraint prevents duplicates per user

### Video Deduplication

- Videos use TikTok's video ID as primary key
- On save: upsert video (insert or update if exists)
- Multiple searches can link to same video via SearchResult junction
- VideoStats creates new snapshot each time (preserves history)

### Placeholder User Strategy

- Create a default user record with known ID on first run
- All searches use this placeholder userId
- When auth is added: migrate searches to real users or keep as "anonymous" history

## Testing Decisions

Testing is out of scope for the initial implementation. Tests may be added in a future iteration.

## Out of Scope

- User authentication and accounts (placeholder user for now)
- Cache invalidation strategies (manual refresh only)
- Deleting searches from history
- Cache TTL or automatic expiration
- Showing "cached" vs "fresh" indicators in UI
- Case-sensitive search matching (all queries normalized to lowercase)

## Further Notes

- The DATABASE_URL environment variable already exists with Supabase connection string
- Prisma is already in package.json but not configured
- Existing client-side localStorage history can be removed once this is implemented
- The UI already has the search history list on the left - this should continue to work with the new API
- VideoStats snapshots enable future feature: historical trend charts for video performance
