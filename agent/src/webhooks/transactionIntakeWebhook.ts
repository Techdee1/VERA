import { randomUUID } from 'node:crypto'

import { LuaWebhook } from 'lua-cli'
import { z } from 'zod'

import { runReportingSkill } from '../skills/reportingSkill.js'
import { runTransactionAnalysis } from '../skills/transactionAnalysisSkill.js'

const querySchema = z.object({
  source: z.string().optional(),
  tenant: z.string().optional(),
})

const headerSchema = z.object({
  'x-intake-key': z.string().optional(),
  'content-type': z.string().optional(),
})

const bodySchema = z.object({
  data: z.string().min(1),
  format: z.enum(['csv', 'json']).default('csv'),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  reason_mode: z.enum(['deterministic', 'live']).default('deterministic'),
  generate_report: z.boolean().default(false),
  case_reference: z.string().optional(),
  reporting_period: z.string().optional(),
})

export const transactionIntakeWebhook = new LuaWebhook({
  name: 'transaction-intake',
  description:
    'Receives transaction payloads from external systems, runs AML analysis, and optionally produces an STR draft.',
  querySchema,
  headerSchema,
  bodySchema,
  execute: async (event: unknown) => {
    const runId = `intake-${randomUUID()}`
    const parsedEvent = z
      .object({
        query: querySchema.optional(),
        headers: headerSchema.optional(),
        body: bodySchema,
      })
      .parse(event)

    const configuredKey = process.env.INTAKE_WEBHOOK_KEY
    const incomingKey = parsedEvent.headers?.['x-intake-key']

    if (configuredKey && incomingKey !== configuredKey) {
      return {
        success: false,
        run_id: runId,
        source: parsedEvent.query?.source ?? 'unknown',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid intake key.',
        },
      }
    }

    const analysis = await runTransactionAnalysis({
      data: parsedEvent.body.data,
      format: parsedEvent.body.format,
      sensitivity: parsedEvent.body.sensitivity,
      reason_mode: parsedEvent.body.reason_mode,
    })

    if (!parsedEvent.body.generate_report) {
      return {
        success: true,
        run_id: runId,
        source: parsedEvent.query?.source ?? 'unknown',
        analysis_status: analysis.status,
        analysis,
        report: null,
      }
    }

    const reportInput = {
      analysis,
      generate_report: true,
      ...(parsedEvent.body.case_reference
        ? { case_reference: parsedEvent.body.case_reference }
        : {}),
      ...(parsedEvent.body.reporting_period
        ? { reporting_period: parsedEvent.body.reporting_period }
        : {}),
    }

    const report = await runReportingSkill(reportInput)

    return {
      success: true,
      run_id: runId,
      source: parsedEvent.query?.source ?? 'unknown',
      analysis_status: analysis.status,
      analysis,
      report,
    }
  },
})

export default transactionIntakeWebhook
