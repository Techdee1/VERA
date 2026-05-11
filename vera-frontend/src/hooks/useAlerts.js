import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@/api/alerts'
import { deriveRiskLevel } from '@/utils/risk'

// Maps backend snake_case alert shape → camelCase shape components expect
export function normaliseAlert(a) {
  const riskScore = parseFloat(a.risk_score ?? a.riskScore ?? 0)
  return {
    ...a,
    riskScore,
    riskLevel: deriveRiskLevel(riskScore),
    patternType: a.pattern_type ?? a.patternType,
    entityIds: a.entity_ids ?? a.entityIds ?? [],
    transactionIds: a.transaction_ids ?? a.transactionIds ?? [],
    detectedAt: a.created_at ?? a.detectedAt,
    status: (a.status ?? 'open').toUpperCase(),
    subgraphJson: a.subgraph_json ?? a.subgraphJson ?? {},
    reason: a.reason ?? '',
  }
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const data = await alertsApi.getAll()
      const items = data.alerts ?? data.items ?? data
      return Array.isArray(items) ? items.map(normaliseAlert) : []
    },
    staleTime: 30_000,
    refetchInterval: 15_000,
  })
}

export function useAlert(id) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: async () => {
      const data = await alertsApi.getById(id)
      return normaliseAlert(data)
    },
    enabled: !!id,
  })
}
