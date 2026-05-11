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

const sensitivitySchema = z.enum(['low', 'medium', 'high'])

const inputSchema = z.object({
  transactions: z.array(transactionSchema).min(1, 'At least one transaction is required'),
  sensitivity: sensitivitySchema.default('medium'),
  min_total_amount_ngn: z.number().positive().default(1_000_000),
  max_candidates: z.number().int().min(1).max(100).default(25),
})

type DetectPatternsInput = z.infer<typeof inputSchema>

type PatternType =
  | 'shared_identifier_cluster'
  | 'structuring_near_threshold'
  | 'rapid_in_out_flow'
  | 'hub_conduit_activity'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

type PatternCandidate = {
  candidate_id: string
  pattern_type: PatternType
  entities: string[]
  score: number
  confidence_hint: number
  risk_level: RiskLevel
  evidence_snippets: string[]
  metrics: Record<string, number | string>
}

type DetectPatternsOutput = {
  candidates: PatternCandidate[]
  summary: {
    total_candidates: number
    by_pattern_type: Record<PatternType, number>
    sensitivity: z.infer<typeof sensitivitySchema>
    heuristics_version: string
  }
}

type SensitivityProfile = {
  shared_identifier_min_entities: number
  structuring_min_count: number
  structuring_lower_bound: number
  structuring_upper_bound: number
  rapid_window_minutes: number
  rapid_min_outflow_ratio: number
  rapid_min_count: number
  hub_min_in_degree: number
  hub_min_out_degree: number
  minimum_score: number
}

const SENSITIVITY_PROFILES: Record<z.infer<typeof sensitivitySchema>, SensitivityProfile> = {
  low: {
    shared_identifier_min_entities: 3,
    structuring_min_count: 4,
    structuring_lower_bound: 900_000,
    structuring_upper_bound: 1_000_000,
    rapid_window_minutes: 90,
    rapid_min_outflow_ratio: 0.9,
    rapid_min_count: 2,
    hub_min_in_degree: 3,
    hub_min_out_degree: 3,
    minimum_score: 3,
  },
  medium: {
    shared_identifier_min_entities: 2,
    structuring_min_count: 3,
    structuring_lower_bound: 900_000,
    structuring_upper_bound: 1_000_000,
    rapid_window_minutes: 120,
    rapid_min_outflow_ratio: 0.85,
    rapid_min_count: 2,
    hub_min_in_degree: 2,
    hub_min_out_degree: 2,
    minimum_score: 2,
  },
  high: {
    shared_identifier_min_entities: 2,
    structuring_min_count: 2,
    structuring_lower_bound: 850_000,
    structuring_upper_bound: 1_000_000,
    rapid_window_minutes: 180,
    rapid_min_outflow_ratio: 0.75,
    rapid_min_count: 1,
    hub_min_in_degree: 1,
    hub_min_out_degree: 1,
    minimum_score: 1,
  },
}

function elapsed(start: number): number {
  return Date.now() - start
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

function isoToEpoch(iso: string): number | null {
  const epoch = new Date(iso).getTime()
  return Number.isNaN(epoch) ? null : epoch
}

function rankToRisk(score: number): RiskLevel {
  if (score >= 5) return 'HIGH'
  if (score >= 3) return 'MEDIUM'
  return 'LOW'
}

function confidenceFromScore(score: number): number {
  return Number(Math.min(0.95, 0.45 + score * 0.1).toFixed(2))
}

function incrementCounter<K extends string>(counter: Record<K, number>, key: K): void {
  counter[key] = (counter[key] ?? 0) + 1
}

function sorted(values: Iterable<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export class DetectPatternsTool {
  name = 'detect_patterns'

  description =
    'Apply deterministic AML heuristics to prefilter suspicious transaction clusters before LLM reasoning.'

  inputSchema = inputSchema

  async execute(input: DetectPatternsInput): Promise<ToolResult<DetectPatternsOutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)
      const profile = SENSITIVITY_PROFILES[validInput.sensitivity]

      const candidates: PatternCandidate[] = []

      const patternCounts: Record<PatternType, number> = {
        shared_identifier_cluster: 0,
        structuring_near_threshold: 0,
        rapid_in_out_flow: 0,
        hub_conduit_activity: 0,
      }

      const identifierToEntities = new Map<string, Set<string>>()
      const pairNearThreshold = new Map<string, { count: number; total: number; txIds: string[] }>()

      type TxEvent = {
        id: string
        entity_id: string
        direction: 'in' | 'out'
        amount_ngn: number
        epoch: number
        counterparty: string
      }

      const eventsByEntity = new Map<string, TxEvent[]>()
      const inNeighbors = new Map<string, Set<string>>()
      const outNeighbors = new Map<string, Set<string>>()

      for (const tx of validInput.transactions) {
        const maskedSender = maskLikeIdentifier(tx.sender_bvn)
        const maskedReceiver = maskLikeIdentifier(tx.receiver_bvn)

        if (maskedSender) {
          const bucket = identifierToEntities.get(maskedSender) ?? new Set<string>()
          bucket.add(tx.sender_id)
          identifierToEntities.set(maskedSender, bucket)
        }

        if (maskedReceiver) {
          const bucket = identifierToEntities.get(maskedReceiver) ?? new Set<string>()
          bucket.add(tx.receiver_id)
          identifierToEntities.set(maskedReceiver, bucket)
        }

        if (
          tx.amount_ngn >= profile.structuring_lower_bound &&
          tx.amount_ngn < profile.structuring_upper_bound
        ) {
          const key = `${tx.sender_id}::${tx.receiver_id}`
          const entry = pairNearThreshold.get(key) ?? { count: 0, total: 0, txIds: [] }
          entry.count += 1
          entry.total += tx.amount_ngn
          if (entry.txIds.length < 3) {
            entry.txIds.push(tx.id)
          }
          pairNearThreshold.set(key, entry)
        }

        const epoch = isoToEpoch(tx.timestamp)
        if (epoch !== null) {
          const senderEvents = eventsByEntity.get(tx.sender_id) ?? []
          senderEvents.push({
            id: tx.id,
            entity_id: tx.sender_id,
            direction: 'out',
            amount_ngn: tx.amount_ngn,
            epoch,
            counterparty: tx.receiver_id,
          })
          eventsByEntity.set(tx.sender_id, senderEvents)

          const receiverEvents = eventsByEntity.get(tx.receiver_id) ?? []
          receiverEvents.push({
            id: tx.id,
            entity_id: tx.receiver_id,
            direction: 'in',
            amount_ngn: tx.amount_ngn,
            epoch,
            counterparty: tx.sender_id,
          })
          eventsByEntity.set(tx.receiver_id, receiverEvents)
        }

        const outSet = outNeighbors.get(tx.sender_id) ?? new Set<string>()
        outSet.add(tx.receiver_id)
        outNeighbors.set(tx.sender_id, outSet)

        const inSet = inNeighbors.get(tx.receiver_id) ?? new Set<string>()
        inSet.add(tx.sender_id)
        inNeighbors.set(tx.receiver_id, inSet)
      }

      for (const [identifier, entities] of identifierToEntities.entries()) {
        if (entities.size < profile.shared_identifier_min_entities) continue

        const members = sorted(entities)
        const score = Math.min(6, 2 + members.length)

        const candidate: PatternCandidate = {
          candidate_id: `shared_identifier_cluster::${identifier}`,
          pattern_type: 'shared_identifier_cluster',
          entities: members,
          score,
          confidence_hint: confidenceFromScore(score),
          risk_level: rankToRisk(score),
          evidence_snippets: [
            `Identifier ${identifier} appears across ${members.length} entities.`,
            `Linked entities: ${members.join(', ')}.`,
          ],
          metrics: {
            shared_identifier: identifier,
            entity_count: members.length,
          },
        }

        if (candidate.score >= profile.minimum_score) {
          candidates.push(candidate)
          incrementCounter(patternCounts, candidate.pattern_type)
        }
      }

      for (const [pairKey, entry] of pairNearThreshold.entries()) {
        if (entry.count < profile.structuring_min_count) continue
        if (entry.total < validInput.min_total_amount_ngn) continue

        const [sender, receiver] = pairKey.split('::')
        const entities = [sender ?? '', receiver ?? ''].filter((v) => v.length > 0)

        const score = Math.min(6, 2 + entry.count)
        const candidate: PatternCandidate = {
          candidate_id: `structuring_near_threshold::${pairKey}`,
          pattern_type: 'structuring_near_threshold',
          entities,
          score,
          confidence_hint: confidenceFromScore(score),
          risk_level: rankToRisk(score),
          evidence_snippets: [
            `${entry.count} transfers from ${sender} to ${receiver} near reporting threshold.`,
            `Total near-threshold value: NGN ${entry.total.toFixed(2)}.`,
            `Sample tx ids: ${entry.txIds.join(', ')}.`,
          ],
          metrics: {
            transaction_count: entry.count,
            total_amount_ngn: Number(entry.total.toFixed(2)),
          },
        }

        if (candidate.score >= profile.minimum_score) {
          candidates.push(candidate)
          incrementCounter(patternCounts, candidate.pattern_type)
        }
      }

      for (const [entityId, events] of eventsByEntity.entries()) {
        if (events.length < 2) continue

        const sortedEvents = [...events].sort((a, b) => a.epoch - b.epoch)
        let windowHitCount = 0
        let inboundTotal = 0
        let outboundWithinWindowTotal = 0
        let sampleIn: string | null = null
        let sampleOut: string | null = null

        for (const ev of sortedEvents) {
          if (ev.direction !== 'in') continue
          inboundTotal += ev.amount_ngn

          const windowLimit = ev.epoch + profile.rapid_window_minutes * 60_000
          for (const nextEv of sortedEvents) {
            if (nextEv.direction !== 'out') continue
            if (nextEv.epoch < ev.epoch || nextEv.epoch > windowLimit) continue
            outboundWithinWindowTotal += nextEv.amount_ngn
            windowHitCount += 1
            if (!sampleIn) sampleIn = ev.id
            if (!sampleOut) sampleOut = nextEv.id
          }
        }

        if (windowHitCount < profile.rapid_min_count) continue
        if (inboundTotal <= 0) continue

        const outflowRatio = outboundWithinWindowTotal / inboundTotal
        if (outflowRatio < profile.rapid_min_outflow_ratio) continue

        const score = Math.min(6, 2 + Math.round(outflowRatio * 3))
        const candidate: PatternCandidate = {
          candidate_id: `rapid_in_out_flow::${entityId}`,
          pattern_type: 'rapid_in_out_flow',
          entities: [entityId],
          score,
          confidence_hint: confidenceFromScore(score),
          risk_level: rankToRisk(score),
          evidence_snippets: [
            `${entityId} moved ${Math.round(outflowRatio * 100)}% of inbound value within ${profile.rapid_window_minutes} minutes.`,
            `Window hits: ${windowHitCount}. Sample flow tx: ${sampleIn ?? 'n/a'} -> ${sampleOut ?? 'n/a'}.`,
          ],
          metrics: {
            outflow_ratio: Number(outflowRatio.toFixed(3)),
            inbound_total_ngn: Number(inboundTotal.toFixed(2)),
            outbound_within_window_ngn: Number(outboundWithinWindowTotal.toFixed(2)),
            window_hits: windowHitCount,
          },
        }

        if (candidate.score >= profile.minimum_score) {
          candidates.push(candidate)
          incrementCounter(patternCounts, candidate.pattern_type)
        }
      }

      const allEntities = new Set<string>()
      for (const tx of validInput.transactions) {
        allEntities.add(tx.sender_id)
        allEntities.add(tx.receiver_id)
      }

      for (const entityId of allEntities) {
        const inDegree = inNeighbors.get(entityId)?.size ?? 0
        const outDegree = outNeighbors.get(entityId)?.size ?? 0

        if (inDegree < profile.hub_min_in_degree || outDegree < profile.hub_min_out_degree) {
          continue
        }

        const score = Math.min(6, 1 + inDegree + outDegree)
        const linkedEntities = new Set<string>([
          ...(inNeighbors.get(entityId) ?? new Set<string>()),
          ...(outNeighbors.get(entityId) ?? new Set<string>()),
        ])

        const candidate: PatternCandidate = {
          candidate_id: `hub_conduit_activity::${entityId}`,
          pattern_type: 'hub_conduit_activity',
          entities: [entityId, ...sorted(linkedEntities)],
          score,
          confidence_hint: confidenceFromScore(score),
          risk_level: rankToRisk(score),
          evidence_snippets: [
            `${entityId} has in-degree ${inDegree} and out-degree ${outDegree}.`,
            `Connected counterparties: ${sorted(linkedEntities).join(', ')}.`,
          ],
          metrics: {
            in_degree: inDegree,
            out_degree: outDegree,
            counterparties: linkedEntities.size,
          },
        }

        if (candidate.score >= profile.minimum_score) {
          candidates.push(candidate)
          incrementCounter(patternCounts, candidate.pattern_type)
        }
      }

      const deduped = new Map<string, PatternCandidate>()
      for (const candidate of candidates) {
        if (!deduped.has(candidate.candidate_id)) {
          deduped.set(candidate.candidate_id, candidate)
        }
      }

      const finalCandidates = Array.from(deduped.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          if (a.pattern_type !== b.pattern_type) return a.pattern_type.localeCompare(b.pattern_type)
          return a.candidate_id.localeCompare(b.candidate_id)
        })
        .slice(0, validInput.max_candidates)

      const finalPatternCounts: Record<PatternType, number> = {
        shared_identifier_cluster: 0,
        structuring_near_threshold: 0,
        rapid_in_out_flow: 0,
        hub_conduit_activity: 0,
      }
      for (const candidate of finalCandidates) {
        incrementCounter(finalPatternCounts, candidate.pattern_type)
      }

      return {
        ok: true,
        data: {
          candidates: finalCandidates,
          summary: {
            total_candidates: finalCandidates.length,
            by_pattern_type: finalPatternCounts,
            sensitivity: validInput.sensitivity,
            heuristics_version: '1.0.0',
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
      const message = error instanceof Error ? error.message : 'Unexpected pattern detection failure'

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
