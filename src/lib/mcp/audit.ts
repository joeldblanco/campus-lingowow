import { auditLog } from '@/lib/audit-log'

const REDACTED_KEYS = new Set(['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'])

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(val)
    }
    return out
  }
  return value
}

export interface ToolInvocationLog {
  userId: string
  tool: string
  args: unknown
  durationMs: number
  ok: boolean
  error?: string
}

export function logToolInvocation(params: ToolInvocationLog) {
  const { userId, tool, args, durationMs, ok, error } = params
  auditLog({
    userId,
    action: 'MCP_TOOL_INVOKED',
    category: 'ADMIN',
    description: `MCP tool ${tool} ${ok ? 'ejecutada' : 'fallida'} (${durationMs}ms)`,
    metadata: {
      tool,
      args: redact(args),
      durationMs,
      ok,
      ...(error ? { error } : {}),
    },
  })
}
