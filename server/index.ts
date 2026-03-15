import 'dotenv/config'
import { Hono } from 'hono'
import { searchTikTok, ApifyError } from './services/apify'
import { classifyVideo } from './services/classifier'
import { exploreBrand, BrandExplorerError } from './services/brand-explorer'
import { searchLogger, brandExplorerLogger } from './logger'
import {
  findKeywordSearch,
  saveKeywordSearch,
  getKeywordSearchResults,
  type KeywordSearchResult,
} from './services/keyword-search-history'
import {
  findBrandExplorerSearch,
  saveBrandExplorerSearch,
  getBrandExplorerResults,
} from './services/brand-explorer-history'
import { prisma, PLACEHOLDER_USER_ID } from './lib/prisma'

const app = new Hono()
  .basePath('/api')
  .post('/search', async (c) => {
    const requestId = crypto.randomUUID()
    const startTime = performance.now()

    try {
      const body = await c.req.json()
      const { keyword } = body

      if (!keyword || typeof keyword !== 'string') {
        searchLogger.warn("Invalid search request", {
          requestId,
          error: "keyword_required",
          statusCode: 400,
        })
        return c.json({ error: 'keyword is required' }, 400)
      }

      // DB-first: Check if we have cached results
      const existingSearch = await findKeywordSearch(keyword)

      if (existingSearch) {
        const results = await getKeywordSearchResults(existingSearch.id)
        const durationMs = Math.round(performance.now() - startTime)

        searchLogger.info("Search completed (cached)", {
          requestId,
          keyword,
          statusCode: 200,
          durationMs,
          videoCount: results.length,
          cached: true,
          searchId: existingSearch.id,
        })

        return c.json({
          keyword,
          searchId: existingSearch.id,
          cached: true,
          results,
        })
      }

      // Not cached: Fetch videos from TikTok via Apify
      const videos = await searchTikTok(keyword)

      // Classify each video for brand promotion
      let classificationErrors = 0
      const classifiedResults: KeywordSearchResult[] = []

      for (const video of videos) {
        try {
          const classification = await classifyVideo({
            caption: video.caption,
            mentions: video.mentions,
            hashtags: video.hashtags,
            isAd: video.isAd,
            isSponsored: video.isSponsored,
          })

          classifiedResults.push({
            video,
            classification,
          })
        } catch {
          classificationErrors++
          classifiedResults.push({
            video,
            classification: null,
            error: 'Classification failed',
          })
        }
      }

      // Save to database
      const savedSearch = await saveKeywordSearch(keyword, classifiedResults)

      // Fetch from DB to ensure consistent format
      const results = await getKeywordSearchResults(savedSearch.id)

      const durationMs = Math.round(performance.now() - startTime)

      searchLogger.info("Search completed", {
        requestId,
        keyword,
        statusCode: 200,
        durationMs,
        videoCount: videos.length,
        classificationErrors,
        cached: false,
        searchId: savedSearch.id,
      })

      return c.json({
        keyword,
        searchId: savedSearch.id,
        cached: false,
        results,
      })
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime)

      if (error instanceof ApifyError) {
        searchLogger.error("Search failed - Apify error", {
          requestId,
          statusCode: 502,
          durationMs,
          errorType: "apify",
          error: error.message,
        })
        return c.json({ error: 'Failed to fetch videos from TikTok', details: error.message }, 502)
      }

      searchLogger.error("Search failed - Internal error", {
        requestId,
        statusCode: 500,
        durationMs,
        errorType: "internal",
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Internal server error' }, 500)
    }
  })
  .post('/brand-explorer', async (c) => {
    const requestId = crypto.randomUUID()
    const startTime = performance.now()

    try {
      const body = await c.req.json()
      const { handle } = body

      if (!handle || typeof handle !== 'string') {
        brandExplorerLogger.warn("Invalid brand explorer request", {
          requestId,
          error: "handle_required",
          statusCode: 400,
        })
        return c.json({ error: 'handle is required (e.g., "@submagic.co" or "submagic.co")' }, 400)
      }

      // DB-first: Check if we have cached results
      const existingSearch = await findBrandExplorerSearch(handle)

      if (existingSearch) {
        const cachedResult = await getBrandExplorerResults(existingSearch.id)
        const durationMs = Math.round(performance.now() - startTime)

        if (cachedResult) {
          brandExplorerLogger.info("Brand explorer request completed (cached)", {
            requestId,
            handle,
            statusCode: 200,
            durationMs,
            totalVideos: cachedResult.summary.totalVideos,
            totalInfluencers: cachedResult.summary.totalInfluencers,
            totalReach: cachedResult.summary.totalReach,
            cached: true,
            searchId: existingSearch.id,
          })

          return c.json({
            ...cachedResult,
            searchId: existingSearch.id,
            cached: true,
          })
        }
      }

      // Not cached: Run brand exploration
      const result = await exploreBrand({ handle })

      // Save to database
      const savedSearch = await saveBrandExplorerSearch(handle, result)

      const durationMs = Math.round(performance.now() - startTime)

      brandExplorerLogger.info("Brand explorer request completed", {
        requestId,
        handle,
        statusCode: 200,
        durationMs,
        totalVideos: result.summary.totalVideos,
        totalInfluencers: result.summary.totalInfluencers,
        totalReach: result.summary.totalReach,
        cached: false,
        searchId: savedSearch.id,
      })

      return c.json({
        ...result,
        searchId: savedSearch.id,
        cached: false,
      })
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime)

      if (error instanceof BrandExplorerError || error instanceof ApifyError) {
        brandExplorerLogger.error("Brand explorer failed", {
          requestId,
          statusCode: 502,
          durationMs,
          errorType: error.name,
          error: error.message,
        })
        return c.json({ error: 'Failed to explore brand', details: error.message }, 502)
      }

      brandExplorerLogger.error("Brand explorer failed - Internal error", {
        requestId,
        statusCode: 500,
        durationMs,
        errorType: "internal",
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Internal server error' }, 500)
    }
  })
  .get('/history', async (c) => {
    try {
      const searches = await prisma.search.findMany({
        where: { userId: PLACEHOLDER_USER_ID },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { results: true },
          },
          summary: {
            select: {
              totalVideos: true,
              totalInfluencers: true,
              totalReach: true,
            },
          },
        },
      })

      return c.json({
        searches: searches.map((search) => ({
          id: search.id,
          type: search.type,
          query: search.query,
          createdAt: search.createdAt,
          updatedAt: search.updatedAt,
          resultCount: search.type === 'keyword'
            ? search._count.results
            : search.summary?.totalVideos ?? 0,
          summary: search.summary ?? null,
        })),
      })
    } catch (error) {
      searchLogger.error("Failed to fetch searches", {
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Failed to fetch searches' }, 500)
    }
  })
  .get('/history/:id', async (c) => {
    const { id } = c.req.param()

    try {
      // Try keyword search first
      const keywordResults = await getKeywordSearchResults(id)
      if (keywordResults.length > 0) {
        return c.json(keywordResults)
      }

      // Try brand explorer
      const brandResults = await getBrandExplorerResults(id)
      if (brandResults) {
        return c.json(brandResults)
      }

      return c.json({ error: 'Search not found' }, 404)
    } catch (error) {
      searchLogger.error("Failed to fetch search results", {
        searchId: id,
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Failed to fetch search results' }, 500)
    }
  })

export type AppType = typeof app
export default app
