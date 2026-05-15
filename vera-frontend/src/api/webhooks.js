import { apiClient } from './client'

export const webhooksApi = {
  simulate: (payload = {}) =>
    apiClient.post('/webhooks/squad/simulate', payload).then((r) => r.data),
}
