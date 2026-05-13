import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => apiClient.get('/graph').then((r) => r.data),
    staleTime: 60_000,
  })
}
