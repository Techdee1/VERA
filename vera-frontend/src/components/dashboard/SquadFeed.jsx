import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { formatNaira } from '@/utils/formatters'
import { Spinner } from '@/components/ui/Spinner'

function getRiskColor(score) {
  const n = parseFloat(score)
  if (n >= 0.7) return 'border-red-500'
  if (n >= 0.4) return 'border-amber-500'
  return 'border-green-500'
}

function getRelativeTime(isoDate) {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 min ago'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hr ago'
  return `${diffHr} hrs ago`
}

function truncate(str, maxLen) {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

const STEP_LABELS = [
  'Musa Lawal → Shell Co Alpha',
  'Shell Co Alpha → Quick Cash',
  'Quick Cash → Alpha Remit',
  'Alpha Remit → Final Beneficiary',
]

export function SquadFeed() {
  const queryClient = useQueryClient()
  const [simStep, setSimStep] = useState(0) // 0 = idle, 1-4 = in progress, 5 = analyzing, -1 = done
  const [toast, setToast] = useState(null)
  const prevAlertCountRef = useRef(null)
  const fastPollEndRef = useRef(null)
  const stepTimerRef = useRef(null)

  const isSimulating = simStep > 0 && simStep <= 5

  // Tighten alert polling for 30s post-simulation
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiClient.get('/alerts').then(r => r.data),
    refetchInterval: fastPollEndRef.current && Date.now() < fastPollEndRef.current ? 3000 : 15000,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => apiClient.get('/transactions/recent').then(r => r.data),
    refetchInterval: fastPollEndRef.current && Date.now() < fastPollEndRef.current ? 2000 : 8000,
    staleTime: 1500,
  })

  const transactions = Array.isArray(data) ? data : data?.transactions ?? []

  // Detect new alert after simulation
  useEffect(() => {
    const alerts = alertsData?.items ?? alertsData ?? []
    const count = Array.isArray(alerts) ? alerts.length : 0
    if (prevAlertCountRef.current !== null && count > prevAlertCountRef.current && fastPollEndRef.current) {
      const newest = Array.isArray(alerts) ? alerts[0] : null
      setToast({
        message: newest
          ? `New alert: ${newest.pattern_type ?? newest.patternType ?? 'Fraud Pattern'} detected`
          : 'New fraud alert detected',
        type: 'alert',
      })
      setTimeout(() => setToast(null), 6000)
    }
    prevAlertCountRef.current = count
  }, [alertsData])

  async function handleSimulate() {
    if (isSimulating) return

    // Start step counter
    setSimStep(1)
    fastPollEndRef.current = Date.now() + 30_000

    let step = 1
    stepTimerRef.current = setInterval(() => {
      step += 1
      if (step <= 4) {
        setSimStep(step)
      } else if (step === 5) {
        setSimStep(5) // "Analyzing..."
      } else {
        clearInterval(stepTimerRef.current)
        setSimStep(-1) // done
        setTimeout(() => setSimStep(0), 3000)
      }
    }, 2200)

    try {
      await apiClient.post('/webhooks/squad/simulate')
      // Immediately start refreshing
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
    } catch {
      // silent — demo mode
    }
  }

  // Cleanup on unmount
  useEffect(() => () => clearInterval(stepTimerRef.current), [])

  function renderButtonLabel() {
    if (simStep >= 1 && simStep <= 4) {
      return (
        <>
          <span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          Step {simStep}/4 — {STEP_LABELS[simStep - 1]}
        </>
      )
    }
    if (simStep === 5) {
      return (
        <>
          <span className="w-2.5 h-2.5 border border-amber-400 border-t-transparent rounded-full animate-spin" />
          Analyzing pattern…
        </>
      )
    }
    if (simStep === -1) {
      return <>✓ Kano Ring Complete</>
    }
    return <>⚡ Simulate Kano Shell Ring</>
  }

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      {toast && (
        <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
          toast.type === 'alert'
            ? 'bg-red-500/10 border-b border-red-500/30 text-red-400'
            : 'bg-green-500/10 border-b border-green-500/30 text-green-400'
        }`}>
          <span>{toast.type === 'alert' ? '🚨' : '✓'}</span>
          {toast.message}
        </div>
      )}

      <div className="px-4 py-3 border-b border-[#2D3748] flex items-center gap-3">
        <p className="text-xs text-[#4B5563] uppercase tracking-wider font-medium">Squad Live Feed</p>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-70 max-w-[320px] truncate"
          >
            {renderButtonLabel()}
          </button>
        </div>
      </div>

      <div className="divide-y divide-[#2D3748] max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : isError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-400">Feed unavailable. Check connection.</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#94A3B8] mb-2">Waiting for Squad transactions.</p>
            <p className="text-xs text-[#4B5563]">Webhook is listening. Click Simulate to test.</p>
          </div>
        ) : (
          transactions.slice(0, 8).map((txn) => {
            const riskScore = parseFloat(txn.risk_score ?? txn.riskScore ?? 0)
            const borderColor = getRiskColor(riskScore)
            const isSquad = txn.channel === 'squad' || txn.channel === 'squad_payment'
            const senderName = txn.from_entity_name ?? txn.fromEntityName ?? txn.fromEntity ?? txn.from_entity ?? txn.id
            const receiverName = txn.to_entity_name ?? txn.toEntityName ?? txn.toEntity ?? txn.to_entity ?? '—'
            const timestamp = txn.date ?? txn.created_at ?? txn.createdAt

            return (
              <div key={txn.id} className={`px-4 py-3 border-l-4 ${borderColor} hover:bg-[#1C2333] transition-colors`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-[#F7F9FC] font-medium truncate">{truncate(senderName, 20)}</span>
                    <span className="text-[#4B5563]">→</span>
                    <span className="text-sm text-[#F7F9FC] truncate">{truncate(receiverName, 20)}</span>
                  </div>
                  {isSquad && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 ml-2 shrink-0">Squad</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#00D4AA]">{formatNaira(txn.amount ?? 0)}</span>
                  <span className="text-xs text-[#4B5563]">{getRelativeTime(timestamp)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
