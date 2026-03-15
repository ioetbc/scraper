import { useQuery } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { SearchResult, BrandExplorerResponse } from '#/types'

const client = hc<AppType>('/')

export type HistoryDetailResult =
  | { type: 'keyword'; results: SearchResult[] }
  | { type: 'brand_explorer'; data: BrandExplorerResponse }

export function useHistoryDetailQuery(searchId: string | null) {
  return useQuery({
    queryKey: ['history', searchId],
    queryFn: async (): Promise<HistoryDetailResult> => {
      if (!searchId) {
        throw new Error('No search ID provided')
      }

      const res = await client.api.history[':id'].$get({
        param: { id: searchId },
      })
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      // Determine if this is keyword results (array) or brand explorer (object with brand)
      if (Array.isArray(data)) {
        return { type: 'keyword', results: data as SearchResult[] }
      }

      return { type: 'brand_explorer', data: data as BrandExplorerResponse }
    },
    enabled: !!searchId,
  })
}
