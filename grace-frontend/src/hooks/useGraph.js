import { useQuery } from '@tanstack/react-query'
import { mockGraphData } from '@/utils/mockData'

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => Promise.resolve(mockGraphData),
    staleTime: 60_000,
  })
}
