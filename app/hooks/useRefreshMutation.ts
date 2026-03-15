import { useMutation, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { SearchResponse, BrandExplorerResponse } from '#/types'

const client = hc<AppType>('/')

export type RefreshResult =
  | { type: 'keyword'; data: SearchResponse & { searchId: string; cached: false } }
  | { type: 'brand_explorer'; data: BrandExplorerResponse & { searchId: string; cached: false } }

type UseRefreshMutationOptions = {
  onSuccess?: (result: RefreshResult, searchId: string) => void
}

export function useRefreshMutation(options?: UseRefreshMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['refresh'],
    mutationFn: async (searchId: string): Promise<RefreshResult> => {
      const res = await client.api.history[':id'].refresh.$post({
        param: { id: searchId },
      })
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      // Determine if this is keyword or brand explorer based on response shape
      if ('keyword' in data) {
        return {
          type: 'keyword',
          data: data as SearchResponse & { searchId: string; cached: false },
        }
      }

      return {
        type: 'brand_explorer',
        data: data as BrandExplorerResponse & { searchId: string; cached: false },
      }
    },
    onSuccess: (result, searchId) => {
      // Invalidate history queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['history', searchId] })
      options?.onSuccess?.(result, searchId)
    },
  })
}
