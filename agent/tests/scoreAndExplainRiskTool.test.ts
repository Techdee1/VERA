import assert from 'node:assert/strict'

import { ScoreAndExplainRiskTool } from '../src/tools/ScoreAndExplainRiskTool.js'

async function run() {
  const tool = new ScoreAndExplainRiskTool()

  const result = await tool.execute({
    reasoning_results: [
      {
        candidate_id: 'cand-1',
        entities: ['A'],
        confidence: 0.9,
        recommendation: 'ESCALATE',
        red_flags: ['Rapid turnover', 'Layered transfers'],
      },
      {
        candidate_id: 'cand-2',
        entities: ['D'],
        confidence: 0.6,
        recommendation: 'MONITOR',
        red_flags: ['Hub behavior'],
      },
    ],
    adjacency: {
      A: ['B', 'C'],
      B: ['C'],
      D: ['B'],
      X: ['Y'],
    },
    decay_factor: 0.6,
    baseline_score: 5,
    max_score: 100,
  })

  assert.equal(result.ok, true, 'Risk scoring should succeed')
  assert.ok(result.data, 'Risk result should include data')

  const risks = result.data.risks
  assert.ok(risks.length >= 4, 'Expected direct and one-hop propagated entities in output')

  const entityA = risks.find((item) => item.entity_id === 'A')
  assert.ok(entityA, 'Entity A should be present')
  assert.equal(entityA.source, 'direct', 'Entity A should be direct risk')
  assert.equal(entityA.level, 'HIGH', 'Entity A should be high risk')

  const entityB = risks.find((item) => item.entity_id === 'B')
  assert.ok(entityB, 'Entity B should be present via propagation')
  assert.ok(
    entityB.source === 'indirect' || entityB.source === 'direct_and_indirect',
    'Entity B should include propagated risk source'
  )
  assert.ok(entityB.score > 0, 'Entity B should have propagated score')

  const entityD = risks.find((item) => item.entity_id === 'D')
  assert.ok(entityD, 'Entity D should be present')
  assert.equal(entityD.source, 'direct', 'Entity D should be direct risk')

  assert.equal(result.data.summary.entity_count, risks.length, 'Summary entity count should match risks')
  assert.equal(result.data.summary.propagation_decay, 0.6, 'Summary should include configured decay')

  const badInput = await tool.execute({
    reasoning_results: [],
    adjacency: {},
    decay_factor: 0.6,
    baseline_score: 5,
    max_score: 100,
  })

  assert.equal(badInput.ok, false, 'Empty reasoning input should fail validation')
  assert.equal(badInput.error?.code, 'INVALID_INPUT', 'Expected invalid input error')

  console.log('ScoreAndExplainRiskTool tests passed')
}

run().catch((error) => {
  console.error('ScoreAndExplainRiskTool tests failed:', error)
  process.exit(1)
})
