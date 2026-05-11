const DISCLAIMER_TEXT =
  'Compliance notice: This output is AI-assisted and for human review only. Any STR action remains PENDING_REVIEW until an authorized compliance officer approves and files it.'

const DISCLAIMER_TRIGGERS = [
  'str',
  'suspicious transaction report',
  'report filing',
  'file with regulator',
  'regulator',
  'nfiu',
  'escalate',
  'compliance',
]

type DisclaimerInput = {
  message: string
}

type DisclaimerOutput = {
  message: string
  applied: boolean
}

function includesTrigger(message: string): boolean {
  const normalized = message.toLowerCase()
  return DISCLAIMER_TRIGGERS.some((trigger) => normalized.includes(trigger))
}

function alreadyContainsDisclaimer(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('compliance notice:') || normalized.includes('pending_review')
}

export async function addNFIUDisclaimer(input: DisclaimerInput): Promise<DisclaimerOutput> {
  if (!input.message.trim()) {
    return { message: input.message, applied: false }
  }

  if (!includesTrigger(input.message)) {
    return { message: input.message, applied: false }
  }

  if (alreadyContainsDisclaimer(input.message)) {
    return { message: input.message, applied: false }
  }

  return {
    message: `${input.message}\n\n${DISCLAIMER_TEXT}`,
    applied: true,
  }
}

export const addNFIUDisclaimerPostProcessor = {
  name: 'add-nfiu-disclaimer',
  description: 'Append compliance-safe disclaimer on STR or filing related responses.',
  execute: async (input: DisclaimerInput) => addNFIUDisclaimer(input),
}
