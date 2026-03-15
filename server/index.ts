import 'dotenv/config'
import { Hono } from 'hono'
import { searchTikTok, ApifyError } from './services/apify'
import { classifyVideo } from './services/classifier'
import { exploreBrand, BrandExplorerError } from './services/brand-explorer'
import { searchLogger, brandExplorerLogger } from './logger'

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

      // Fetch videos from TikTok via Apify
      const videos = await searchTikTok(keyword)

      // Classify each video for brand promotion
      let classificationErrors = 0
      const results = await Promise.all(
        videos.map(async (video, index) => {
          try {
            const classification = await classifyVideo({
              caption: video.caption,
              mentions: video.mentions,
              hashtags: video.hashtags,
              isAd: video.isAd,
              isSponsored: video.isSponsored,
            })

            // Source of truth: promotion if platform flags it OR classifier deems it
            const isPromotion = video.isAd || video.isSponsored || classification.isPromotion

            // Determine brand - use classifier result, fallback to shop product, then NOT_FOUND
            let brand = classification.brand

            if (isPromotion && !brand) {
              if (video.shopProductUrl) {
                brand = extractBrandFromShopUrl(video.shopProductUrl)
              }
              if (!brand) {
                brand = 'NOT_FOUND'
              }
            }

            return {
              position: index + 1,
              creator: video.creator,
              caption: video.caption,
              videoUrl: video.videoUrl,
              isPromotion,
              isAd: video.isAd,
              isSponsored: video.isSponsored,
              brand,
              confidence: classification.confidence,
              signals: classification.signals,
              tier: classification.tier,
            }
          } catch {
            classificationErrors++
            // Return video with classification error - don't fail the whole search
            return {
              position: index + 1,
              creator: video.creator,
              caption: video.caption,
              videoUrl: video.videoUrl,
              isPromotion: video.isAd || video.isSponsored,
              isAd: video.isAd,
              isSponsored: video.isSponsored,
              brand: (video.isAd || video.isSponsored) ? 'NOT_FOUND' : null,
              confidence: 0,
              signals: ['classification_error'],
              tier: null,
              error: 'Classification failed',
            }
          }
        })
      )

      const durationMs = Math.round(performance.now() - startTime)
      const promotionCount = results.filter(r => r.isPromotion).length
      const brandsFound = [...new Set(results.filter(r => r.brand && r.brand !== 'NOT_FOUND').map(r => r.brand))]

      // Wide event: one comprehensive log per search request
      searchLogger.info("Search completed", {
        requestId,
        keyword,
        statusCode: 200,
        durationMs,
        videoCount: videos.length,
        promotionCount,
        brandsFound,
        brandCount: brandsFound.length,
        classificationErrors,
        tier1Count: results.filter(r => r.tier === 1).length,
        tier2Count: results.filter(r => r.tier === 2).length,
        avgConfidence: results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100) / 100
          : 0,
      })

      return c.json({
        keyword,
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
  .post('/api/brand-explorer', async (c) => {
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

      const result = await exploreBrand({ handle })

      const durationMs = Math.round(performance.now() - startTime)

      brandExplorerLogger.info("Brand explorer request completed", {
        requestId,
        handle,
        statusCode: 200,
        durationMs,
        totalVideos: result.summary.totalVideos,
        totalInfluencers: result.summary.totalInfluencers,
        totalReach: result.summary.totalReach,
      })

      return c.json(result)
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

function extractBrandFromShopUrl(url: string): string | null {
  try {
    // TikTok shop URLs often contain seller/brand info
    // Example: https://www.tiktok.com/view/product/123?shop_id=xxx
    const urlObj = new URL(url)
    const shopId = urlObj.searchParams.get('shop_id')
    if (shopId) {
      return `shop:${shopId}`
    }
    // Try to extract from path
    const pathMatch = url.match(/\/(@[\w.]+)\//)
    if (pathMatch) {
      return pathMatch[1]
    }
    return null
  } catch {
    return null
  }
}

export type AppType = typeof app
export default app
