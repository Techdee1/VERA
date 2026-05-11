import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Badge } from '@/components/ui/Badge'
import { useEntities } from '@/hooks/useEntities'
import { formatDate } from '@/utils/formatters'
import { Spinner } from '@/components/ui/Spinner'

const columns = [
  { accessorKey: 'riskLevel', header: 'Risk', cell: ({ getValue }) => <RiskBadge level={getValue()} /> },
  { accessorKey: 'id', header: 'Entity ID', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{getValue()}</span> },
  { accessorKey: 'canonicalName', header: 'Name', cell: ({ getValue }) => <span className="text-sm text-[#F7F9FC] font-medium">{getValue()}</span> },
  { accessorKey: 'entityType', header: 'Type', cell: ({ getValue }) => <Badge>{getValue()}</Badge> },
  { accessorKey: 'bvn', header: 'BVN', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{getValue() ?? '—'}</span> },
  { accessorKey: 'riskScore', header: 'Score', cell: ({ getValue }) => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-[#1C2333] rounded-full h-1">
        <div className="h-1 rounded-full bg-[#00D4AA]" style={{ width: `${getValue() * 100}%` }} />
      </div>
      <span className="font-mono text-xs">{(getValue() * 100).toFixed(0)}%</span>
    </div>
  )},
  { accessorKey: 'linkedAlerts', header: 'Alerts', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue().length}</span> },
  { accessorKey: 'createdAt', header: 'First Seen', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{formatDate(getValue())}</span> },
]

export default function EntitiesIndex() {
  const navigate = useNavigate()
  const { data: entities, isLoading } = useEntities()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = useMemo(() => {
    if (!entities) return []
    return entities.filter((e) => {
      if (typeFilter && e.entityType !== typeFilter) return false
      if (search && !e.canonicalName.toLowerCase().includes(search.toLowerCase()) && !e.id.includes(search)) return false
      return true
    })
  }, [entities, search, typeFilter])

  return (
    <div>
      <PageHeader title="Entities" subtitle={`${filtered.length} entities`} />

      <div className="flex flex-wrap gap-3 p-4 bg-[#111827] border border-[#2D3748] rounded-lg mb-4">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-1.5 text-sm text-[#F7F9FC] placeholder:text-[#4B5563] focus:outline-none focus:border-[#00D4AA]/50 font-mono flex-1 min-w-48"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-1.5 text-sm text-[#F7F9FC] focus:outline-none focus:border-[#00D4AA]/50"
        >
          <option value="">All Types</option>
          <option value="PERSON">Person</option>
          <option value="BUSINESS">Business</option>
          <option value="ACCOUNT">Account</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <DataTable data={filtered} columns={columns} onRowClick={(row) => navigate(`/entities/${row.id}`)} />
      )}
    </div>
  )
}
