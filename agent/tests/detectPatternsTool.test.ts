import assert from 'node:assert/strict'

import { DetectPatternsTool } from '../src/tools/DetectPatternsTool.js'

async function run() {
  const tool = new DetectPatternsTool()

  const transactions = [
    {
      id: 't1',
      sender_id: 'S1',
      receiver_id: 'R1',
      amount_ngn: 950000,
      timestamp: '2026-04-20T09:00:00Z',
      channel: 'bank_transfer',
      sender_bvn: '***1111',
      receiver_bvn: '***7777',
    },
    {
      id: 't2',
      sender_id: 'S1',
      receiver_id: 'R1',
      amount_ngn: 980000,
      timestamp: '2026-04-20T09:30:00Z',
      channel: 'bank_transfer',
      sender_bvn: '***1111',
      receiver_bvn: '***7777',
    },
    {
      id: 't3',
      sender_id: 'S1',
      receiver_id: 'R1',
      amount_ngn: 970000,
      timestamp: '2026-04-20T10:00:00Z',
      channel: 'bank_transfer',
      sender_bvn: '***1111',
      receiver_bvn: '***7777',
    },
    {
      id: 't4',
      sender_id: 'A',
      receiver_id: 'B',
      amount_ngn: 1200000,
      timestamp: '2026-04-20T11:00:00Z',
      channel: 'mobile_money',
      sender_bvn: '***2222',
      receiver_bvn: '***3333',
    },
    {
      id: 't5',
      sender_id: 'B',
      receiver_id: 'C',
      amount_ngn: 1100000,
      timestamp: '2026-04-20T11:40:00Z',
      channel: 'mobile_money',
      sender_bvn: '***3333',
      receiver_bvn: '***4444',
    },
    {
      id: 't6',
      sender_id: 'X',
      receiver_id: 'B',
      amount_ngn: 600000,
      timestamp: '2026-04-20T12:00:00Z',
      channel: 'pos',
      sender_bvn: '***5555',
      receiver_bvn: '***3333',
    },
    {
      id: 't7',
      sender_id: 'B',
      receiver_id: 'Y',
      amount_ngn: 650000,
      timestamp: '2026-04-20T12:20:00Z',
      channel: 'pos',
      sender_bvn: '***3333',
      receiver_bvn: '***6666',
    },
    {
      id: 't8',
      sender_id: 'B',
      receiver_id: 'Z',
      amount_ngn: 700000,
      timestamp: '2026-04-20T12:30:00Z',
      channel: 'crypto',
      sender_bvn: '***3333',
      receiver_bvn: '***8888',
    },
    {
      id: 't9',
      sender_id: 'W',
      receiver_id: 'B',
      amount_ngn: 500000,
      timestamp: '2026-04-20T12:10:00Z',
      channel: 'cash',
      sender_bvn: '***9999',
      receiver_bvn: '***3333',
    },
  ]

  const mediumResult = await tool.execute({
    transactions,
    sensitivity: 'medium',
    min_total_amount_ngn: 1_000_000,
    max_candidates: 25,
  })

  assert.equal(mediumResult.ok, true, 'Medium sensitivity run should succeed')
  assert.ok(mediumResult.data, 'Medium result should include data')
  assert.ok(mediumResult.data.candidates.length > 0, 'Expected at least one candidate in medium profile')

  const mediumPatternTypes = new Set(mediumResult.data.candidates.map((c) => c.pattern_type))
  assert.ok(
    mediumPatternTypes.has('structuring_near_threshold'),
    'Expected structuring candidate in medium profile'
  )
  assert.ok(
    mediumPatternTypes.has('rapid_in_out_flow'),
    'Expected rapid-flow candidate in medium profile'
  )
  assert.ok(
    mediumPatternTypes.has('hub_conduit_activity'),
    'Expected hub-conduit candidate in medium profile'
  )

  const structuring = mediumResult.data.candidates.find(
    (c) => c.pattern_type === 'structuring_near_threshold'
  )
  assert.ok(structuring, 'Structuring candidate should exist')
  assert.equal(structuring.entities[0], 'S1', 'Structuring sender should be S1')
  assert.equal(structuring.entities[1], 'R1', 'Structuring receiver should be R1')

  const highResult = await tool.execute({
    transactions,
    sensitivity: 'high',
    min_total_amount_ngn: 1_000_000,
    max_candidates: 25,
  })

  assert.equal(highResult.ok, true, 'High sensitivity run should succeed')
  assert.ok(highResult.data, 'High result should include data')
  assert.ok(
    highResult.data.candidates.length >= mediumResult.data.candidates.length,
    'High sensitivity should not return fewer candidates than medium for this fixture'
  )

  const lowResult = await tool.execute({
    transactions,
    sensitivity: 'low',
    min_total_amount_ngn: 1_000_000,
    max_candidates: 25,
  })

  assert.equal(lowResult.ok, true, 'Low sensitivity run should succeed')
  assert.ok(lowResult.data, 'Low result should include data')
  assert.ok(
    lowResult.data.candidates.length <= highResult.data.candidates.length,
    'Low sensitivity should not return more candidates than high'
  )

  const badInput = await tool.execute({
    transactions: [],
    sensitivity: 'medium',
    min_total_amount_ngn: 1_000_000,
    max_candidates: 25,
  })

  assert.equal(badInput.ok, false, 'Empty transactions should fail validation')
  assert.equal(badInput.error?.code, 'INVALID_INPUT', 'Expected invalid input error')

  console.log('DetectPatternsTool tests passed')
}

run().catch((error) => {
  console.error('DetectPatternsTool tests failed:', error)
  process.exit(1)
})
