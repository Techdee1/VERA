import { useQuery } from '@tanstack/react-query'
import { strApi } from '@/api/str'

// Maps backend STR shape → what components expect
export function normaliseSTR(s) {
  return {
    ...s,
    draftContent: s.content_text ?? s.draftContent ?? '',
    status: (s.decision ?? s.status ?? 'pending').toUpperCase(),
    alertId: s.alert_id ?? s.alertId,
    modelVersion: s.model_name ?? s.modelVersion,
    payloadHash: s.payload_hash ?? s.payloadHash ?? '',
    reviewerNotes: s.reviewer_notes ?? s.reviewerNotes ?? '',
    createdAt: s.created_at ?? s.createdAt,
    updatedAt: s.updated_at ?? s.updatedAt ?? s.created_at,
  }
}

export function useSTRs() {
  return useQuery({
    queryKey: ['strs'],
    queryFn: async () => {
      const data = await strApi.getAll()
      const items = data.items ?? data.strs ?? data
      return Array.isArray(items) ? items.map(normaliseSTR) : []
    },
    staleTime: 30_000,
  })
}

export function useSTR(id) {
  return useQuery({
    queryKey: ['str', id],
    queryFn: async () => {
      const data = await strApi.getById(id)
      return normaliseSTR(data)
    },
    enabled: !!id,
  })
}
