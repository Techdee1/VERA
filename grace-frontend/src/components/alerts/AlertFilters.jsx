export function AlertFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-[#111827] border border-[#2D3748] rounded-lg mb-4">
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-1.5 text-sm text-[#F7F9FC] focus:outline-none focus:border-[#00D4AA]/50"
      >
        <option value="">All Statuses</option>
        <option value="OPEN">Open</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="STR_FILED">STR Filed</option>
        <option value="DISMISSED">Dismissed</option>
      </select>

      <select
        value={filters.riskLevel}
        onChange={(e) => onChange({ ...filters, riskLevel: e.target.value })}
        className="bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-1.5 text-sm text-[#F7F9FC] focus:outline-none focus:border-[#00D4AA]/50"
      >
        <option value="">All Risk Levels</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <select
        value={filters.patternType}
        onChange={(e) => onChange({ ...filters, patternType: e.target.value })}
        className="bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-1.5 text-sm text-[#F7F9FC] focus:outline-none focus:border-[#00D4AA]/50"
      >
        <option value="">All Patterns</option>
        <option value="POS_RING">POS Cash-Out Ring</option>
        <option value="SHELL_WEB">Shell Director Web</option>
        <option value="LAYERED_CHAIN">Layered Transfer Chain</option>
      </select>
    </div>
  )
}
