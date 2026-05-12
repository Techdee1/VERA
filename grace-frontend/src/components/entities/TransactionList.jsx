import { formatDateTime, formatNairaShort } from '@/utils/formatters'

const FLAG_COLORS = {
  STRUCTURING: 'text-red-400',
  RAPID_MOVEMENT: 'text-amber-400',
  CIRCULAR: 'text-red-400',
}

export function TransactionList({ transactions }) {
  if (!transactions?.length) return (
    <div className="py-8 text-center text-[#4B5563] text-sm">No transactions found</div>
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2D3748]">
      <table className="w-full text-sm">
        <thead className="bg-[#1C2333]">
          <tr>
            {['Date', 'From', 'To', 'Amount', 'Type', 'Flag'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#4B5563] font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2D3748]">
          {transactions.map((tx) => (
            <tr key={tx.id} className="bg-[#111827] hover:bg-[#1C2333] transition-colors">
              <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">{formatDateTime(tx.date)}</td>
              <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">{tx.fromEntity}</td>
              <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">{tx.toEntity}</td>
              <td className="px-4 py-3 text-[#F7F9FC] font-mono text-xs">{formatNairaShort(tx.amount)}</td>
              <td className="px-4 py-3 text-[#94A3B8] text-xs">{tx.type}</td>
              <td className="px-4 py-3 text-xs">
                <span className={`font-mono font-medium ${FLAG_COLORS[tx.flag] ?? 'text-[#94A3B8]'}`}>{tx.flag}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
