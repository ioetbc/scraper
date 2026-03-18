## 1. Data Sources

We are combining two sources to build a complete picture:

### 1.1 Apify TikTok Scraper (Primary — search ranking)

A managed TikTok scraping platform. We use their TikTok scraper actor to search by keyword and get back results in ranked order. This gives us:

- Results ranked in the order they appear in TikTok search
- `isAd` boolean — set by TikTok when a post is a paid ad. Reliable when `true`, but often `false` on genuine paid partnerships (creators frequently don't disclose)
- `isSponsored` boolean — inconsistently present in the response; a strong signal when `true` but absent on many sponsored posts
- `mentions` and `detailedMentions` arrays — @mentions in the caption
- `hashtags` array — brand names frequently appear here even without an @mention (e.g. `#submagic`)
- Full caption `text` — brand names often only appear in free text with no tag or mention at all
- Creator handle, follower count, engagement metrics
- `shop_product_url` for TikTok Shop affiliate content

**Important:** No single field reliably identifies a paid promotion. Real data shows the Submagic post had `isAd: false` with no `isSponsored` field, yet was clearly a paid partnership. The LLM classifier is the only signal that works consistently across all cases.

**How it's called:** Trigger Apify actor via REST API, poll for results
**Cost:** ~$0.005 per result
**Rate limits:** No per-minute caps; concurrent runs supported
**Proxies:** Managed by Apify — residential proxies included, no infrastructure to maintain

### 1.2 Brand Detection via LLM (Inferring who paid)

No field in the Apify response reliably tells us whether a post is sponsored or who paid for it. We run an LLM classifier on **every single video** returned by the search — not just those flagged by `isAd` or `isSponsored`.

**Two-tier LLM approach:**

**Tier 1 — Confirmed signal pass** (run when `isAd: true` OR `isSponsored: true`):
The post is likely promotional. Send caption text + mentions + hashtags to Claude. Prompt is direct: identify the brand being promoted and extract confidence score. Higher token budget, more thorough reasoning.

**Tier 2 — Organic-looking pass** (run when both `isAd: false` AND `isSponsored` absent/false):
The post has no official flag — but may still be a paid promotion. This is the sebastienjefferies case: `isAd: false`, no mentions, but `#submagic` in hashtags and brand name in caption text. A cheaper, faster LLM call with a more skeptical prompt: look for subtle signals like brand hashtags, free trial CTAs, affiliate links, and brand name drops in the caption body. Only promote to a result if confidence is high (>0.85).

**What the classifier receives for every video:**

```json
{
  "caption": "This will SAVE you hours editing videos...",
  "mentions": [],
  "hashtags": ["videoediting", "subtitles", "submagic"],
  "isAd": false,
  "isSponsored": false
}
```

**What it returns:**

```json
{
  "isPromotion": true,
  "brand": "Submagic",
  "brandHandle": "submagic.co",
  "confidence": 0.91,
  "signals": ["brand hashtag", "product name in caption", "saves time CTA"],
  "tier": 2
}
```

---

## 2. How Brand Detection Works — Full Logic

```
For EVERY video returned by keyword search:

  IF shop_product_url is present:
    → Fetch TikTok Shop product page
    → Extract seller/brand name from product listing
    → brand_source = "tiktok_shop"
    → skip LLM (brand already known)

  ELSE:

    IF isAd = true OR isSponsored = true:
      → Run TIER 1 LLM (confirmed signal pass)
      → Higher token budget, direct prompt
      → Confidence threshold: > 0.70

    ELSE (isAd = false AND isSponsored absent/false):
      → Run TIER 2 LLM (organic-looking pass)
      → Skeptical prompt, look for subtle signals
      → Confidence threshold: > 0.85 (stricter — avoid false positives)

    In both cases, LLM receives:
      caption text + mentions + hashtags array

    IF confidence meets threshold:
      → brand = LLM result
      → brand_source = "llm_tier_1" or "llm_tier_2"

    ELSE:
      → brand = null (organic content, no sponsorship detected)
```

---

## 3. Example Output

**User searches:** `"how to add captions to a video"`

| #   | Creator        | Followers | Caption (truncated)                                                      | Brand    | Confidence | Source  |
| --- | -------------- | --------- | ------------------------------------------------------------------------ | -------- | ---------- | ------- |
| 1   | @migs.visuals  | 14.4K     | "All auto-captions look the same... @submagic.co released Captions Edit" | Submagic | 96%        | LLM     |
| 2   | @contentpro    | 82K       | "The caption tool I use for every video 👇"                              | CapCut   | 91%        | LLM     |
| 3   | @techreview_uk | 210K      | "Best caption tools ranked — #1 is free"                                 | VEED.io  | 88%        | LLM     |
| 4   | @creator123    | 5.1K      | "Here's how to add subtitles fast"                                       | —        | —          | Organic |

---

## 4. V1 Architecture

### 4.1 Request flow (on-demand, no pre-indexing)

```
User enters keyword in UI
        ↓
Backend triggers Apify TikTok scraper actor via REST API
        ↓
Poll for results — returned in ranked order (~5-15 seconds)
        ↓
For each video, in parallel:
  → If isAd/isSponsored true: Tier 1 LLM (Claude Sonnet, direct prompt)
  → If both false: Tier 2 LLM (Claude Haiku, skeptical prompt, stricter threshold)
  → If shop_product_url present: fetch product page, skip LLM
        ↓
Merge results: position + creator + brand + confidence + tier
        ↓
Return to UI
```

Total latency target: under 15 seconds for a full search.

### 4.2 Stack

- **Frontend:** React
- **Backend:** Node.js / Express
- **Search data:** Apify TikTok scraper
- **Brand classification (tier 1):** Claude Sonnet — for posts flagged as ads
- **Brand classification (tier 2):** Claude Haiku — for all other posts (faster, cheaper)
- **Database:** Postgres — cache results so repeat searches for the same keyword are instant
- **Hosting:** TBD

### 4.3 Caching strategy

When a keyword is searched for the first time, results are fetched live and stored. When the same keyword is searched again within 24 hours, results are served from the database. This reduces cost and latency significantly as usage grows, and is the first step toward a pre-indexed approach.

---

## 5. Known Limitations

| Limitation                                            | Impact                                                                     | Mitigation                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Brand name requires LLM inference (not official data) | Occasional misclassifications                                              | Confidence score stored per result; tier 2 uses stricter threshold to reduce false positives              |
| `isAd` and `isSponsored` are unreliable               | Cannot use flags alone to identify sponsored content                       | LLM runs on every video regardless of flags                                                               |
| Tier 2 LLM runs on all untagged videos                | Higher Claude API cost per search                                          | Tier 2 uses a cheaper, faster model (Haiku vs Sonnet); cost still acceptable at scale                     |
| Apify is a managed scraping platform                  | Actor could break if TikTok changes its interface; Apify maintains the fix | Monitor actor status; build abstraction layer so provider can be swapped                                  |
| Creators who don't mention or hashtag the brand       | Brand will not be detected                                                 | Shown as organic; future: fetch individual video page and parse "Paid partnership with X" label from HTML |
| On-demand scraping adds latency                       | 10-15 second searches                                                      | Acceptable for v1; caching improves this over time                                                        |
| Apify scrapes TikTok without official permission      | Legal risk                                                                 | Risk is low for read-only use of publicly accessible data; multiple court rulings support this            |

---

## 6. What This Is Not (V1 Scope)

- Not a pre-indexed database of all TikTok content (V2)
- Not Instagram support (V2 — Meta Ad Library API endpoint exists and is ready)
- Not historical trend data or time-series charts (V2)
- Not creator outreach or CRM features
- Not a tool for managing your own influencer campaigns

---

## 7. Success Metrics

| Metric                          | V1 Target                                                    |
| ------------------------------- | ------------------------------------------------------------ |
| Search latency                  | < 15 seconds                                                 |
| Brand detection accuracy        | > 85% on posts with @mentions                                |
| Searches per day (capacity)     | Unlimited (Apify scales horizontally)                        |
| Cost per search                 | < $0.15 (Apify + Claude Sonnet tier 1 + Claude Haiku tier 2) |
| Paying customers within 90 days | 10                                                           |

---

## 8. Open Questions for Review

1. **Pricing model:** Per-search credits vs. monthly subscription? Given cost per search is ~$0.10, a subscription model likely works better than pay-per-search.

2. **Instagram in V1 or V2?** The Meta Ad Library API is documented and accessible same-day. Instagram could be added to V1 with modest extra effort.

3. **Legal review:** Should we get counsel's view on the Apify dependency before building? The scraper accesses publicly visible TikTok data, but TikTok's ToS prohibits automated scraping.

4. **LLM accuracy threshold:** What confidence score should we require before showing a brand name? Below that threshold, should we show "Unconfirmed sponsor" or suppress the result entirely?

5. **Apify vs. custom scraper:** Apify is the right choice for v1 (managed proxies, no maintenance). Once we have paying customers, do we rewrite in-house to reduce per-search cost?

---

## 9. Appendix — Key APIs Referenced

| API                           | Provider                | Auth                   | Cost           | Coverage                       |
| ----------------------------- | ----------------------- | ---------------------- | -------------- | ------------------------------ |
| TikTok Keyword Search         | Apify (managed scraper) | API key                | ~$0.005/result | Global, real-time              |
| Brand Classification (tier 1) | Anthropic Claude Sonnet | API key                | ~$0.003/call   | Posts flagged isAd/isSponsored |
| Brand Classification (tier 2) | Anthropic Claude Haiku  | API key                | ~$0.0003/call  | All other posts                |
| Ad Library API                | Meta (official)         | Facebook account + app | Free           | EU/UK full, global limited     |

---

_Document prepared following technical discovery sessions. All architecture decisions and API capabilities verified against live documentation as of March 2026._
