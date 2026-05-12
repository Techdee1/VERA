export function AuditTrail({ strId }) {
  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-[#1C2333] border-b border-[#2D3748]">
        <span className="text-xs text-[#4B5563] uppercase tracking-wider">Audit Trail</span>
      </div>
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-[#4B5563] font-mono">Audit trail viewer available in Phase 2.</p>
        <p className="text-[10px] text-[#2D3748] font-mono mt-1">STR ID: {strId}</p>
      </div>
    </div>
  )
}
