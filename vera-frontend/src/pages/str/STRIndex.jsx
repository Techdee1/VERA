import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useSTRs } from '@/hooks/useSTR'
import { formatDateTime } from '@/utils/formatters'
import { Spinner } from '@/components/ui/Spinner'

const columns = [
  { accessorKey: 'id', header: 'STR ID', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{getValue()}</span> },
  { accessorKey: 'alertId', header: 'Alert Ref', cell: ({ getValue }) => <span className="font-mono text-xs text-[#00D4AA]">{getValue()}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
  { accessorKey: 'modelVersion', header: 'AI Model', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{getValue()}</span> },
  { accessorKey: 'createdAt', header: 'Generated', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{formatDateTime(getValue())}</span> },
  { accessorKey: 'updatedAt', header: 'Last Updated', cell: ({ getValue }) => <span className="font-mono text-xs text-[#94A3B8]">{formatDateTime(getValue())}</span> },
]

export default function STRIndex() {
  const navigate = useNavigate()
  const { data: strs, isLoading } = useSTRs()

  return (
    <div>
      <PageHeader title="STR Reports" subtitle={`${strs?.length ?? 0} reports`} />
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <DataTable data={strs ?? []} columns={columns} onRowClick={(row) => navigate(`/str/${row.id}`)} />
      )}
    </div>
  )
}
