import assert from 'node:assert/strict'

import { runTransactionAnalysis } from '../src/skills/transactionAnalysisSkill.js'

async function run() {
  const csvData = [
    'id,sender_id,receiver_id,amount_ngn,timestamp,channel,sender_bvn,receiver_bvn,sender_name,receiver_name',
    'tx-001,S1,R1,950000,2026-04-24T08:00:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-002,S1,R1,970000,2026-04-24T08:20:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-003,S1,R1,980000,2026-04-24T08:40:00Z,bank_transfer,12345678901,10987654321,Alice,R-One',
    'tx-004,R1,M1,1100000,2026-04-24T09:00:00Z,mobile_money,10987654321,33334444555,R-One,M-One',
    'tx-005,X1,R1,650000,2026-04-24T09:10:00Z,pos,66667777888,10987654321,X-One,R-One',
    'tx-006,R1,Z1,620000,2026-04-24T09:25:00Z,crypto,10987654321,55556666777,R-One,Z-One',
  ].join('\n')

  const result = await runTransactionAnalysis({
    data: csvData,
    format: 'csv',
    sensitivity: 'medium',
    reason_mode: 'deterministic',
  })

  assert.equal(result.status, 'ANALYZED', 'Analysis skill should produce ANALYZED status')
  assert.ok(result.candidates.length > 0, 'Analysis should produce candidate list')
  assert.ok(result.reasoning_results.length > 0, 'Analysis should produce reasoning outputs')
  assert.ok(result.risk_results.length > 0, 'Analysis should produce risk outputs')

  const bad = await runTransactionAnalysis({
    data: '',
    format: 'csv',
  })

  assert.equal(bad.status, 'FAILED', 'Invalid data should fail analysis')

  console.log('transactionAnalysisSkill tests passed')
}

run().catch((error) => {
  console.error('transactionAnalysisSkill tests failed:', error)
  process.exit(1)
})
