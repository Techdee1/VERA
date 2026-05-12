import assert from 'node:assert/strict'

import { addNFIUDisclaimer } from '../src/processors/addNFIUDisclaimer.js'

async function run() {
  const noTrigger = await addNFIUDisclaimer({
    message: 'Daily scan completed with medium-risk entities for monitoring.',
  })

  assert.equal(noTrigger.applied, false, 'No disclaimer should be added when no trigger exists')

  const withTrigger = await addNFIUDisclaimer({
    message: 'An STR draft is ready for escalation review by compliance.',
  })

  assert.equal(withTrigger.applied, true, 'Disclaimer should be added for STR/compliance content')
  assert.ok(
    withTrigger.message.includes('Compliance notice:'),
    'Disclaimer output should include compliance notice'
  )
  assert.ok(
    withTrigger.message.includes('PENDING_REVIEW'),
    'Disclaimer should reinforce PENDING_REVIEW semantics'
  )

  const alreadyHasNotice = await addNFIUDisclaimer({
    message:
      'An STR draft exists.\n\nCompliance notice: This output is AI-assisted and for human review only.',
  })

  assert.equal(alreadyHasNotice.applied, false, 'Should not append duplicate disclaimer')

  const emptyMessage = await addNFIUDisclaimer({
    message: '   ',
  })

  assert.equal(emptyMessage.applied, false, 'Whitespace-only message should not be modified')

  console.log('addNFIUDisclaimer tests passed')
}

run().catch((error) => {
  console.error('addNFIUDisclaimer tests failed:', error)
  process.exit(1)
})
