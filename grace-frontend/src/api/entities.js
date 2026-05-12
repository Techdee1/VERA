import { apiClient } from './client'

export const entitiesApi = {
  getAll: (limit = 200, offset = 0) =>
    apiClient.get(`/entities?limit=${limit}&offset=${offset}`).then((r) => r.data),
  getById: (id) =>
    apiClient.get(`/entities/${id}`).then((r) => r.data),
  getRisk: (id) =>
    apiClient.get(`/entities/${id}/risk`).then((r) => r.data),
}
