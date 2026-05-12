import { apiClient } from './client'

export const strApi = {
  getAll: (limit = 100) =>
    apiClient.get(`/str/list?limit=${limit}`).then((r) => r.data),
  getById: (id) =>
    apiClient.get(`/str/${id}`).then((r) => r.data),
  generate: (alertId, reviewerNotes = null) =>
    apiClient.post('/str/generate', {
      alert_id: alertId,
      ...(reviewerNotes ? { reviewer_notes: reviewerNotes } : {}),
    }).then((r) => r.data),
  updateDecision: (id, decision) =>
    apiClient.patch(`/str/${id}/decision`, { decision }).then((r) => r.data),
}
