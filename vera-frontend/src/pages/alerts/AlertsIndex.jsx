import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { AlertFilters } from '@/components/alerts/AlertFilters'
import { DataTable } from '@/components/ui/DataTable'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAlerts } from '@/hooks/useAlerts'
import { PATTERN_LABELS, formatNairaShort, formatDateTime } from '@/utils/formatters'
import { Spinner } from '@/components/ui/Spinner'

const columns = [
  { accessorKey: 'riskLevel', header: 'Risk', cell: ({ getValue }) => <RiskBadge level={getValue()} /> },
  { accessorKey: 'id', header: 'Alert ID', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{getValue()}</span> },
  { accessorKey: 'patternType', header: 'Pattern', cell: ({ getValue }) => <span className="text-sm text-[#F7F9FC]">{PATTERN_LABELS[getValue()] ?? getValue()}</span> },
  { accessorKey: 'entityCount', header: 'Entities', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span> },
  { accessorKey: 'riskScore', header: 'Score', cell: ({ getValue }) => <span className="font-mono text-xs text-[#00D4AA]">{(getValue() * 100).toFixed(0)}%</span> },
  { accessorKey: 'totalVolume', header: 'Volume', cell: ({ getValue }) => <span className="font-mono text-xs">{formatNairaShort(getValue())}</span> },
  { accessorKey: 'detectedAt', header: 'Detected', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{formatDateTime(getValue())}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
]

export default function AlertsIndex() {
  const navigate = useNavigate()
  const { data: alerts, isLoading } = useAlerts()
  const [filters, setFilters] = useState({ status: '', riskLevel: '', patternType: '' })

  const filtered = useMemo(() => {
    if (!alerts) return []
    return alerts.filter((a) => {
      if (filters.status && a.status !== filters.status) return false
      if (filters.riskLevel && a.riskLevel !== filters.riskLevel) return false
      if (filters.patternType && a.patternType !== filters.patternType) return false
      return true
    })
  }, [alerts, filters])

  return (
    <div>
      <PageHeader title="Alerts" subtitle={`${filtered.length} alert${filtered.length !== 1 ? 's' : ''} found`} />
      <AlertFilters filters={filters} onChange={setFilters} />
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(row) => navigate(`/alerts/${row.id}`)}
          rowClassName={(row) =>
            row.riskLevel === 'HIGH' && row.status === 'OPEN'
              ? 'bg-red-500/5 !hover:bg-red-500/10 border-l-2 border-l-red-500/50'
              : undefined
          }
        />
      )}
    </div>
  )
}
