import { parse } from 'csv-parse/sync'
import { z } from 'zod'

import type { ToolResult } from '../types/tooling.js'

const CHANNELS = ['bank_transfer', 'pos', 'mobile_money', 'crypto', 'cash', 'unknown'] as const

const inputSchema = z.object({
  data: z.string().min(1, 'Transaction data cannot be empty'),
  format: z.enum(['csv', 'json']).default('csv'),
})

const transactionSchema = z.object({
  id: z.string().min(1),
  sender_id: z.string().min(1),
  receiver_id: z.string().min(1),
  amount_ngn: z.number().positive(),
  timestamp: z.string().min(1),
  channel: z.enum(CHANNELS).default('unknown'),
  sender_bvn: z.string().optional(),
  receiver_bvn: z.string().optional(),
  sender_name: z.string().optional(),
  receiver_name: z.string().optional(),
})

type ParseTransactionsInput = z.infer<typeof inputSchema>

type NormalizedTransaction = z.infer<typeof transactionSchema>

type ParseTransactionsOutput = {
  transactions: NormalizedTransaction[]
  summary: {
    total_parsed: number
    total_skipped: number
    skipped_reasons: string[]
    unique_senders: number
    unique_receivers: number
    total_volume_ngn: number
    date_range: {
      earliest: string | null
      latest: string | null
    }
  }
}

function elapsed(start: number): number {
  return Date.now() - start
}

function normalizeString(value: unknown): string | undefined {
  if (value == null) return undefined
  const text = String(value).trim()
  return text.length ? text : undefined
}

function normalizeAmount(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number.parseFloat(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeTimestamp(value: unknown): string | undefined {
  const text = normalizeString(value)
  if (!text) return undefined
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function maskIdentifier(value: unknown): string | undefined {
  const text = normalizeString(value)
  if (!text) return undefined
  const digits = text.replace(/\D/g, '')
  if (!digits) return undefined
  return `***${digits.slice(-4)}`
}

function pickChannel(value: unknown): (typeof CHANNELS)[number] {
  const text = normalizeString(value)?.toLowerCase()
  return CHANNELS.includes((text ?? 'unknown') as (typeof CHANNELS)[number])
    ? (text as (typeof CHANNELS)[number])
    : 'unknown'
}

function rowValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) return row[key]
  }
  return undefined
}

function normalizeRow(row: Record<string, unknown>, rowIndex: number): NormalizedTransaction {
  const normalized = {
    id:
      normalizeString(rowValue(row, ['id', 'reference', 'tx_id', 'transaction_id'])) ??
      `row_${rowIndex + 1}`,
    sender_id:
      normalizeString(
        rowValue(row, ['sender_id', 'source_entity_id', 'from_entity_id', 'source_id'])
      ) ?? '',
    receiver_id:
      normalizeString(
        rowValue(row, ['receiver_id', 'destination_entity_id', 'to_entity_id', 'destination_id'])
      ) ?? '',
    amount_ngn:
      normalizeAmount(rowValue(row, ['amount_ngn', 'amount', 'value_ngn', 'volume_ngn'])) ??
      Number.NaN,
    timestamp:
      normalizeTimestamp(rowValue(row, ['timestamp', 'occurred_at', 'created_at', 'date'])) ??
      '',
    channel: pickChannel(rowValue(row, ['channel'])),
    sender_bvn: maskIdentifier(rowValue(row, ['sender_bvn', 'source_bvn'])),
    receiver_bvn: maskIdentifier(rowValue(row, ['receiver_bvn', 'destination_bvn'])),
    sender_name: normalizeString(rowValue(row, ['sender_name', 'source_name'])),
    receiver_name: normalizeString(rowValue(row, ['receiver_name', 'destination_name'])),
  }

  return transactionSchema.parse(normalized)
}

function parseInputRows(input: ParseTransactionsInput): Record<string, unknown>[] {
  if (input.format === 'json') {
    const parsed = JSON.parse(input.data)
    if (!Array.isArray(parsed)) {
      throw new Error('JSON input must be an array of transaction objects')
    }
    return parsed as Record<string, unknown>[]
  }

  const parsed = parse(input.data, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  if (!Array.isArray(parsed)) {
    throw new Error('CSV parsing failed: expected row array')
  }

  return parsed as Record<string, unknown>[]
}

function summarize(transactions: NormalizedTransaction[], skipped: string[]) {
  const uniqueSenders = new Set(transactions.map((t) => t.sender_id)).size
  const uniqueReceivers = new Set(transactions.map((t) => t.receiver_id)).size
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount_ngn, 0)

  const epochTimes = transactions
    .map((tx) => ({ iso: tx.timestamp, epoch: new Date(tx.timestamp).getTime() }))
    .sort((a, b) => a.epoch - b.epoch)

  return {
    total_parsed: transactions.length,
    total_skipped: skipped.length,
    skipped_reasons: skipped.slice(0, 10),
    unique_senders: uniqueSenders,
    unique_receivers: uniqueReceivers,
    total_volume_ngn: Number(totalVolume.toFixed(2)),
    date_range: {
      earliest: epochTimes[0]?.iso ?? null,
      latest: epochTimes.at(-1)?.iso ?? null,
    },
  }
}

export class ParseTransactionsTool {
  name = 'parse_transactions'

  description =
    'Parse and normalize transaction data from CSV or JSON into a validated transaction array with summary metrics.'

  inputSchema = inputSchema

  async execute(input: ParseTransactionsInput): Promise<ToolResult<ParseTransactionsOutput>> {
    const startedAt = Date.now()

    try {
      const validInput = inputSchema.parse(input)
      const rows = parseInputRows(validInput)

      const transactions: NormalizedTransaction[] = []
      const skipped: string[] = []

      for (let idx = 0; idx < rows.length; idx += 1) {
        const row = rows[idx]
        if (!row) {
          skipped.push(`Row ${idx + 1}: missing row payload`)
          continue
        }

        try {
          transactions.push(normalizeRow(row, idx))
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unknown validation error'
          skipped.push(`Row ${idx + 1}: ${reason}`)
        }
      }

      return {
        ok: true,
        data: {
          transactions,
          summary: summarize(transactions, skipped),
        },
        error: null,
        meta: {
          tool: this.name,
          duration_ms: elapsed(startedAt),
          version: '1.0.0',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing failure'
      const code = message.includes('JSON') || message.includes('CSV') ? 'PARSE_ERROR' : 'INVALID_INPUT'

      return {
        ok: false,
        data: null,
        error: {
          code,
          message,
          retryable: code === 'PARSE_ERROR',
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
