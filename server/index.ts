import 'dotenv/config'
import { Hono } from 'hono'
import { searchTikTok, ApifyError } from './services/apify'
import { exploreBrand, BrandExplorerError } from './services/brand-explorer'
import { searchLogger, brandExplorerLogger } from './logger'
import {
  classifyVideos,
  findKeywordSearch,
  saveKeywordSearch,
  refreshKeywordSearch,
  getKeywordSearchData,
} from './services/keyword-search-history'
import {
  findBrandExplorerSearch,
  saveBrandExplorerSearch,
  refreshBrandExplorerSearch,
  getBrandExplorerData,
} from './services/brand-explorer-history'
import { prisma, PLACEHOLDER_USER_ID } from './lib/prisma'
import {
  formatHistoryListResponse,
  type HistorySearchItem,
  type SearchResponse,
  type SearchData,
} from './lib/response'

function toSearchResponse(data: SearchData, cached: boolean): SearchResponse {
  return {
    query: data.query,
    searchId: data.id,
    cached,
    summary: data.summary,
    results: data.results,
  }
}

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
        const data = await getKeywordSearchData(existingSearch.id)
        const durationMs = Math.round(performance.now() - startTime)

        searchLogger.info("Search completed (cached)", {
          requestId,
          keyword,
          statusCode: 200,
          durationMs,
          videoCount: data.results.length,
          cached: true,
          searchId: existingSearch.id,
        })

        return c.json(toSearchResponse({ id: existingSearch.id, query: keyword, ...data }, true))
      }

      // Not cached: Fetch videos from TikTok via Apify
      const videos = await searchTikTok(keyword)
      const { results: classifiedResults, errorCount } = await classifyVideos(videos)

      // Save to database - returns data in response format
      const savedSearch = await saveKeywordSearch(keyword, classifiedResults)

      const durationMs = Math.round(performance.now() - startTime)

      searchLogger.info("Search completed", {
        requestId,
        keyword,
        statusCode: 200,
        durationMs,
        videoCount: videos.length,
        classificationErrors: errorCount,
        cached: false,
        searchId: savedSearch.id,
      })

      return c.json(toSearchResponse(savedSearch, false))
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
        const cachedData = await getBrandExplorerData(existingSearch.id)
        const durationMs = Math.round(performance.now() - startTime)

        if (cachedData) {
          brandExplorerLogger.info("Brand explorer request completed (cached)", {
            requestId,
            handle,
            statusCode: 200,
            durationMs,
            totalVideos: cachedData.summary.totalVideos,
            totalInfluencers: cachedData.summary.totalInfluencers,
            totalReach: cachedData.summary.totalReach,
            cached: true,
            searchId: existingSearch.id,
          })

          return c.json(toSearchResponse({ id: existingSearch.id, query: handle, ...cachedData }, true))
        }
      }

      // Not cached: Run brand exploration
      const result = await exploreBrand({ handle })

      // Save to database - returns data in response format
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

      return c.json(toSearchResponse(savedSearch, false))
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

      const items: HistorySearchItem[] = searches.map((search) => ({
        id: search.id,
        type: search.type as "keyword" | "brand_explorer",
        query: search.query,
        createdAt: search.createdAt,
        updatedAt: search.updatedAt,
        resultCount: search.type === 'keyword'
          ? search._count.results
          : search.summary?.totalVideos ?? 0,
        summary: search.summary ?? null,
      }))

      return c.json(formatHistoryListResponse(items))
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
      // Find the search to determine its type
      const search = await prisma.search.findUnique({
        where: { id },
      })

      if (!search) {
        return c.json({ error: 'Search not found' }, 404)
      }

      if (search.type === 'keyword') {
        const data = await getKeywordSearchData(id)
        return c.json(toSearchResponse({ id, query: search.query, ...data }, true))
      }

      const brandData = await getBrandExplorerData(id)
      if (brandData) {
        return c.json(toSearchResponse({ id, query: search.query, ...brandData }, true))
      }

      return c.json({ error: 'Search results not found' }, 404)
    } catch (error) {
      searchLogger.error("Failed to fetch search results", {
        searchId: id,
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Failed to fetch search results' }, 500)
    }
  })
  .delete('/history/:id', async (c) => {
    const { id } = c.req.param()

    try {
      const search = await prisma.search.findUnique({
        where: { id },
      })

      if (!search) {
        return c.json({ error: 'Search not found' }, 404)
      }

      // Delete the search - cascade will handle related records
      await prisma.search.delete({
        where: { id },
      })

      searchLogger.info("Search deleted", { searchId: id })

      return c.json({ success: true })
    } catch (error) {
      searchLogger.error("Failed to delete search", {
        searchId: id,
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Failed to delete search' }, 500)
    }
  })
  .post('/history/:id/refresh', async (c) => {
    const { id } = c.req.param()
    const requestId = crypto.randomUUID()
    const startTime = performance.now()

    try {
      // Find the search to determine its type and query
      const search = await prisma.search.findUnique({
        where: { id },
      })

      if (!search) {
        return c.json({ error: 'Search not found' }, 404)
      }

      if (search.type === 'keyword') {
        const videos = await searchTikTok(search.query)
        const { results: classifiedResults, errorCount } = await classifyVideos(videos)

        // Refresh returns data in response format
        const refreshedData = await refreshKeywordSearch(id, classifiedResults)

        const durationMs = Math.round(performance.now() - startTime)

        searchLogger.info("Search refreshed", {
          requestId,
          keyword: search.query,
          statusCode: 200,
          durationMs,
          videoCount: videos.length,
          classificationErrors: errorCount,
          searchId: id,
        })

        return c.json(toSearchResponse(refreshedData, false))
      } else if (search.type === 'brand_explorer') {
        const result = await exploreBrand({ handle: search.query })

        // Refresh returns data in response format
        const refreshedData = await refreshBrandExplorerSearch(id, result)

        const durationMs = Math.round(performance.now() - startTime)

        brandExplorerLogger.info("Brand explorer refreshed", {
          requestId,
          handle: search.query,
          statusCode: 200,
          durationMs,
          totalVideos: result.summary.totalVideos,
          totalInfluencers: result.summary.totalInfluencers,
          totalReach: result.summary.totalReach,
          searchId: id,
        })

        return c.json(toSearchResponse(refreshedData, false))
      }

      return c.json({ error: 'Unknown search type' }, 400)
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime)

      if (error instanceof ApifyError) {
        searchLogger.error("Refresh failed - Apify error", {
          requestId,
          searchId: id,
          statusCode: 502,
          durationMs,
          errorType: "apify",
          error: error.message,
        })
        return c.json({ error: 'Failed to refresh search', details: error.message }, 502)
      }

      if (error instanceof BrandExplorerError) {
        brandExplorerLogger.error("Refresh failed - Brand explorer error", {
          requestId,
          searchId: id,
          statusCode: 502,
          durationMs,
          errorType: "brand_explorer",
          error: error.message,
        })
        return c.json({ error: 'Failed to refresh search', details: error.message }, 502)
      }

      searchLogger.error("Refresh failed - Internal error", {
        requestId,
        searchId: id,
        statusCode: 500,
        durationMs,
        errorType: "internal",
        error: error instanceof Error ? error.message : String(error),
      })
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

export type AppType = typeof app
export default app
