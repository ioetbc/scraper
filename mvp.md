# MVP Implementation Plan

## Goal
Build an MVP that searches TikTok via Apify, classifies sponsored content using OpenAI, and returns results to the UI.

## Flow
```
User enters keyword
    ↓
Backend calls Apify TikTok scraper
    ↓
For each video result:
  → Check isAd / isSponsored flags
  → Run LLM classification on caption/hashtags/mentions
    ↓
Return structured data to UI (console for now)
```

## Implementation Steps

### 1. Setup & Dependencies
- **Files:** `package.json`
- Install `apify-client` for Apify API
- Install `ai` and `@ai-sdk/openai` (Vercel AI SDK) for classification
- Add `APIFY_API_TOKEN` and `OPENAI_API_KEY` to `.env`

### 2. Create Apify Service
- **File:** `src/services/apify.ts`
- Function to trigger TikTok scraper actor with keyword
- Poll for results until complete
- Return raw video data (caption, mentions, hashtags, isAd, isSponsored, creator info)

### 3. Create Brand Classifier Service
- **File:** `src/services/classifier.ts`
- Two-tier LLM approach using Vercel AI SDK + OpenAI:
  - Tier 1 (GPT-4o): When isAd=true OR isSponsored=true, confidence threshold >0.70
  - Tier 2 (GPT-4o-mini): When both false, stricter threshold >0.85
- Input: caption, mentions, hashtags, flags
- Output: `{ isPromotion, brand, confidence, signals }`

### 4. Create Search Endpoint
- **File:** `src/index.ts`
- Add `POST /api/search` endpoint
- Accept `{ keyword: string }`
- Call Apify service → classify each result → return merged data

### 5. Response Structure
```typescript
{
  keyword: string,
  results: [{
    position: number,
    creator: { handle: string, followers: number },
    caption: string,
    isAd: boolean,
    isSponsored: boolean,
    brand: string | null,
    confidence: number | null,
    signals: string[],
    tier: 1 | 2 | null
  }]
}
```

## Files to Create/Modify
1. `package.json` - add dependencies
2. `.env` - add API keys
3. `src/services/apify.ts` - Apify TikTok scraper client
4. `src/services/classifier.ts` - OpenAI brand classifier
5. `src/index.ts` - add search endpoint

## Testing
- Run `bun run dev` or `npm run dev`
- Test with curl: `curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{"keyword": "how to add captions"}'`
- Verify results in console
