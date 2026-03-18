# North Star Document

## Influencer Search Intelligence Tool

**Version:** 0.1 — Draft for Review
**Date:** March 2026
**Status:** Pre-build

---

## 1. Problem Statement

Brands and marketing teams currently have no way to search a keyword on TikTok or Instagram and see which competitors are paying influencers to appear in those results. The existing workflow is entirely manual: someone searches a term, scrolls through results, screenshots sponsored posts, and logs them in a spreadsheet.

This is the equivalent of not having Ahrefs — you can see the search results, but you have no systematic way to understand who is paying to rank there, what they're saying, or how often.

There is no product in the market that solves this today. The podcast that originated this conversation put it directly: _"If someone could figure out how to do this, I'll probably make a lot of money."_

---

## 2. What We Are Building

A web application that lets a user type a search term — exactly as they would in the TikTok or Instagram app — and returns a ranked list of sponsored and influencer-promoted content for that keyword, including:

1. **Search position** — where the video ranks in TikTok/Instagram search results (1st, 2nd, 3rd, etc.)
2. **Video caption** — the text of the post
3. **The brand behind the promotion** — which business paid the creator
4. **Creator handle** — who made the content, with follower count

The primary use case is competitive intelligence: a company like Submagic wants to know which other brands (CapCut, Descript, VEED) are paying creators to appear when someone searches "how to add captions to a video."

---

## 3. Why Now

Three things have converged to make this buildable today:

**TikTok as a search engine.** Over 40% of Gen Z now use TikTok instead of Google for searches. Brands are actively bidding on TikTok search placement, both through paid ads and through influencer partnerships. The commercial intent in TikTok search is now comparable to Google.

**Third-party scraping APIs have matured.** Apify provides a managed TikTok scraper that returns keyword search results in ranked order with `is_paid_partnership` flags and `@mentions` data — without requiring us to build and maintain our own scraper infrastructure.
