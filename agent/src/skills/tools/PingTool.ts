import { z } from 'zod'

interface LuaTool {
  name: string
  description: string
  inputSchema: unknown
  execute: (input: unknown) => Promise<unknown>
  condition?: () => Promise<boolean>
}

export class PingTool implements LuaTool {
  name = 'ping_tool'

  description = 'Health-check tool that echoes a short payload.'

  inputSchema = z.object({
    text: z.string().default('ok'),
  })

  async execute(input: unknown) {
    const parsed = this.inputSchema.parse(input)
    return {
      ok: true,
      pong: parsed.text,
      timestamp: new Date().toISOString(),
    }
  }
}
