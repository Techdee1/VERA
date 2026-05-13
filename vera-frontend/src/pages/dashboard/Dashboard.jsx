import { useNavigate } from 'react-router-dom'
import { MetricCard } from '@/components/ui/MetricCard'
import { RiskTrendChart } from '@/components/charts/RiskTrendChart'
import { TransactionVolumeChart } from '@/components/charts/TransactionVolumeChart'
import { AlertCard } from '@/components/alerts/AlertCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { SquadFeed } from '@/components/dashboard/SquadFeed'
import { useAlerts } from '@/hooks/useAlerts'
import { useEntityTotal } from '@/hooks/useEntities'
import { useSTRs } from '@/hooks/useSTR'
import { useResponsibleAiMetrics } from '@/hooks/useResponsibleAi'
import { Spinner } from '@/components/ui/Spinner'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: alerts, isLoading: alertsLoading } = useAlerts()
  const { data: entityTotal, isLoading: entityLoading } = useEntityTotal()
  const { data: strs } = useSTRs()
  const { data: aiMetrics } = useResponsibleAiMetrics()

  const openAlerts = (alerts ?? []).filter((a) => a.status === 'OPEN').length
  const highRiskAlerts = (alerts ?? []).filter((a) => a.riskScore >= 0.7)

  const recentAlerts = (alerts ?? []).filter(
    (a) => new Date(a.detectedAt) > new Date(Date.now() - 86_400_000)
  )

  const highRiskIds = new Set(
    highRiskAlerts.flatMap((a) => a.entityIds ?? [])
  )

  const approvedStrs = (strs ?? []).filter((s) => s.decision === 'approved').length

  const topRisk = highRiskAlerts.length > 0
    ? Math.max(...highRiskAlerts.map((a) => a.riskScore))
    : null

  const falsePositiveRate = aiMetrics?.false_positive_rate ?? null
  const modelFeatures = aiMetrics?.model_feature_list ?? []

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Compliance overview · Live"
        actions={
          <button
            onClick={() => navigate('/graph')}
            className="px-4 py-2 text-sm bg-[#00D4AA]/10 border border-[#00D4AA]/30 text-[#00D4AA] rounded-md hover:bg-[#00D4AA]/20 transition-colors font-medium"
          >
            Open Graph Explorer →
          </button>
        }
      />

      {/* VERA Trust Intelligence Banner */}
      {!alertsLoading && openAlerts > 0 && (
        <div className="mb-5 bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <span className="text-red-400 text-lg font-bold">!</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#F7F9FC]">
              {openAlerts} active fraud {openAlerts === 1 ? 'pattern' : 'patterns'} detected
              {topRisk && <span className="text-red-400 ml-2 font-mono">· highest risk {(topRisk * 100).toFixed(0)}%</span>}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {highRiskIds.size} entities flagged · VERA is monitoring {entityTotal ?? '…'} entities in real time
            </p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-red-400 border border-red-500/30 rounded-md px-3 py-1.5 hover:bg-red-500/10 transition-colors shrink-0"
          >
            Review alerts →
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Entities Monitored"
          value={entityLoading ? '…' : (entityTotal ?? '—')}
          note="Live"
          accent="accent"
        />
        <MetricCard
          label="Open Alerts"
          value={alertsLoading ? '…' : openAlerts}
          delta={
            alertsLoading
              ? undefined
              : recentAlerts.length > 0
              ? `${recentAlerts.length} in last 24h`
              : 'No new alerts today'
          }
          deltaPositive={recentAlerts.length === 0}
          accent="high"
        />
        <MetricCard
          label="High Risk Entities"
          value={alertsLoading ? '…' : highRiskIds.size}
          note="Flagged"
          accent="high"
        />
        <MetricCard
          label="STR Drafts"
          value={strs == null ? '…' : strs.length}
          delta={
            strs == null
              ? undefined
              : approvedStrs > 0
              ? `${approvedStrs} approved`
              : 'Pending review'
          }
          deltaPositive={approvedStrs > 0}
          accent="low"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-5 h-[320px]">
          <p className="text-xs text-[#4B5563] uppercase tracking-wider font-medium mb-3">Detected Pattern Risk Scores</p>
          <RiskTrendChart />
        </div>
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-5 h-[320px]">
          <p className="text-xs text-[#4B5563] uppercase tracking-wider font-medium mb-3">Alert Pipeline Status</p>
          <TransactionVolumeChart />
        </div>
      </div>

      {/* Squad Live Feed */}
      <div className="mb-6">
        <SquadFeed />
      </div>

      {/* Responsible AI strip */}
      {aiMetrics && (
        <div className="mb-6 bg-[#111827] border border-[#2D3748] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#4B5563] uppercase tracking-wider font-medium">VERA Responsible AI</p>
            <button onClick={() => navigate('/responsible-ai')} className="text-xs text-[#00D4AA] hover:underline">
              Full metrics →
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#1C2333] rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono text-[#00D4AA]">
                {falsePositiveRate !== null ? `${(falsePositiveRate * 100).toFixed(1)}%` : '—'}
              </p>
              <p className="text-[10px] text-[#4B5563] mt-1 uppercase tracking-wider">False Positive Rate</p>
            </div>
            <div className="bg-[#1C2333] rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono text-[#F7F9FC]">{aiMetrics.alerts_raised_total ?? 0}</p>
              <p className="text-[10px] text-[#4B5563] mt-1 uppercase tracking-wider">Alerts Raised</p>
            </div>
            <div className="bg-[#1C2333] rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono text-[#F7F9FC]">{aiMetrics.alerts_reviewed_total ?? 0}</p>
              <p className="text-[10px] text-[#4B5563] mt-1 uppercase tracking-wider">Human Reviews</p>
            </div>
            <div className="bg-[#1C2333] rounded-lg p-3 text-center">
              <p className="text-lg font-bold font-mono text-amber-400">{modelFeatures.length}</p>
              <p className="text-[10px] text-[#4B5563] mt-1 uppercase tracking-wider">Model Features</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[#4B5563] uppercase tracking-wider font-medium">Recent Alerts</p>
          <button onClick={() => navigate('/alerts')} className="text-xs text-[#00D4AA] hover:underline">View all →</button>
        </div>
        {alertsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {alerts?.slice(0, 5).map((alert) => <AlertCard key={alert.id} alert={alert} />)}
          </div>
        )}
      </div>
    </div>
  )
}
