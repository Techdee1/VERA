import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { riskNodeColor } from '@/utils/riskColors'
import { NodeTooltip } from './NodeTooltip'

export function GraphCanvas({ nodes, links, onNodeClick, height = 500 }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!nodes?.length || !svgRef.current) return

    const el = svgRef.current
    const width = el.clientWidth || 800

    d3.select(el).selectAll('*').remove()

    // Deep clone to prevent D3 from mutating original arrays
    const nodeData = nodes.map((n) => ({ ...n }))
    const linkData = links.map((l) => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
      value: l.value,
    }))

    const svg = d3.select(el).attr('width', width).attr('height', height)
    const g = svg.append('g')

    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => g.attr('transform', e.transform))
    )

    // Glow filter for HIGH risk nodes
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const sim = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30))

    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#2D3748')
      .attr('stroke-width', (d) => Math.sqrt((d.value ?? 50) / 50))
      .attr('stroke-opacity', 0.6)

    const node = g.append('g')
      .selectAll('g')
      .data(nodeData)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r', 10)
      .attr('fill', (d) => riskNodeColor[d.risk] ?? '#3B82F6')
      .attr('fill-opacity', 0.2)
      .attr('stroke', (d) => riskNodeColor[d.risk] ?? '#3B82F6')
      .attr('stroke-width', 2)
      .style('filter', (d) => d.risk === 'HIGH' ? 'url(#glow)' : 'none')

    node.append('text')
      .text((d) => d.label)
      .attr('x', 14)
      .attr('y', 4)
      .attr('fill', '#94A3B8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .style('pointer-events', 'none')

    node
      .on('mouseover', (e, d) => {
        setTooltip({ x: e.offsetX, y: e.offsetY, node: d })
        d3.select(e.currentTarget).select('circle').attr('fill-opacity', 0.5)
      })
      .on('mousemove', (e) => {
        setTooltip((prev) => prev ? { ...prev, x: e.offsetX, y: e.offsetY } : prev)
      })
      .on('mouseout', (e) => {
        setTooltip(null)
        d3.select(e.currentTarget).select('circle').attr('fill-opacity', 0.2)
      })
      .on('click', (e, d) => { e.stopPropagation(); onNodeClick?.(d) })

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [nodes, links, height])

  return (
    <div className="relative w-full" style={{ height }}>
      <svg ref={svgRef} className="w-full h-full" />
      <NodeTooltip node={tooltip?.node} x={tooltip?.x} y={tooltip?.y} />
    </div>
  )
}
