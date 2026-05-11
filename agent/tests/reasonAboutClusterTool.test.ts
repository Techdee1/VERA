import assert from 'node:assert/strict'

import { ReasonAboutClusterTool } from '../src/tools/ReasonAboutClusterTool.js'

async function run() {
  const tool = new ReasonAboutClusterTool()

  const candidate = {
    candidate_id: 'structuring_near_threshold::S1::R1',
    pattern_type: 'structuring_near_threshold',
    entities: ['S1', 'R1'],
    score: 5,
    confidence_hint: 0.72,
    risk_level: 'HIGH' as const,
    evidence_snippets: [
      '3 transfers near threshold from S1 to R1.',
      'Total near-threshold value NGN 2,900,000.00.',
    ],
    metrics: {
      transaction_count: 3,
      total_amount_ngn: 2_900_000,
    },
  }

  const deterministicResult = await tool.execute({
    candidate,
    execution_mode: 'deterministic',
  })

  assert.equal(deterministicResult.ok, true, 'Deterministic reasoning should succeed')
  assert.ok(deterministicResult.data, 'Deterministic result should include data')
  assert.equal(
    deterministicResult.data?.model_info.source,
    'deterministic',
    'Expected deterministic model source'
  )
  assert.equal(
    deterministicResult.data?.recommendation,
    'ESCALATE',
    'High-score candidate should escalate in deterministic mode'
  )
  assert.ok(
    (deterministicResult.data?.red_flags.length ?? 0) > 0,
    'Reasoning should include red flags'
  )
  assert.ok(
    (deterministicResult.data?.alternatives_considered.length ?? 0) > 0,
    'Reasoning should include alternatives considered'
  )

  const liveNoKeyResult = await tool.execute({
    candidate,
    execution_mode: 'live',
    timeout_ms: 2000,
  })

  assert.equal(liveNoKeyResult.ok, true, 'Live mode without keys should degrade gracefully')
  assert.ok(liveNoKeyResult.data, 'Live fallback result should include data')
  assert.equal(
    liveNoKeyResult.data?.model_info.source,
    'deterministic',
    'Without keys, live mode should degrade to deterministic source'
  )
  assert.equal(
    liveNoKeyResult.data?.recommendation,
    'ESCALATE',
    'Fallback deterministic recommendation should still be produced'
  )

  const badInput = await tool.execute({
    // @ts-expect-error Intentional invalid shape for runtime validation test.
    candidate: { id: 'invalid' },
    execution_mode: 'deterministic',
  })

  assert.equal(badInput.ok, false, 'Invalid input shape should fail')
  assert.equal(badInput.error?.code, 'INVALID_INPUT', 'Expected invalid input error code')

  console.log('ReasonAboutClusterTool tests passed')
}

run().catch((error) => {
  console.error('ReasonAboutClusterTool tests failed:', error)
  process.exit(1)
})
