import assert from 'node:assert/strict'

import { GenerateSTRTool } from '../src/tools/GenerateSTRTool.js'

async function run() {
  const tool = new GenerateSTRTool()

  const result = await tool.execute({
    case_reference: 'CASE-TEST-001',
    reporting_period: '2026-04-24',
    jurisdiction: 'NFIU',
    generated_by: 'GRACE Agent',
    reasoning_results: [
      {
        candidate_id: 'cand-1',
        pattern_type: 'structuring_near_threshold',
        entities: ['A', 'B'],
        confidence: 0.88,
        recommendation: 'ESCALATE',
        red_flags: ['Near-threshold repetition', 'Rapid sequence'],
        rationale_summary: 'Repeated high-value splits suggest structuring behavior.',
      },
      {
        candidate_id: 'cand-2',
        pattern_type: 'hub_conduit_activity',
        entities: ['B', 'C', 'D'],
        confidence: 0.62,
        recommendation: 'MONITOR',
        red_flags: ['High fan-in/out'],
        rationale_summary: 'Hub profile may indicate conduit flow but needs corroboration.',
      },
    ],
    risk_results: [
      {
        entity_id: 'A',
        score: 84.5,
        level: 'HIGH',
        source: 'direct',
        explanation: 'Direct risk from structuring candidate.',
        supporting_candidates: ['cand-1'],
      },
      {
        entity_id: 'B',
        score: 61,
        level: 'MEDIUM',
        source: 'direct_and_indirect',
        explanation: 'Direct and propagated risk from connected entities.',
        supporting_candidates: ['cand-1', 'cand-2'],
      },
    ],
  })

  assert.equal(result.ok, true, 'STR generation should succeed')
  assert.ok(result.data, 'STR result should include data')

  const draft = result.data.str_draft
  assert.equal(draft.status, 'PENDING_REVIEW', 'Draft status must be PENDING_REVIEW')
  assert.equal(draft.jurisdiction, 'NFIU', 'Draft jurisdiction should match input')
  assert.equal(draft.case_reference, 'CASE-TEST-001', 'Case reference should match input')
  assert.ok(
    draft.compliance_notice.includes('PENDING_REVIEW') &&
      draft.compliance_notice.includes('not been filed'),
    'Compliance notice must clearly indicate draft/non-filed state'
  )
  assert.ok(draft.evidence_references.length > 0, 'Evidence references should be populated')
  assert.ok(draft.entities_of_interest.length > 0, 'Entities of interest should be populated')

  const badInput = await tool.execute({
    jurisdiction: 'NFIU',
    generated_by: 'GRACE Agent',
    reasoning_results: [],
    risk_results: [],
  })

  assert.equal(badInput.ok, false, 'Empty input arrays should fail validation')
  assert.equal(badInput.error?.code, 'INVALID_INPUT', 'Expected invalid input error code')

  console.log('GenerateSTRTool tests passed')
}

run().catch((error) => {
  console.error('GenerateSTRTool tests failed:', error)
  process.exit(1)
})
