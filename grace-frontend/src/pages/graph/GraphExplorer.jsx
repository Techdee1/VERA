import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { GraphControls } from '@/components/graph/GraphControls'
import { useGraphLayout } from '@/components/graph/useGraphLayout'
import { useGraphData } from '@/hooks/useGraphData'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function GraphExplorer() {
  const navigate = useNavigate()
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [selectedNode, setSelectedNode] = useState(null)
  const [key, setKey] = useState(0)

  const { nodes: rawNodes, links: rawLinks, isLoading } = useGraphData()
  const { nodes, links } = useGraphLayout(riskFilter, { nodes: rawNodes, links: rawLinks })

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="px-6 pt-6 pb-0">
        <PageHeader
          title="Graph Explorer"
          subtitle={`${nodes.length} nodes · ${links.length} edges`}
        />
      </div>

      <GraphControls
        riskFilter={riskFilter}
        onRiskFilterChange={(r) => { setRiskFilter(r); setKey((k) => k + 1) }}
        onReset={() => { setRiskFilter('ALL'); setKey((k) => k + 1) }}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-[#0A0E1A] relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
          ) : (
            <div className="w-full" style={{ height: 'calc(100vh - 220px)' }}>
              <GraphCanvas
                key={key}
                nodes={nodes}
                links={links}
                height={window.innerHeight - 220}
                onNodeClick={setSelectedNode}
              />
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-[#111827]/90 border border-[#2D3748] rounded-lg p-3 flex flex-col gap-1.5">
            {[['HIGH', '#EF4444'], ['MEDIUM', '#F59E0B'], ['LOW', '#22C55E']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color, backgroundColor: color + '33' }} />
                <span className="text-[10px] text-[#94A3B8] font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Detail Panel */}
        {selectedNode && (
          <div className="w-72 bg-[#111827] border-l border-[#2D3748] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#4B5563] uppercase tracking-wider">Node Details</p>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded text-[#4B5563] hover:text-[#F7F9FC] hover:bg-[#1C2333] transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold text-[#F7F9FC]">{selectedNode.label}</p>
                <p className="text-xs text-[#4B5563] font-mono mt-0.5">{selectedNode.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{selectedNode.type}</Badge>
                <RiskBadge level={selectedNode.risk} />
              </div>
              <div className="pt-3 border-t border-[#2D3748]">
                <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(`/entities/${selectedNode.id}`)}>
                  View Entity Profile →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
