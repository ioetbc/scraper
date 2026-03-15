import { setupLogging, searchLogger } from './logger'
import app from './index'

const port = 8080

await setupLogging()

searchLogger.info("Server started", { port, url: `http://localhost:${port}` })

export default {
  fetch: app.fetch,
  port,
}
