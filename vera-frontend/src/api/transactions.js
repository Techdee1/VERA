import { apiClient } from './client'

export const transactionsApi = {
  getByEntity: (entityId) => apiClient.get(`/transactions?entityId=${entityId}`).then((r) => r.data),
  getByAlert: (alertId) => apiClient.get(`/transactions?alertId=${alertId}`).then((r) => r.data),
}
