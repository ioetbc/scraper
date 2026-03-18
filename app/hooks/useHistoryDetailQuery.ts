import { useQuery } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { SearchResponse } from '#/types'

const client = hc<AppType>('/')

export function useHistoryDetailQuery(searchId: string | null) {
  return useQuery({
    queryKey: ['history', searchId],
    queryFn: async (): Promise<SearchResponse> => {
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

      return data
    },
    enabled: !!searchId,
  })
}
