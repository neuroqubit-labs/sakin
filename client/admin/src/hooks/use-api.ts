import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { toastError } from '@/lib/toast'

type ApiParams = Record<string, string | number | boolean | undefined>

export function useApiQuery<T>(
  queryKey: QueryKey,
  path: string,
  params?: ApiParams,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: () => apiClient<T>(path, { params }),
    ...options,
  })
}

interface MutationConfig<TData, TVariables> {
  method?: string
  invalidateKeys?: QueryKey[]
  onSuccess?: (data: TData, variables: TVariables) => void
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  path: string | ((variables: TVariables) => string),
  config: MutationConfig<TData, TVariables> = {},
) {
  const queryClient = useQueryClient()
  const { method = 'POST', invalidateKeys, onSuccess } = config

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const resolvedPath = typeof path === 'function' ? path(variables) : path
      const isBodyMethod = method !== 'GET' && method !== 'DELETE'
      return apiClient<TData>(resolvedPath, {
        method,
        body: isBodyMethod ? JSON.stringify(variables) : undefined,
      })
    },
    onSuccess: (data, variables) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
      onSuccess?.(data, variables)
    },
    onError: (error) => {
      toastError(error)
    },
  })
}
