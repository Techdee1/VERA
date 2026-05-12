import assert from 'node:assert/strict'

import { runDailyTransactionScan } from '../src/jobs/dailyTransactionScan.js'

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

  const result = await runDailyTransactionScan({
    data: csvData,
    format: 'csv',
    sensitivity: 'medium',
    reason_mode: 'deterministic',
  })

  assert.equal(result.status, 'ANALYZED', 'Daily job should complete with analyzed status')
  assert.equal(result.input_summary.total_transactions, 6, 'Should parse all fixture transactions')
  assert.ok(result.detection_summary.total_candidates > 0, 'Should detect at least one candidate')
  assert.ok(result.risk_summary, 'Risk summary should be present when analyzed')
  assert.ok(result.str_summary, 'STR summary should be present when analyzed')
  assert.equal(result.str_summary?.status, 'PENDING_REVIEW', 'STR draft status should be PENDING_REVIEW')
  assert.equal(result.error, null, 'No error should be reported on analyzed run')

  const missingDataResult = await runDailyTransactionScan({
    reason_mode: 'deterministic',
  })

  assert.equal(missingDataResult.status, 'FAILED', 'Missing data should produce failed status')
  assert.ok(missingDataResult.error, 'Missing data failure should include error message')

  console.log('dailyTransactionScan job tests passed')
}

run().catch((error) => {
  console.error('dailyTransactionScan job tests failed:', error)
  process.exit(1)
})
