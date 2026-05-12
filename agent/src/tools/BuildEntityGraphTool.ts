import { z } from 'zod'

import type { ToolResult } from '../types/tooling.js'

const transactionSchema = z.object({
  id: z.string().min(1),
  sender_id: z.string().min(1),
  receiver_id: z.string().min(1),
  amount_ngn: z.number().positive(),
  timestamp: z.string().min(1),
  channel: z.string().min(1),
  sender_bvn: z.string().optional(),
  receiver_bvn: z.string().optional(),
})

const inputSchema = z.object({
  transactions: z.array(transactionSchema).min(1, 'At least one transaction is required'),
  top_hubs: z.number().int().min(1).max(20).default(5),
  min_shared_cluster_size: z.number().int().min(2).max(20).default(2),
})

type BuildEntityGraphInput = z.infer<typeof inputSchema>

type GraphNode = {
  entity_id: string
  in_degree: number
  out_degree: number
  tx_count: number
  total_in_ngn: number
  total_out_ngn: number
  unique_counterparties: number
  shared_identifiers: string[]
}

type GraphEdge = {
  from: string
  to: string
  tx_count: number
  total_amount_ngn: number
  first_seen: string
  last_seen: string
  channels: string[]
}

type HubSummary = {
  entity_id: string
  degree: number
  tx_count: number
  total_amount_ngn: number
}

type SharedIdentifierCluster = {
  cluster_id: string
  identifier: string
  entities: string[]
  size: number
}

type BuildEntityGraphOutput = {
  adjacency: Record<string, string[]>
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: {
    entity_count: number
    edge_count: number
    density: number
    hubs_out: HubSummary[]
    hubs_in: HubSummary[]
    shared_identifier_clusters: SharedIdentifierCluster[]
  }
}

type NodeAccumulator = {
  entity_id: string
  tx_count: number
  total_in_ngn: number
  total_out_ngn: number
  counterparties: Set<string>
  identifiers: Set<string>
}

type EdgeAccumulator = {
  from: string
  to: string
  tx_count: number
  total_amount_ngn: number
  first_seen: string
  last_seen: string
  channels: Set<string>
}

function elapsed(start: number): number {
  return Date.now() - start
}

function toEpoch(iso: string): number {
  const epoch = new Date(iso).getTime()
  return Number.isNaN(epoch) ? 0 : epoch
}

function maskLikeIdentifier(value?: string): string | undefined {
  if (!value) return undefined
  const text = value.trim()
  if (!text) return undefined

  if (text.startsWith('***') && text.length >= 4) {
    return text
  }

  const digits = text.replace(/\D/g, '')
  if (digits.length < 4) return undefined
  return `***${digits.slice(-4)}`
}

function getOrInitNode(nodeMap: Map<string, NodeAccumulator>, entityId: string): NodeAccumulator {
  const existing = nodeMap.get(entityId)
  if (existing) return existing

  const created: NodeAccumulator = {
    entity_id: entityId,
    tx_count: 0,
    total_in_ngn: 0,
    total_out_ngn: 0,
    counterparties: new Set<string>(),
    identifiers: new Set<string>(),
  }

  nodeMap.set(entityId, created)
  return created
}

function getOrInitSet(record: Map<string, Set<string>>, key: string): Set<string> {
  const existing = record.get(key)
  if (existing) return existing
  const created = new Set<string>()
  record.set(key, created)
  return created
}

function getOrInitEdge(edgeMap: Map<string, EdgeAccumulator>, from: string, to: string): EdgeAccumulator {
  const key = `${from}::${to}`
  const existing = edgeMap.get(key)
  if (existing) return existing

  const created: EdgeAccumulator = {
    from,
    to,
    tx_count: 0,
    total_amount_ngn: 0,
    first_seen: '',
    last_seen: '',
    channels: new Set<string>(),
  }

  edgeMap.set(key, created)
  return created
}

function sortedList(values: Iterable<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export class BuildEntityGraphTool {
  name = 'build_entity_graph'

  description =
    'Build adjacency graph and graph statistics from normalized transactions, including hub and shared-identifier cluster detection.'

  inputSchema = inputSchema

  async execute(input: BuildEntityGraphInput): Promise<ToolResult<BuildEntityGraphOutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)

      const nodeMap = new Map<string, NodeAccumulator>()
      const edgeMap = new Map<string, EdgeAccumulator>()
      const adjacencyMap = new Map<string, Set<string>>()
      const inNeighbors = new Map<string, Set<string>>()
      const outNeighbors = new Map<string, Set<string>>()
      const identifierToEntities = new Map<string, Set<string>>()

      for (const tx of validInput.transactions) {
        const sender = getOrInitNode(nodeMap, tx.sender_id)
        const receiver = getOrInitNode(nodeMap, tx.receiver_id)

        sender.tx_count += 1
        sender.total_out_ngn += tx.amount_ngn
        sender.counterparties.add(receiver.entity_id)

        receiver.tx_count += 1
        receiver.total_in_ngn += tx.amount_ngn
        receiver.counterparties.add(sender.entity_id)

        const senderIdentifier = maskLikeIdentifier(tx.sender_bvn)
        const receiverIdentifier = maskLikeIdentifier(tx.receiver_bvn)

        if (senderIdentifier) {
          sender.identifiers.add(senderIdentifier)
          getOrInitSet(identifierToEntities, senderIdentifier).add(sender.entity_id)
        }

        if (receiverIdentifier) {
          receiver.identifiers.add(receiverIdentifier)
          getOrInitSet(identifierToEntities, receiverIdentifier).add(receiver.entity_id)
        }

        getOrInitSet(adjacencyMap, sender.entity_id).add(receiver.entity_id)
        getOrInitSet(outNeighbors, sender.entity_id).add(receiver.entity_id)
        getOrInitSet(inNeighbors, receiver.entity_id).add(sender.entity_id)

        const edge = getOrInitEdge(edgeMap, sender.entity_id, receiver.entity_id)
        edge.tx_count += 1
        edge.total_amount_ngn += tx.amount_ngn
        edge.channels.add(tx.channel)

        if (!edge.first_seen || toEpoch(tx.timestamp) < toEpoch(edge.first_seen)) {
          edge.first_seen = tx.timestamp
        }
        if (!edge.last_seen || toEpoch(tx.timestamp) > toEpoch(edge.last_seen)) {
          edge.last_seen = tx.timestamp
        }
      }

      const nodes: GraphNode[] = Array.from(nodeMap.values())
        .map((node) => ({
          entity_id: node.entity_id,
          in_degree: inNeighbors.get(node.entity_id)?.size ?? 0,
          out_degree: outNeighbors.get(node.entity_id)?.size ?? 0,
          tx_count: node.tx_count,
          total_in_ngn: Number(node.total_in_ngn.toFixed(2)),
          total_out_ngn: Number(node.total_out_ngn.toFixed(2)),
          unique_counterparties: node.counterparties.size,
          shared_identifiers: sortedList(node.identifiers),
        }))
        .sort((a, b) => a.entity_id.localeCompare(b.entity_id))

      const edges: GraphEdge[] = Array.from(edgeMap.values())
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          tx_count: edge.tx_count,
          total_amount_ngn: Number(edge.total_amount_ngn.toFixed(2)),
          first_seen: edge.first_seen,
          last_seen: edge.last_seen,
          channels: sortedList(edge.channels),
        }))
        .sort((a, b) => {
          const pairA = `${a.from}::${a.to}`
          const pairB = `${b.from}::${b.to}`
          return pairA.localeCompare(pairB)
        })

      const hubsOut: HubSummary[] = [...nodes]
        .sort((a, b) => {
          if (b.out_degree !== a.out_degree) return b.out_degree - a.out_degree
          if (b.total_out_ngn !== a.total_out_ngn) return b.total_out_ngn - a.total_out_ngn
          return a.entity_id.localeCompare(b.entity_id)
        })
        .slice(0, validInput.top_hubs)
        .map((node) => ({
          entity_id: node.entity_id,
          degree: node.out_degree,
          tx_count: node.tx_count,
          total_amount_ngn: node.total_out_ngn,
        }))

      const hubsIn: HubSummary[] = [...nodes]
        .sort((a, b) => {
          if (b.in_degree !== a.in_degree) return b.in_degree - a.in_degree
          if (b.total_in_ngn !== a.total_in_ngn) return b.total_in_ngn - a.total_in_ngn
          return a.entity_id.localeCompare(b.entity_id)
        })
        .slice(0, validInput.top_hubs)
        .map((node) => ({
          entity_id: node.entity_id,
          degree: node.in_degree,
          tx_count: node.tx_count,
          total_amount_ngn: node.total_in_ngn,
        }))

      const sharedIdentifierClusters: SharedIdentifierCluster[] = Array.from(
        identifierToEntities.entries()
      )
        .filter(([, entities]) => entities.size >= validInput.min_shared_cluster_size)
        .map(([identifier, entities], index) => {
          const members = sortedList(entities)
          return {
            cluster_id: `cluster_${index + 1}`,
            identifier,
            entities: members,
            size: members.length,
          }
        })
        .sort((a, b) => {
          if (b.size !== a.size) return b.size - a.size
          return a.identifier.localeCompare(b.identifier)
        })

      const adjacency = Object.fromEntries(
        Array.from(nodeMap.keys())
          .sort((a, b) => a.localeCompare(b))
          .map((entityId) => [entityId, sortedList(adjacencyMap.get(entityId) ?? [])])
      )

      const entityCount = nodes.length
      const edgeCount = edges.length
      const maxDirectedEdges = entityCount > 1 ? entityCount * (entityCount - 1) : 1
      const density = Number((edgeCount / maxDirectedEdges).toFixed(4))

      return {
        ok: true,
        data: {
          adjacency,
          nodes,
          edges,
          stats: {
            entity_count: entityCount,
            edge_count: edgeCount,
            density,
            hubs_out: hubsOut,
            hubs_in: hubsIn,
            shared_identifier_clusters: sharedIdentifierClusters,
          },
        },
        error: null,
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected graph build failure'

      return {
        ok: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message,
          retryable: false,
        },
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    }
  }
}
