import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EntityProfile } from '@/components/entities/EntityProfile'
import { AlertCard } from '@/components/alerts/AlertCard'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { useEntity } from '@/hooks/useEntities'
import { useAlerts } from '@/hooks/useAlerts'
import { Spinner } from '@/components/ui/Spinner'
import { formatNairaShort } from '@/utils/formatters'
import { deriveRiskLevel } from '@/utils/risk'

export default function EntityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: entity, isLoading } = useEntity(id)
  const { data: alerts } = useAlerts()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!entity) return <div className="text-center py-16 text-[#4B5563]">Entity not found</div>

  const linkedAlerts = alerts?.filter((a) =>
    a.entityIds?.includes(id) || a.entityIds?.includes(entity.id)
  ) ?? []

  const riskScoreByEntityId = new Map()
  ;(alerts ?? []).forEach((alert) => {
    const score = Number.isFinite(alert.riskScore) ? alert.riskScore : 0
    ;(alert.entityIds ?? []).forEach((entityId) => {
      const current = riskScoreByEntityId.get(entityId) ?? 0
      if (score > current) {
        riskScoreByEntityId.set(entityId, score)
      }
    })
  })

  // Build 1-hop graph from entity's neighbors (from backend response)
  const neighbors = entity.neighbors ?? []
  const hopNodes = [
    { id: entity.id, label: entity.canonicalName, type: entity.entityType, risk: entity.riskLevel },
    ...neighbors.map((n) => ({
      id: n.entity_id ?? n.entityId,
      label: n.full_name ?? n.canonicalName ?? n.entity_id,
      type: (n.entity_type ?? n.entityType ?? '').toUpperCase(),
      risk: deriveRiskLevel(riskScoreByEntityId.get(n.entity_id ?? n.entityId) ?? 0),
    })),
  ]
  const hopLinks = neighbors.map((n) => ({
    source: entity.id,
    target: n.entity_id ?? n.entityId,
    value: parseFloat(n.total_amount ?? n.totalAmount ?? 50),
  }))

  return (
    <div>
      <PageHeader backTo="/entities" title={entity.canonicalName} subtitle={entity.id} />

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <EntityProfile entity={entity} />
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2D3748]">
            <p className="text-xs text-[#4B5563] uppercase tracking-wider">1-Hop Network ({hopNodes.length - 1} neighbours)</p>
          </div>
          {hopNodes.length > 1 ? (
            <GraphCanvas
              nodes={hopNodes}
              links={hopLinks}
              height={280}
              onNodeClick={(n) => n.id !== id && navigate(`/entities/${n.id}`)}
            />
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-xs text-[#4B5563]">No connected entities found</p>
            </div>
          )}
        </div>
      </div>

      {/* Neighbour table */}
      {neighbors.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg mb-4 overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2D3748]">
            <p className="text-xs text-[#4B5563] uppercase tracking-wider">Transaction Counterparties</p>
          </div>
          <div className="divide-y divide-[#2D3748]">
            {neighbors.slice(0, 10).map((n) => {
              const nid = n.entity_id ?? n.entityId
              return (
                <button
                  key={nid}
                  onClick={() => navigate(`/entities/${nid}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1C2333] transition-colors text-left"
                >
                  <div>
                    <p className="text-sm text-[#F7F9FC]">{n.full_name ?? n.canonicalName ?? nid}</p>
                    <p className="text-xs text-[#4B5563] font-mono">{nid}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-[#00D4AA]">{formatNairaShort(n.total_amount ?? n.totalAmount ?? 0)}</p>
                    <p className="text-[10px] text-[#4B5563]">{n.transaction_count ?? n.transactionCount ?? 0} txns · {n.relationship}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {linkedAlerts.length > 0 && (
        <div>
          <p className="text-xs text-[#4B5563] uppercase tracking-wider mb-3">Linked Alerts</p>
          <div className="space-y-2">
            {linkedAlerts.map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}
