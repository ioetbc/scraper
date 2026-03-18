import { useMutation, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { AppType } from '../../server/index'

const client = hc<AppType>('/')

type UseDeleteSearchMutationOptions = {
  onSuccess?: (searchId: string) => void
}

export function useDeleteSearchMutation(options?: UseDeleteSearchMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['deleteSearch'],
    mutationFn: async (searchId: string): Promise<{ success: boolean }> => {
      const res = await client.api.history[':id'].$delete({
        param: { id: searchId },
      })
      const data = await res.json()

      if ('error' in data) {
        throw new Error((data as { error: string }).error)
      }

      return data as { success: boolean }
    },
    onSuccess: (_, searchId) => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.removeQueries({ queryKey: ['history', searchId] })
      options?.onSuccess?.(searchId)
    },
  })
}
