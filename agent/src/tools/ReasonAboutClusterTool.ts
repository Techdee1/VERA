import Groq from 'groq-sdk'
import { z } from 'zod'

import type { ToolResult } from '../types/tooling.js'

const recommendationSchema = z.enum(['ESCALATE', 'MONITOR', 'INSUFFICIENT_EVIDENCE'])

const candidateSchema = z.object({
  candidate_id: z.string().min(1),
  pattern_type: z.string().min(1),
  entities: z.array(z.string().min(1)).min(1),
  score: z.number().min(0),
  confidence_hint: z.number().min(0).max(1),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  evidence_snippets: z.array(z.string().min(1)).min(1),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])),
})

const contextSchema = z.object({
  jurisdiction: z.string().default('Nigeria'),
  objective: z.string().default('AML suspicious transaction review'),
})

const inputSchema = z.object({
  candidate: candidateSchema,
  execution_mode: z.enum(['deterministic', 'live']).default('deterministic'),
  primary_model: z.string().min(1).default('openai/gpt-4o'),
  fallback_model: z.string().min(1).default('llama-3.3-70b-versatile'),
  timeout_ms: z.number().int().min(1000).max(60_000).default(12_000),
  context: contextSchema.optional(),
})

const reasoningSchema = z.object({
  assessment: z.string().min(1),
  confidence: z.number().min(0).max(1),
  red_flags: z.array(z.string().min(1)).min(1),
  alternatives_considered: z.array(z.string().min(1)).min(1),
  recommendation: recommendationSchema,
  rationale_summary: z.string().min(1),
})

type ReasonAboutClusterInput = z.input<typeof inputSchema>
type ParsedReasonAboutClusterInput = z.infer<typeof inputSchema>
type CandidateInput = z.infer<typeof candidateSchema>
type ReasoningPayload = z.infer<typeof reasoningSchema>

type ReasonAboutClusterOutput = ReasoningPayload & {
  model_info: {
    source: 'deterministic' | 'primary_model' | 'fallback_model'
    model: string
    parser_recovered: boolean
  }
}

type ParseResult = {
  parsed: ReasoningPayload | null
  parserRecovered: boolean
}

function elapsed(start: number): number {
  return Date.now() - start
}

function recommendationFromScore(score: number): z.infer<typeof recommendationSchema> {
  if (score >= 5) return 'ESCALATE'
  if (score >= 3) return 'MONITOR'
  return 'INSUFFICIENT_EVIDENCE'
}

function deterministicReasoning(candidate: CandidateInput): ReasoningPayload {
  const recommendation = recommendationFromScore(candidate.score)

  const genericAlternative =
    'Activity may reflect legitimate business concentration, requiring KYC and source-of-funds validation.'

  const patternAlternativeMap: Record<string, string> = {
    shared_identifier_cluster:
      'Shared identifier could result from data quality issues or approved multi-account corporate controls.',
    structuring_near_threshold:
      'Amounts near reporting thresholds could be routine batch payments split by operational limits.',
    rapid_in_out_flow:
      'Rapid turnover may match treasury pass-through operations for approved settlement desks.',
    hub_conduit_activity:
      'Hub behavior could reflect payment-processor or aggregator business models with expected high fan-in/out.',
  }

  const assessment = `Candidate ${candidate.candidate_id} indicates ${candidate.pattern_type} with ${candidate.risk_level.toLowerCase()}-to-high concern based on heuristic evidence.`

  const redFlags = [
    ...candidate.evidence_snippets.slice(0, 3),
    `Entity count involved: ${candidate.entities.length}.`,
  ]

  return {
    assessment,
    confidence: Number(Math.min(0.95, Math.max(0.35, candidate.confidence_hint + 0.1)).toFixed(2)),
    red_flags: redFlags,
    alternatives_considered: [
      patternAlternativeMap[candidate.pattern_type] ?? genericAlternative,
      genericAlternative,
    ],
    recommendation,
    rationale_summary:
      recommendation === 'ESCALATE'
        ? 'Escalation is recommended because multiple indicators align with suspicious layering or concealment behavior.'
        : recommendation === 'MONITOR'
          ? 'Monitoring is recommended pending corroborating evidence from KYC, counterpart checks, and transaction purpose validation.'
          : 'Evidence is currently insufficient for escalation; continue data collection and periodic reassessment.',
  }
}

function buildPrompt(input: ParsedReasonAboutClusterInput): string {
  const jurisdiction = input.context?.jurisdiction ?? 'Nigeria'
  const objective = input.context?.objective ?? 'AML suspicious transaction review'

  return [
    'You are an AML investigations analyst.',
    `Jurisdiction: ${jurisdiction}`,
    `Objective: ${objective}`,
    'Return ONLY valid JSON matching this schema:',
    '{"assessment":string,"confidence":number(0..1),"red_flags":string[],"alternatives_considered":string[],"recommendation":"ESCALATE|MONITOR|INSUFFICIENT_EVIDENCE","rationale_summary":string}',
    'Base your reasoning strictly on the evidence below and do not fabricate facts.',
    `Candidate JSON: ${JSON.stringify(input.candidate)}`,
  ].join('\n')
}

function tryParseReasoning(raw: string): ParseResult {
  const direct = (() => {
    try {
      return reasoningSchema.parse(JSON.parse(raw))
    } catch {
      return null
    }
  })()

  if (direct) {
    return { parsed: direct, parserRecovered: false }
  }

  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const fromBlock = blockMatch?.[1]
  if (fromBlock) {
    try {
      return { parsed: reasoningSchema.parse(JSON.parse(fromBlock)), parserRecovered: true }
    } catch {
      // Continue to next recovery attempt
    }
  }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const sliced = raw.slice(start, end + 1)
    try {
      return { parsed: reasoningSchema.parse(JSON.parse(sliced)), parserRecovered: true }
    } catch {
      return { parsed: null, parserRecovered: false }
    }
  }

  return { parsed: null, parserRecovered: false }
}

async function callOpenAICompatible(
  prompt: string,
  model: string,
  timeoutMs: number
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are a precise AML analyst that must always output strict JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI request failed (${response.status}): ${text}`)
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('OpenAI response did not include message content')
    }

    return content
  } finally {
    clearTimeout(timeout)
  }
}

async function callGroq(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: 'You are a precise AML analyst that must always output strict JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = completion.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Groq response did not include message content')
  }

  return content
}

export class ReasonAboutClusterTool {
  name = 'reason_about_cluster'

  description =
    'Generate structured AML reasoning for a detected candidate cluster using primary LLM with fallback and strict JSON validation.'

  inputSchema = inputSchema

  async execute(input: ReasonAboutClusterInput): Promise<ToolResult<ReasonAboutClusterOutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)
      const prompt = buildPrompt(validInput)

      if (validInput.execution_mode === 'deterministic') {
        const payload = deterministicReasoning(validInput.candidate)
        return {
          ok: true,
          data: {
            ...payload,
            model_info: {
              source: 'deterministic',
              model: 'deterministic-v1',
              parser_recovered: false,
            },
          },
          error: null,
          meta: {
            tool: this.name,
            duration_ms: elapsed(startedAt),
            version: '1.0.0',
          },
        }
      }

      try {
        const primaryRaw = await callOpenAICompatible(
          prompt,
          validInput.primary_model,
          validInput.timeout_ms
        )
        const primaryParsed = tryParseReasoning(primaryRaw)

        if (primaryParsed.parsed) {
          return {
            ok: true,
            data: {
              ...primaryParsed.parsed,
              model_info: {
                source: 'primary_model',
                model: validInput.primary_model,
                parser_recovered: primaryParsed.parserRecovered,
              },
            },
            error: null,
            meta: {
              tool: this.name,
              duration_ms: elapsed(startedAt),
              version: '1.0.0',
            },
          }
        }
      } catch {
        // Continue to fallback path.
      }

      try {
        const fallbackRaw = await callGroq(prompt, validInput.fallback_model)
        const fallbackParsed = tryParseReasoning(fallbackRaw)

        if (fallbackParsed.parsed) {
          return {
            ok: true,
            data: {
              ...fallbackParsed.parsed,
              model_info: {
                source: 'fallback_model',
                model: validInput.fallback_model,
                parser_recovered: fallbackParsed.parserRecovered,
              },
            },
            error: null,
            meta: {
              tool: this.name,
              duration_ms: elapsed(startedAt),
              version: '1.0.0',
            },
          }
        }
      } catch {
        // Continue to deterministic degrade path.
      }

      const degraded = deterministicReasoning(validInput.candidate)
      return {
        ok: true,
        data: {
          ...degraded,
          model_info: {
            source: 'deterministic',
            model: 'deterministic-v1',
            parser_recovered: false,
          },
        },
        error: null,
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected reasoning failure'

      return {
        ok: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message,
          retryable: false,
        },
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    }
  }
}
