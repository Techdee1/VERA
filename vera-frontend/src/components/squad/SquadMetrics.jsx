import { motion } from 'framer-motion'
import { formatNairaShort } from '@/utils/formatters'

function Tile({ label, value, sub, accent }) {
  const border = {
    teal:   'border-l-[#00D4AA]',
    red:    'border-l-red-500',
    amber:  'border-l-amber-500',
    blue:   'border-l-blue-500',
  }[accent] ?? 'border-l-[#2D3748]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111827] border border-[#2D3748] border-l-2 ${border} rounded-lg p-4`}
    >
      <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-medium mb-2">{label}</p>
      <p className="text-2xl font-semibold font-mono text-[#F7F9FC]">{value}</p>
      {sub && <p className="text-xs text-[#4B5563] mt-1">{sub}</p>}
    </motion.div>
  )
}

export function SquadMetrics({ metrics, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  const { total, squadCount, squadVolume, totalVolume, highRisk, channelBreakdown } = metrics
  const squadPct = total > 0 ? ((squadCount / total) * 100).toFixed(0) : 0
  const topChannel = Object.entries(channelBreakdown).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile
        label="Total Transactions"
        value={total.toLocaleString()}
        sub={`${formatNairaShort(totalVolume)} total volume`}
        accent="teal"
      />
      <Tile
        label="Squad Channel"
        value={squadCount.toLocaleString()}
        sub={`${squadPct}% of all transactions · ${formatNairaShort(squadVolume)}`}
        accent="blue"
      />
      <Tile
        label="High Risk Flagged"
        value={highRisk.toLocaleString()}
        sub={total > 0 ? `${((highRisk / total) * 100).toFixed(1)}% flag rate` : 'No data'}
        accent={highRisk > 0 ? 'red' : 'teal'}
      />
      <Tile
        label="Top Channel"
        value={topChannel ? topChannel[0].toUpperCase() : '—'}
        sub={topChannel ? `${topChannel[1]} transactions` : 'No data'}
        accent="amber"
      />
    </div>
  )
}
