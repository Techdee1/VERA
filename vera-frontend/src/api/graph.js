import { apiClient } from './client'

export const graphApi = {
  getFullGraph: (limit = 500) => 
    apiClient.get(`/graph?limit=${limit}`).then((r) => r.data),
  getSubgraph: (entityIds) => 
    apiClient.post('/graph/subgraph', { entity_ids: entityIds }).then((r) => r.data),
}
