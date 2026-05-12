export type ToolErrorCode =
  | 'VALIDATION_ERROR'
  | 'PARSE_ERROR'
  | 'INVALID_INPUT'
  | 'UNEXPECTED_ERROR'

export type ToolResult<T> = {
  ok: boolean
  data: T | null
  error: {
    code: ToolErrorCode
    message: string
    retryable: boolean
  } | null
  meta: {
    tool: string
    duration_ms: number
    version: string
  }
}
