import 'dotenv/config'
import { Hono } from 'hono'
import { searchTikTok } from './services/apify'
import { classifyVideo } from './services/classifier'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/api/search', async (c) => {
  const body = await c.req.json()
  const { keyword } = body

  if (!keyword || typeof keyword !== 'string') {
    return c.json({ error: 'keyword is required' }, 400)
  }

  console.log(`[Search] Starting search for: "${keyword}"`)

  // Fetch videos from TikTok via Apify
  const videos = await searchTikTok(keyword)
  console.log(`[Search] Found ${videos.length} videos`)

  // Classify each video for brand promotion
  const results = await Promise.all(
    videos.map(async (video, index) => {
      const classification = await classifyVideo({
        caption: video.caption,
        mentions: video.mentions,
        hashtags: video.hashtags,
        isAd: video.isAd,
        isSponsored: video.isSponsored,
      })

      // Source of truth: promotion if platform flags it OR classifier deems it
      const isPromotion = video.isAd || video.isSponsored || classification.isPromotion

      console.log(`[Classify] Video ${index + 1}: ${isPromotion ? `Promotion for ${classification.brand}` : 'Not promotional'} (confidence: ${classification.confidence.toFixed(2)}, tier: ${classification.tier})`)

      return {
        position: index + 1,
        creator: video.creator,
        caption: video.caption,
        isPromotion,
        isAd: video.isAd,
        isSponsored: video.isSponsored,
        brand: classification.brand,
        confidence: classification.confidence,
        signals: classification.signals,
        tier: classification.tier,
      }
    })
  )

  console.log(`[Search] Classification complete`)

  console.log(JSON.stringify(results, null, 2))

  return c.json({
    keyword,
    results,
  })
})

export default app
