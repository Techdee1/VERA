import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { transactionIntakeWebhook } from '../src/webhooks/transactionIntakeWebhook.js'

async function run() {
  const csvData = readFileSync('tests/fixtures/analysis-positive.csv', 'utf8')

  const analysisOnly = await transactionIntakeWebhook.execute(
    { source: 'unit-test' },
    {},
    {
      data: csvData,
      format: 'csv',
      sensitivity: 'medium',
      reason_mode: 'deterministic',
      generate_report: false,
    }
  )

  assert.equal(analysisOnly.success, true, 'Webhook should succeed for valid analysis payload')
  assert.equal(
    analysisOnly.analysis_status,
    'ANALYZED',
    'Webhook should produce ANALYZED status for positive fixture'
  )
  assert.equal(analysisOnly.report, null, 'Report should be null when generate_report is false')

  const withReport = await transactionIntakeWebhook.execute(
    { source: 'unit-test' },
    {},
    {
      data: csvData,
      format: 'csv',
      sensitivity: 'medium',
      reason_mode: 'deterministic',
      generate_report: true,
      case_reference: 'CASE-WEBHOOK-001',
      reporting_period: '2026-04-24',
    }
  )

  assert.equal(withReport.success, true, 'Webhook report path should succeed')
  assert.equal(withReport.analysis_status, 'ANALYZED', 'Webhook report path must analyze first')
  assert.ok(withReport.report, 'Report object should be present when requested')

  if (withReport.report.ok) {
    assert.equal(
      withReport.report.str_draft.status,
      'PENDING_REVIEW',
      'Webhook report output must remain PENDING_REVIEW'
    )
  } else {
    assert.fail(`Expected report success but got failure: ${withReport.report.message}`)
  }

  await assert.rejects(
    () =>
      transactionIntakeWebhook.execute(
        { source: 'unit-test' },
        {},
        {
          data: '',
          format: 'csv',
          sensitivity: 'medium',
          reason_mode: 'deterministic',
        }
      ),
    'Empty data must fail schema validation'
  )

  console.log('transactionIntakeWebhook tests passed')
}

run().catch((error) => {
  console.error('transactionIntakeWebhook tests failed:', error)
  process.exit(1)
})
