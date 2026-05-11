import assert from 'node:assert/strict'

import { BuildEntityGraphTool } from '../src/tools/BuildEntityGraphTool.js'

async function run() {
  const tool = new BuildEntityGraphTool()

  const result = await tool.execute({
    transactions: [
      {
        id: 'tx-1',
        sender_id: 'A',
        receiver_id: 'B',
        amount_ngn: 100,
        timestamp: '2026-04-20T10:00:00Z',
        channel: 'bank_transfer',
        sender_bvn: '***1111',
        receiver_bvn: '***2222',
      },
      {
        id: 'tx-2',
        sender_id: 'A',
        receiver_id: 'C',
        amount_ngn: 200,
        timestamp: '2026-04-20T11:00:00Z',
        channel: 'mobile_money',
        sender_bvn: '***1111',
        receiver_bvn: '***3333',
      },
      {
        id: 'tx-3',
        sender_id: 'D',
        receiver_id: 'B',
        amount_ngn: 300,
        timestamp: '2026-04-20T12:00:00Z',
        channel: 'pos',
        sender_bvn: '***2222',
        receiver_bvn: '***2222',
      },
      {
        id: 'tx-4',
        sender_id: 'E',
        receiver_id: 'F',
        amount_ngn: 150,
        timestamp: '2026-04-20T13:00:00Z',
        channel: 'cash',
        sender_bvn: '***5555',
        receiver_bvn: '***5555',
      },
      {
        id: 'tx-5',
        sender_id: 'C',
        receiver_id: 'B',
        amount_ngn: 50,
        timestamp: '2026-04-20T14:00:00Z',
        channel: 'bank_transfer',
        sender_bvn: '***1111',
        receiver_bvn: '***2222',
      },
    ],
    top_hubs: 3,
    min_shared_cluster_size: 2,
  })

  assert.equal(result.ok, true, 'Graph build should succeed')
  assert.ok(result.data, 'Graph result should include data')

  assert.equal(result.data?.stats.entity_count, 6, 'Should detect six entities')
  assert.equal(result.data?.stats.edge_count, 5, 'Should detect five directed edges')

  assert.deepEqual(result.data?.adjacency.A, ['B', 'C'], 'A should connect to B and C')

  const topOutHub = result.data?.stats.hubs_out[0]
  assert.ok(topOutHub, 'Top outbound hub should exist')
  assert.equal(topOutHub.entity_id, 'A', 'A should be the top outbound hub')
  assert.equal(topOutHub.degree, 2, 'A outbound degree should be 2')

  const topInHub = result.data?.stats.hubs_in[0]
  assert.ok(topInHub, 'Top inbound hub should exist')
  assert.equal(topInHub.entity_id, 'B', 'B should be the top inbound hub')
  assert.equal(topInHub.degree, 3, 'B inbound degree should be 3')

  const clusters = result.data?.stats.shared_identifier_clusters ?? []
  const cluster1111 = clusters.find((cluster) => cluster.identifier === '***1111')
  assert.ok(cluster1111, 'Expected a shared-identifier cluster for ***1111')
  assert.deepEqual(cluster1111.entities, ['A', 'C'], '***1111 should connect A and C')

  const cluster2222 = clusters.find((cluster) => cluster.identifier === '***2222')
  assert.ok(cluster2222, 'Expected a shared-identifier cluster for ***2222')
  assert.deepEqual(cluster2222.entities, ['B', 'D'], '***2222 should connect B and D')

  const badInput = await tool.execute({
    transactions: [],
    top_hubs: 3,
    min_shared_cluster_size: 2,
  })

  assert.equal(badInput.ok, false, 'Empty transactions input should fail validation')
  assert.equal(badInput.error?.code, 'INVALID_INPUT', 'Expected invalid input error code')

  console.log('BuildEntityGraphTool tests passed')
}

run().catch((error) => {
  console.error('BuildEntityGraphTool tests failed:', error)
  process.exit(1)
})
