import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import { BuildEntityGraphTool } from '../tools/BuildEntityGraphTool.js'
import { DetectPatternsTool } from '../tools/DetectPatternsTool.js'
import { GenerateSTRTool } from '../tools/GenerateSTRTool.js'
import { ParseTransactionsTool } from '../tools/ParseTransactionsTool.js'
import { ReasonAboutClusterTool } from '../tools/ReasonAboutClusterTool.js'
import { ScoreAndExplainRiskTool } from '../tools/ScoreAndExplainRiskTool.js'

type DailyScanInput = {
  data?: string
  format?: 'csv' | 'json'
  sensitivity?: 'low' | 'medium' | 'high'
  reason_mode?: 'deterministic' | 'live'
}

type DailyScanResult = {
  run_id: string
  executed_at: string
  status: 'ANALYZED' | 'NO_CANDIDATES' | 'FAILED'
  input_summary: {
    total_transactions: number
    total_skipped: number
  }
  detection_summary: {
    total_candidates: number
    by_pattern_type: Record<string, number>
  }
  risk_summary: {
    total_entities: number
    high_risk: number
    medium_risk: number
    low_risk: number
  } | null
  str_summary: {
    str_id: string
    status: 'PENDING_REVIEW'
    top_entities: string[]
  } | null
  error: string | null
}

function ensureDailyDataInput(input: DailyScanInput): { data: string; format: 'csv' | 'json' } {
  if (input.data) {
    return {
      data: input.data,
      format: input.format ?? 'csv',
    }
  }

  if (process.env.DAILY_SCAN_DATA) {
    return {
      data: process.env.DAILY_SCAN_DATA,
      format: (process.env.DAILY_SCAN_FORMAT as 'csv' | 'json' | undefined) ?? 'csv',
    }
  }

  throw new Error('No daily scan data provided. Set DAILY_SCAN_DATA or pass input.data.')
}

export async function runDailyTransactionScan(input: DailyScanInput = {}): Promise<DailyScanResult> {
  const runId = `run_${new Date().toISOString().slice(0, 10)}_${randomUUID().slice(0, 8)}`

  const parseTool = new ParseTransactionsTool()
  const graphTool = new BuildEntityGraphTool()
  const detectTool = new DetectPatternsTool()
  const reasonTool = new ReasonAboutClusterTool()
  const riskTool = new ScoreAndExplainRiskTool()
  const strTool = new GenerateSTRTool()

  try {
    const dataset = ensureDailyDataInput(input)

    const parsed = await parseTool.execute({
      data: dataset.data,
      format: dataset.format,
    })

    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error?.message ?? 'Parse stage failed')
    }

    const graph = await graphTool.execute({
      transactions: parsed.data.transactions,
      top_hubs: 5,
      min_shared_cluster_size: 2,
    })

    if (!graph.ok || !graph.data) {
      throw new Error(graph.error?.message ?? 'Graph stage failed')
    }

    const detected = await detectTool.execute({
      transactions: parsed.data.transactions,
      sensitivity: input.sensitivity ?? 'medium',
      min_total_amount_ngn: 1_000_000,
      max_candidates: 15,
    })

    if (!detected.ok || !detected.data) {
      throw new Error(detected.error?.message ?? 'Detection stage failed')
    }

    if (detected.data.candidates.length === 0) {
      return {
        run_id: runId,
        executed_at: new Date().toISOString(),
        status: 'NO_CANDIDATES',
        input_summary: {
          total_transactions: parsed.data.summary.total_parsed,
          total_skipped: parsed.data.summary.total_skipped,
        },
        detection_summary: {
          total_candidates: 0,
          by_pattern_type: detected.data.summary.by_pattern_type,
        },
        risk_summary: null,
        str_summary: null,
        error: null,
      }
    }

    const reasoningResultsForRisk: Array<{
      candidate_id: string
      entities: string[]
      confidence: number
      recommendation: 'ESCALATE' | 'MONITOR' | 'INSUFFICIENT_EVIDENCE'
      red_flags: string[]
    }> = []

    const reasoningResultsForSTR: Array<{
      candidate_id: string
      pattern_type: string
      entities: string[]
      confidence: number
      recommendation: 'ESCALATE' | 'MONITOR' | 'INSUFFICIENT_EVIDENCE'
      red_flags: string[]
      rationale_summary: string
    }> = []

    for (const candidate of detected.data.candidates.slice(0, 8)) {
      const reasoned = await reasonTool.execute({
        candidate,
        execution_mode: input.reason_mode ?? 'deterministic',
      })

      if (!reasoned.ok || !reasoned.data) {
        continue
      }

      reasoningResultsForRisk.push({
        candidate_id: candidate.candidate_id,
        entities: candidate.entities,
        confidence: reasoned.data.confidence,
        recommendation: reasoned.data.recommendation,
        red_flags: reasoned.data.red_flags,
      })

      reasoningResultsForSTR.push({
        candidate_id: candidate.candidate_id,
        pattern_type: candidate.pattern_type,
        entities: candidate.entities,
        confidence: reasoned.data.confidence,
        recommendation: reasoned.data.recommendation,
        red_flags: reasoned.data.red_flags,
        rationale_summary: reasoned.data.rationale_summary,
      })
    }

    if (reasoningResultsForRisk.length === 0) {
      return {
        run_id: runId,
        executed_at: new Date().toISOString(),
        status: 'NO_CANDIDATES',
        input_summary: {
          total_transactions: parsed.data.summary.total_parsed,
          total_skipped: parsed.data.summary.total_skipped,
        },
        detection_summary: {
          total_candidates: detected.data.summary.total_candidates,
          by_pattern_type: detected.data.summary.by_pattern_type,
        },
        risk_summary: null,
        str_summary: null,
        error: 'All reasoning attempts failed; no actionable candidate remained.',
      }
    }

    const risk = await riskTool.execute({
      reasoning_results: reasoningResultsForRisk,
      adjacency: graph.data.adjacency,
      decay_factor: 0.6,
      baseline_score: 5,
      max_score: 100,
    })

    if (!risk.ok || !risk.data) {
      throw new Error(risk.error?.message ?? 'Risk stage failed')
    }

    const str = await strTool.execute({
      jurisdiction: 'NFIU',
      generated_by: 'GRACE Agent Daily Job',
      reasoning_results: reasoningResultsForSTR,
      risk_results: risk.data.risks,
    })

    if (!str.ok || !str.data) {
      throw new Error(str.error?.message ?? 'STR stage failed')
    }

    return {
      run_id: runId,
      executed_at: new Date().toISOString(),
      status: 'ANALYZED',
      input_summary: {
        total_transactions: parsed.data.summary.total_parsed,
        total_skipped: parsed.data.summary.total_skipped,
      },
      detection_summary: {
        total_candidates: detected.data.summary.total_candidates,
        by_pattern_type: detected.data.summary.by_pattern_type,
      },
      risk_summary: {
        total_entities: risk.data.summary.entity_count,
        high_risk: risk.data.summary.high_risk_count,
        medium_risk: risk.data.summary.medium_risk_count,
        low_risk: risk.data.summary.low_risk_count,
      },
      str_summary: {
        str_id: str.data.str_draft.str_id,
        status: str.data.str_draft.status,
        top_entities: str.data.str_draft.entities_of_interest.slice(0, 5).map((e) => e.entity_id),
      },
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown daily scan failure'

    return {
      run_id: runId,
      executed_at: new Date().toISOString(),
      status: 'FAILED',
      input_summary: {
        total_transactions: 0,
        total_skipped: 0,
      },
      detection_summary: {
        total_candidates: 0,
        by_pattern_type: {},
      },
      risk_summary: null,
      str_summary: null,
      error: message,
    }
  }
}

export const dailyTransactionScanJob = {
  name: 'daily-transaction-scan',
  description: 'Daily AML scan producing actionable analysis and STR draft summary.',
  schedule: {
    type: 'cron' as const,
    expression: '0 7 * * *',
    timezone: 'Africa/Lagos',
  },
  execute: async () => {
    const path = process.env.DAILY_SCAN_DATA_PATH
    if (path) {
      const raw = await readFile(path, 'utf8')
      return runDailyTransactionScan({
        data: raw,
        format: (process.env.DAILY_SCAN_FORMAT as 'csv' | 'json' | undefined) ?? 'csv',
        sensitivity: (process.env.DAILY_SCAN_SENSITIVITY as 'low' | 'medium' | 'high' | undefined) ??
          'medium',
        reason_mode:
          (process.env.DAILY_SCAN_REASON_MODE as 'deterministic' | 'live' | undefined) ??
          'deterministic',
      })
    }

    return runDailyTransactionScan({
      sensitivity: (process.env.DAILY_SCAN_SENSITIVITY as 'low' | 'medium' | 'high' | undefined) ??
        'medium',
      reason_mode:
        (process.env.DAILY_SCAN_REASON_MODE as 'deterministic' | 'live' | undefined) ??
        'deterministic',
    })
  },
}
