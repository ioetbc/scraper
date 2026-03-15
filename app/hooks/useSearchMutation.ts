import { useMutation } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { SearchResponse } from '#/types'

const client = hc<AppType>('/')

interface UseSearchMutationOptions {
  onSuccess?: (data: SearchResponse, keyword: string) => void
}

export function useSearchMutation(options?: UseSearchMutationOptions) {
  return useMutation({
    mutationKey: ['search'],
    mutationFn: async (keyword: string): Promise<SearchResponse> => {
      const res = await client.api.search.$post({
        json: { keyword },
      })
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      return data
    },
    onSuccess: (data, keyword) => {
      options?.onSuccess?.(data, keyword)
    },
  })
}
