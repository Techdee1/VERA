import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import type { ToolResult } from '../types/tooling.js'

const recommendationSchema = z.enum(['ESCALATE', 'MONITOR', 'INSUFFICIENT_EVIDENCE'])

const reasoningSchema = z.object({
  candidate_id: z.string().min(1),
  pattern_type: z.string().min(1),
  entities: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  recommendation: recommendationSchema,
  red_flags: z.array(z.string().min(1)).min(1),
  rationale_summary: z.string().min(1),
})

const riskSchema = z.object({
  entity_id: z.string().min(1),
  score: z.number().min(0).max(100),
  level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  source: z.enum(['direct', 'indirect', 'direct_and_indirect']),
  explanation: z.string().min(1),
  supporting_candidates: z.array(z.string().min(1)).default([]),
})

const inputSchema = z.object({
  case_reference: z.string().min(1).optional(),
  reporting_period: z.string().min(1).optional(),
  jurisdiction: z.string().min(1).default('NFIU'),
  reasoning_results: z.array(reasoningSchema).min(1, 'At least one reasoning result is required'),
  risk_results: z.array(riskSchema).min(1, 'At least one risk result is required'),
  generated_by: z.string().min(1).default('GRACE Agent'),
})

type GenerateSTRInput = z.infer<typeof inputSchema>
type Recommendation = z.infer<typeof recommendationSchema>

type STRDraft = {
  str_id: string
  status: 'PENDING_REVIEW'
  jurisdiction: string
  generated_at: string
  generated_by: string
  case_reference: string
  reporting_period: string
  executive_summary: string
  suspicion_basis: string[]
  entities_of_interest: Array<{
    entity_id: string
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
    risk_score: number
    source: 'direct' | 'indirect' | 'direct_and_indirect'
    explanation: string
  }>
  narrative: {
    background: string
    transaction_activity: string
    analytical_findings: string
    recommendation: string
  }
  evidence_references: string[]
  compliance_notice: string
}

type GenerateSTROutput = {
  str_draft: STRDraft
}

function elapsed(start: number): number {
  return Date.now() - start
}

function recommendationRank(rec: Recommendation): number {
  if (rec === 'ESCALATE') return 3
  if (rec === 'MONITOR') return 2
  return 1
}

function topReasoning(input: GenerateSTRInput) {
  return [...input.reasoning_results].sort((a, b) => {
    const recDiff = recommendationRank(b.recommendation) - recommendationRank(a.recommendation)
    if (recDiff !== 0) return recDiff
    return b.confidence - a.confidence
  })
}

function topRisk(input: GenerateSTRInput) {
  return [...input.risk_results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.entity_id.localeCompare(b.entity_id)
  })
}

function caseReference(input: GenerateSTRInput): string {
  if (input.case_reference) return input.case_reference
  return `CASE-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8).toUpperCase()}`
}

function reportingPeriod(input: GenerateSTRInput): string {
  if (input.reporting_period) return input.reporting_period
  return new Date().toISOString().slice(0, 10)
}

export class GenerateSTRTool {
  name = 'generate_str'

  description =
    'Generate a structured Suspicious Transaction Report draft with narrative and evidence references for human compliance review.'

  inputSchema = inputSchema

  async execute(input: GenerateSTRInput): Promise<ToolResult<GenerateSTROutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)
      const rankedReasoning = topReasoning(validInput)
      const rankedRisk = topRisk(validInput)

      const highestReasoning = rankedReasoning[0]
      if (!highestReasoning) {
        throw new Error('No reasoning result available after ranking')
      }

      const highRiskEntities = rankedRisk.filter((entity) => entity.level === 'HIGH')
      const mediumRiskEntities = rankedRisk.filter((entity) => entity.level === 'MEDIUM')

      const suspicionBasis = rankedReasoning.slice(0, 5).map((entry) => {
        return `${entry.pattern_type} (${entry.candidate_id}) recommendation ${entry.recommendation} at confidence ${Math.round(entry.confidence * 100)}%.`
      })

      const evidenceRefs = new Set<string>()
      for (const reason of rankedReasoning) {
        evidenceRefs.add(`candidate:${reason.candidate_id}`)
      }
      for (const entityRisk of rankedRisk) {
        evidenceRefs.add(`entity:${entityRisk.entity_id}`)
      }

      const strDraft: STRDraft = {
        str_id: `STR-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8).toUpperCase()}`,
        status: 'PENDING_REVIEW',
        jurisdiction: validInput.jurisdiction,
        generated_at: new Date().toISOString(),
        generated_by: validInput.generated_by,
        case_reference: caseReference(validInput),
        reporting_period: reportingPeriod(validInput),
        executive_summary:
          highestReasoning.recommendation === 'ESCALATE'
            ? `Potentially suspicious activity detected across ${highestReasoning.entities.length} primary entity(ies), requiring compliance escalation review.`
            : 'Suspicious indicators were detected and require analyst validation before escalation decision.',
        suspicion_basis: suspicionBasis,
        entities_of_interest: rankedRisk.slice(0, 10).map((item) => ({
          entity_id: item.entity_id,
          risk_level: item.level,
          risk_score: Number(item.score.toFixed(2)),
          source: item.source,
          explanation: item.explanation,
        })),
        narrative: {
          background: `This draft was generated from automated AML analysis for jurisdiction ${validInput.jurisdiction}. The highest-priority pattern was ${highestReasoning.pattern_type} with recommendation ${highestReasoning.recommendation}.`,
          transaction_activity: `The analysis evaluated ${rankedReasoning.length} suspicious candidate cluster(s) and ${rankedRisk.length} entity risk profile(s). High-risk entities: ${highRiskEntities.length}; medium-risk entities: ${mediumRiskEntities.length}.`,
          analytical_findings: rankedReasoning
            .slice(0, 3)
            .map(
              (item, idx) =>
                `${idx + 1}. ${item.pattern_type} (${item.candidate_id}) - ${item.rationale_summary}`
            )
            .join(' '),
          recommendation:
            highestReasoning.recommendation === 'ESCALATE'
              ? 'Escalate this STR draft for immediate analyst and compliance officer review prior to any regulatory action.'
              : highestReasoning.recommendation === 'MONITOR'
                ? 'Place entities under enhanced monitoring and collect corroborating KYC/transaction purpose evidence.'
                : 'Maintain watchlist monitoring until additional corroborating evidence is obtained.',
        },
        evidence_references: Array.from(evidenceRefs).sort((a, b) => a.localeCompare(b)),
        compliance_notice:
          'PENDING_REVIEW: This is an AI-assisted draft for human compliance review only. It has not been filed with any regulator.',
      }

      return {
        ok: true,
        data: {
          str_draft: strDraft,
        },
        error: null,
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected STR generation failure'

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
