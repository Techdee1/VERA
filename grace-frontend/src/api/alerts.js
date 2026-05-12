import { apiClient } from './client'

export const alertsApi = {
  getAll: (limit = 500) =>
    apiClient.get(`/alerts?limit=${limit}`).then((r) => r.data),
  getById: (id) =>
    apiClient.get(`/alerts/${id}`).then((r) => r.data),
}
