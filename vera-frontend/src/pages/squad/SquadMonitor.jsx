import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { SquadMetrics } from '@/components/squad/SquadMetrics'
import { SquadFlowChart } from '@/components/squad/SquadFlowChart'
import { SquadActivityLog } from '@/components/squad/SquadActivityLog'
import { SquadTransactionDrawer } from '@/components/squad/SquadTransactionDrawer'
import { SquadFilingsPanel } from '@/components/squad/SquadFilingsPanel'
import { SquadWebhookLog } from '@/components/squad/SquadWebhookLog'
import { Button } from '@/components/ui/Button'
import { useSquadTransactions, useSquadMetrics, useSquadFilings } from '@/hooks/useSquad'
import { ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'

function exportCsv(transactions) {
  const headers = ['id', 'date', 'from_entity', 'from_name', 'to_entity', 'to_name', 'amount', 'currency', 'channel', 'risk_score', 'reference']
  const rows = transactions.map((t) =>
    [t.id, t.date, t.fromEntity, t.fromEntityName ?? '', t.toEntity, t.toEntityName ?? '',
      t.amount, t.currency, t.channel, t.riskScore, t.reference ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `squad-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TABS = ['Activity', 'Webhooks', 'Filings']

export default function SquadMonitor() {
  const queryClient = useQueryClient()
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('Activity')

  const { data: transactions = [], isLoading: txLoading, dataUpdatedAt } = useSquadTransactions(100)
  const { data: filings, isLoading: filingsLoading } = useSquadFilings()
  const metrics = useSquadMetrics(transactions)

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['squad'] })
    setTimeout(() => setRefreshing(false), 600)
  }

  const lastUpdated = dataUpdatedAt
    ? `Updated ${formatDateTime(new Date(dataUpdatedAt).toISOString())}`
    : null

  return (
    <div>
      <PageHeader
        title="Squad Monitor"
        subtitle="Real-time payment flow · transaction visibility · filing activity"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#2D3748] rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-[#94A3B8]">Live</span>
            </div>
            {lastUpdated && (
              <span className="text-xs text-[#4B5563] hidden lg:block">{lastUpdated}</span>
            )}
            <Button variant="secondary" size="sm" onClick={handleRefresh} loading={refreshing}>
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(transactions)}
              disabled={transactions.length === 0}
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <SquadMetrics metrics={metrics} isLoading={txLoading} />
      </div>

      <div className="mb-6">
        <SquadFlowChart transactions={transactions} isLoading={txLoading} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-[#111827] border border-[#2D3748] rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === tab
                ? 'bg-[#00D4AA]/10 text-[#00D4AA]'
                : 'text-[#4B5563] hover:text-[#94A3B8]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Activity' && (
        <SquadActivityLog
          transactions={transactions}
          isLoading={txLoading}
          onRowClick={setSelectedTxn}
        />
      )}
      {activeTab === 'Webhooks' && <SquadWebhookLog />}
      {activeTab === 'Filings' && (
        <SquadFilingsPanel filings={filings} isLoading={filingsLoading} />
      )}

      <SquadTransactionDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />
    </div>
  )
}
