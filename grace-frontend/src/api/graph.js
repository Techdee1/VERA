import { apiClient } from './client'
import { mockGraphData } from '@/utils/mockData'

export const graphApi = {
  getFullGraph: () => apiClient.get('/graph').then((r) => r.data).catch(() => mockGraphData),
  getSubgraph: (entityIds) => apiClient.post('/graph/subgraph', { entityIds }).then((r) => r.data).catch(() => ({
    nodes: mockGraphData.nodes.filter((n) => entityIds.includes(n.id)),
    links: mockGraphData.links.filter((l) => entityIds.includes(l.source) && entityIds.includes(l.target)),
  })),
}
