import assert from 'node:assert/strict'

import { ParseTransactionsTool } from '../src/tools/ParseTransactionsTool.js'

async function run() {
  const tool = new ParseTransactionsTool()

  const csvInput = [
    'id,sender_id,receiver_id,amount_ngn,timestamp,channel,sender_bvn,receiver_bvn,sender_name,receiver_name',
    'tx-001,ent-a,ent-b,500000,2026-04-01T10:00:00Z,pos,12345678901,10987654321,Ade,Grace Ltd',
    'tx-002,ent-c,ent-d,not-a-number,2026-04-01T12:00:00Z,bank_transfer,22223333444,44443333222,Bola,Delta Biz',
    'tx-003,ent-a,ent-e,250000,2026-04-02T08:30:00Z,mobile_money,12345678901,,Ade,Emeka',
  ].join('\n')

  const csvResult = await tool.execute({ data: csvInput, format: 'csv' })

  assert.equal(csvResult.ok, true, 'CSV parse should succeed')
  assert.ok(csvResult.data, 'CSV result should include data')
  assert.equal(csvResult.data?.summary.total_parsed, 2, 'Should parse two valid rows')
  assert.equal(csvResult.data?.summary.total_skipped, 1, 'Should skip one invalid row')
  assert.equal(csvResult.data?.summary.unique_senders, 1, 'Unique sender count should match valid rows')
  assert.equal(csvResult.data?.summary.unique_receivers, 2, 'Unique receiver count should match valid rows')
  assert.equal(csvResult.data?.summary.total_volume_ngn, 750000, 'Total volume should sum valid rows only')

  const firstTx = csvResult.data?.transactions[0]
  assert.equal(firstTx?.sender_bvn, '***8901', 'BVN should be masked')
  assert.equal(firstTx?.receiver_bvn, '***4321', 'Receiver BVN should be masked')

  const jsonInput = JSON.stringify([
    {
      reference: 'ref-777',
      source_entity_id: 'ent-x',
      destination_entity_id: 'ent-y',
      amount: '1000',
      occurred_at: '2026-05-03T14:00:00Z',
      channel: 'unknown',
    },
  ])

  const jsonResult = await tool.execute({ data: jsonInput, format: 'json' })
  assert.equal(jsonResult.ok, true, 'JSON parse should succeed')
  assert.ok(jsonResult.data, 'JSON result should include data')
  const parsedJsonTx = jsonResult.data.transactions[0]
  assert.ok(parsedJsonTx, 'JSON transaction should exist')
  assert.equal(parsedJsonTx.id, 'ref-777', 'reference should map to id')
  assert.equal(parsedJsonTx.amount_ngn, 1000, 'amount should parse as number')

  const badJsonResult = await tool.execute({ data: '{"oops":true}', format: 'json' })
  assert.equal(badJsonResult.ok, false, 'Non-array JSON should fail')
  assert.equal(badJsonResult.error?.code, 'PARSE_ERROR', 'Should classify malformed JSON as parse error')

  console.log('ParseTransactionsTool tests passed')
}

run().catch((error) => {
  console.error('ParseTransactionsTool tests failed:', error)
  process.exit(1)
})
