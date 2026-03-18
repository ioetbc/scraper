import { useMutation } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'
import type { SearchResponse } from '#/types'

const client = hc<AppType>('/')

type UseBrandExplorerMutationOptions = {
  onSuccess?: (data: SearchResponse, handle: string) => void
  onError?: (error: Error) => void
}

export function useBrandExplorerMutation(options?: UseBrandExplorerMutationOptions) {
  return useMutation({
    mutationKey: ['brand-explorer'],
    mutationFn: async (handle: string): Promise<SearchResponse> => {
      const res = await client.api['brand-explorer'].$post({
        json: { handle },
      })
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      return data
    },
    onSuccess: (data, handle) => {
      options?.onSuccess?.(data, handle)
    },
    onError: (error) => {
      options?.onError?.(error as Error)
    },
  })
}
