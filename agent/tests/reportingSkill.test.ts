import assert from 'node:assert/strict'

import { runReportingSkill } from '../src/skills/reportingSkill.js'
import { runTransactionAnalysis } from '../src/skills/transactionAnalysisSkill.js'

async function run() {
  const csvData = [
    'id,sender_id,receiver_id,amount_ngn,timestamp,channel,sender_bvn,receiver_bvn,sender_name,receiver_name',
    'tx-001,S1,R1,950000,2026-04-24T08:00:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-002,S1,R1,970000,2026-04-24T08:20:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-003,S1,R1,980000,2026-04-24T08:40:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-004,R1,M1,1100000,2026-04-24T09:00:00Z,mobile_money,10987654321,33334444555,R-One,M-One',
  ].join('\n')

  const analysis = await runTransactionAnalysis({
    data: csvData,
    format: 'csv',
    sensitivity: 'medium',
    reason_mode: 'deterministic',
  })

  const noIntent = await runReportingSkill({
    analysis,
    generate_report: false,
  })

  assert.equal(noIntent.ok, false, 'Reporting should require explicit intent')
  if (!noIntent.ok) {
    assert.equal(noIntent.reason, 'INTENT_REQUIRED', 'Expected intent-required failure reason')
  }

  const missingAnalysis = await runReportingSkill({
    analysis: undefined as any,
    generate_report: true,
  } as any)

  assert.equal(missingAnalysis.ok, false, 'Missing analysis should not crash reporting skill')
  if (!missingAnalysis.ok) {
    assert.equal(
      missingAnalysis.reason,
      'ANALYSIS_NOT_READY',
      'Expected ANALYSIS_NOT_READY for missing analysis payload'
    )
  }

  const withIntent = await runReportingSkill({
    analysis,
    generate_report: true,
    case_reference: 'CASE-REPORT-001',
    reporting_period: '2026-04-24',
  })

  assert.equal(withIntent.ok, true, 'Reporting should succeed with explicit intent and valid analysis')
  if (withIntent.ok) {
    assert.equal(withIntent.str_draft.status, 'PENDING_REVIEW', 'STR output must remain pending review')
    assert.ok(
      withIntent.str_draft.compliance_notice.includes('not been filed'),
      'Compliance notice should state non-filed status'
    )
  }

  const withRawData = await runReportingSkill({
    generate_report: true,
    data: csvData,
    format: 'csv',
    sensitivity: 'medium',
    reason_mode: 'deterministic',
    case_reference: 'CASE-REPORT-002',
    reporting_period: '2026-04-24',
  })

  assert.equal(withRawData.ok, true, 'Reporting should also succeed when only raw data is provided')
  if (withRawData.ok) {
    assert.equal(
      withRawData.str_draft.status,
      'PENDING_REVIEW',
      'Raw data path should also produce PENDING_REVIEW draft'
    )
  }

  console.log('reportingSkill tests passed')
}

run().catch((error) => {
  console.error('reportingSkill tests failed:', error)
  process.exit(1)
})
