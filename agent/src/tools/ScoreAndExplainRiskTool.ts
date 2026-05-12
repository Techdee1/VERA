import { z } from 'zod'

import type { ToolResult } from '../types/tooling.js'

const recommendationSchema = z.enum(['ESCALATE', 'MONITOR', 'INSUFFICIENT_EVIDENCE'])

const reasoningResultSchema = z.object({
  candidate_id: z.string().min(1),
  entities: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  recommendation: recommendationSchema,
  red_flags: z.array(z.string().min(1)).default([]),
})

const inputSchema = z.object({
  reasoning_results: z.array(reasoningResultSchema).min(1, 'At least one reasoning result is required'),
  adjacency: z.record(z.string(), z.array(z.string())),
  decay_factor: z.number().min(0).max(1).default(0.6),
  baseline_score: z.number().min(0).max(100).default(5),
  max_score: z.number().min(1).max(100).default(100),
})

type ScoreAndExplainRiskInput = z.infer<typeof inputSchema>
type Recommendation = z.infer<typeof recommendationSchema>

type EntityRisk = {
  entity_id: string
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  source: 'direct' | 'indirect' | 'direct_and_indirect'
  explanation: string
  supporting_candidates: string[]
}

type ScoreAndExplainRiskOutput = {
  risks: EntityRisk[]
  summary: {
    entity_count: number
    high_risk_count: number
    medium_risk_count: number
    low_risk_count: number
    propagation_decay: number
  }
}

type RiskAccumulator = {
  direct_score: number
  indirect_score: number
  supporting_candidates: Set<string>
  direct_reasons: string[]
  indirect_reasons: string[]
}

function elapsed(start: number): number {
  return Date.now() - start
}

function recommendationBase(recommendation: Recommendation): number {
  if (recommendation === 'ESCALATE') return 70
  if (recommendation === 'MONITOR') return 40
  return 10
}

function riskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

function ensureAccumulator(record: Map<string, RiskAccumulator>, entityId: string): RiskAccumulator {
  const existing = record.get(entityId)
  if (existing) return existing

  const created: RiskAccumulator = {
    direct_score: 0,
    indirect_score: 0,
    supporting_candidates: new Set<string>(),
    direct_reasons: [],
    indirect_reasons: [],
  }
  record.set(entityId, created)
  return created
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

function buildUndirectedNeighbors(adjacency: Record<string, string[]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()

  for (const [from, tos] of Object.entries(adjacency)) {
    const fromSet = map.get(from) ?? new Set<string>()
    map.set(from, fromSet)

    for (const to of tos) {
      fromSet.add(to)

      const toSet = map.get(to) ?? new Set<string>()
      toSet.add(from)
      map.set(to, toSet)
    }
  }

  return map
}

export class ScoreAndExplainRiskTool {
  name = 'score_and_explain_risk'

  description =
    'Compute direct entity risk from cluster reasoning, propagate risk to one-hop neighbors, and return explainable scored outputs.'

  inputSchema = inputSchema

  async execute(input: ScoreAndExplainRiskInput): Promise<ToolResult<ScoreAndExplainRiskOutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)
      const accumulators = new Map<string, RiskAccumulator>()
      const neighbors = buildUndirectedNeighbors(validInput.adjacency)

      for (const result of validInput.reasoning_results) {
        const base = recommendationBase(result.recommendation)
        const confidenceFactor = result.confidence
        const redFlagBoost = Math.min(15, result.red_flags.length * 2)
        const directContribution = Math.min(
          validInput.max_score,
          validInput.baseline_score + base * confidenceFactor + redFlagBoost
        )

        for (const entityId of result.entities) {
          const acc = ensureAccumulator(accumulators, entityId)
          acc.direct_score = Math.min(validInput.max_score, acc.direct_score + directContribution)
          acc.supporting_candidates.add(result.candidate_id)
          acc.direct_reasons.push(
            `${result.candidate_id} recommended ${result.recommendation} (confidence ${(result.confidence * 100).toFixed(0)}%).`
          )
        }
      }

      for (const [entityId, acc] of accumulators.entries()) {
        if (acc.direct_score <= 0) continue
        const directNeighbors = neighbors.get(entityId)
        if (!directNeighbors) continue

        for (const neighborId of directNeighbors) {
          if (neighborId === entityId) continue
          const propagated = Math.min(validInput.max_score, acc.direct_score * validInput.decay_factor)
          const neighborAcc = ensureAccumulator(accumulators, neighborId)
          neighborAcc.indirect_score = Math.min(
            validInput.max_score,
            neighborAcc.indirect_score + propagated
          )
          for (const candidateId of acc.supporting_candidates) {
            neighborAcc.supporting_candidates.add(`${candidateId}:propagated`)
          }
          neighborAcc.indirect_reasons.push(
            `One-hop propagation from ${entityId} with decay ${validInput.decay_factor.toFixed(2)}.`
          )
        }
      }

      const risks: EntityRisk[] = Array.from(accumulators.entries())
        .map(([entityId, acc]) => {
          const total = Math.min(validInput.max_score, acc.direct_score + acc.indirect_score)

          let source: EntityRisk['source'] = 'indirect'
          if (acc.direct_score > 0 && acc.indirect_score > 0) source = 'direct_and_indirect'
          else if (acc.direct_score > 0) source = 'direct'

          const primaryReason =
            acc.direct_reasons[0] ?? acc.indirect_reasons[0] ?? 'No explicit reason captured.'

          return {
            entity_id: entityId,
            score: Number(total.toFixed(2)),
            level: riskLevel(total),
            source,
            explanation:
              source === 'direct'
                ? `Direct risk: ${primaryReason}`
                : source === 'direct_and_indirect'
                  ? `Direct and propagated risk: ${primaryReason}`
                  : `Indirect risk via connected entities: ${primaryReason}`,
            supporting_candidates: uniqueSorted(acc.supporting_candidates),
          }
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.entity_id.localeCompare(b.entity_id)
        })

      const high = risks.filter((r) => r.level === 'HIGH').length
      const medium = risks.filter((r) => r.level === 'MEDIUM').length
      const low = risks.filter((r) => r.level === 'LOW').length

      return {
        ok: true,
        data: {
          risks,
          summary: {
            entity_count: risks.length,
            high_risk_count: high,
            medium_risk_count: medium,
            low_risk_count: low,
            propagation_decay: validInput.decay_factor,
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
      const message = error instanceof Error ? error.message : 'Unexpected risk scoring failure'

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
