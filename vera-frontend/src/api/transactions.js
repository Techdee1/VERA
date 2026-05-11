import { apiClient } from './client'
import { mockTransactions } from '@/utils/mockData'

export const transactionsApi = {
  getByEntity: (entityId) => apiClient.get(`/transactions?entityId=${entityId}`).then((r) => r.data).catch(() => mockTransactions.filter((t) => t.fromEntity === entityId || t.toEntity === entityId)),
  getByAlert: (alertId) => apiClient.get(`/transactions?alertId=${alertId}`).then((r) => r.data).catch(() => mockTransactions),
}
