import { useQuery } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { HistoryResponse } from '#/types'

const client = hc<AppType>('/')

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['history'],
    queryFn: async (): Promise<HistoryResponse> => {
      const res = await client.api.history.$get()
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      return data as HistoryResponse
    },
  })
}
