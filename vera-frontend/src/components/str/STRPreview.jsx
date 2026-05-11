import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/utils/formatters'

export function STRPreview({ str }) {
  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#4B5563] uppercase tracking-wider">Report Info</span>
        <StatusBadge status={str.status} />
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-[#4B5563] text-xs uppercase tracking-wider mb-1">Report ID</p>
          <p className="text-[#F7F9FC] font-mono">{str.id}</p>
        </div>
        <div>
          <p className="text-[#4B5563] text-xs uppercase tracking-wider mb-1">Alert Reference</p>
          <p className="text-[#F7F9FC] font-mono">{str.alertId}</p>
        </div>
        <div>
          <p className="text-[#4B5563] text-xs uppercase tracking-wider mb-1">AI Model</p>
          <p className="text-[#F7F9FC] font-mono">{str.modelVersion}</p>
        </div>
        <div>
          <p className="text-[#4B5563] text-xs uppercase tracking-wider mb-1">Generated</p>
          <p className="text-[#F7F9FC] font-mono">{formatDateTime(str.createdAt)}</p>
        </div>
        <div>
          <p className="text-[#4B5563] text-xs uppercase tracking-wider mb-1">Payload Hash</p>
          <p className="text-[#4B5563] font-mono text-xs break-all">{str.payloadHash}</p>
        </div>
      </div>
    </div>
  )
}
