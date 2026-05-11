export type AnalysisStatus = 'ANALYZED' | 'NO_CANDIDATES' | 'FAILED'

export type AnalysisReasoningResult = {
  candidate_id: string
  pattern_type: string
  entities: string[]
  confidence: number
  recommendation: 'ESCALATE' | 'MONITOR' | 'INSUFFICIENT_EVIDENCE'
  red_flags: string[]
  rationale_summary: string
}

export type AnalysisRiskResult = {
  entity_id: string
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  source: 'direct' | 'indirect' | 'direct_and_indirect'
  explanation: string
  supporting_candidates: string[]
}

export type TransactionAnalysisResult = {
  status: AnalysisStatus
  message: string
  parsed_summary: {
    total_parsed: number
    total_skipped: number
  }
  graph_summary: {
    entity_count: number
    edge_count: number
    density: number
  }
  candidates: Array<{
    candidate_id: string
    pattern_type: string
    entities: string[]
    score: number
  }>
  reasoning_results: AnalysisReasoningResult[]
  risk_results: AnalysisRiskResult[]
}
