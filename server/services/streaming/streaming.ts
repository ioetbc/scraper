import type { SSEStreamingApi } from 'hono/streaming'
import type {
  StreamEvent,
  StreamEventInit,
  StreamEventVideo,
  StreamEventProgress,
  StreamEventComplete,
  StreamEventError,
} from './streaming.types'

// Helper to send a typed SSE event
async function sendEvent(stream: SSEStreamingApi, event: StreamEvent): Promise<void> {
  await stream.writeSSE({
    event: event.type,
    data: JSON.stringify(event),
  })
}

// Typed event helpers for cleaner streaming code
export async function sendInit(stream: SSEStreamingApi, searchId: string): Promise<void> {
  const event: StreamEventInit = { type: 'init', searchId }
  await sendEvent(stream, event)
}

export async function sendVideo(
  stream: SSEStreamingApi,
  data: StreamEventVideo['data']
): Promise<void> {
  const event: StreamEventVideo = { type: 'video', data }
  await sendEvent(stream, event)
}

export async function sendProgress(
  stream: SSEStreamingApi,
  total: number,
  completed: number
): Promise<void> {
  const event: StreamEventProgress = { type: 'progress', total, completed }
  await sendEvent(stream, event)
}

export async function sendComplete(
  stream: SSEStreamingApi,
  summary: StreamEventComplete['summary']
): Promise<void> {
  const event: StreamEventComplete = { type: 'complete', summary }
  await sendEvent(stream, event)
}

export async function sendError(
  stream: SSEStreamingApi,
  message: string,
  videoId?: string
): Promise<void> {
  const event: StreamEventError = { type: 'error', message, videoId }
  await sendEvent(stream, event)
}
