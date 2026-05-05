import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TOOL_REGISTRY } from '@/lib/mcp/registry'
import { hasAllScopes } from '@/lib/mcp/auth'
import { logToolInvocation } from '@/lib/mcp/audit'
import { McpToolError, toMcpError } from '@/lib/mcp/errors'
import { getIdempotentResult, storeIdempotentResult } from '@/lib/mcp/idempotency'
import { reportToolOutcome, withToolSpan } from '@/lib/mcp/telemetry'
import type { AnyToolModule } from '@/lib/mcp/types'

const IDEMPOTENCY_KEY_SCHEMA = z
  .string()
  .min(8)
  .max(128)
  .optional()
  .describe(
    'Opcional. Si pasas la misma clave en una segunda llamada (mismo userId + tool) dentro de 24h, se devuelve el resultado cacheado en lugar de re-ejecutar. Úsalo en mutaciones que no quieres duplicar al reintentar.'
  )

interface BuildServerOptions {
  userId: string
  scopes: string[]
}

const SERVER_INFO = {
  name: 'lingowow-admin-mcp',
  version: '0.1.0',
}

export function buildMcpServer({ userId, scopes }: BuildServerOptions): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {} },
  })

  for (const tool of TOOL_REGISTRY) {
    registerTool(server, tool, { userId, scopes })
  }

  return server
}

function registerTool(
  server: McpServer,
  tool: AnyToolModule,
  ctx: BuildServerOptions
) {
  // El SDK genera tipos muy recursivos para inputSchema (ZodRawShapeCompat con OutputArgs).
  // Cast pragmático para evitar TS2589 sin perder validación, que ya hace el SDK en runtime.
  const registerToolFn = (
    server.registerTool as unknown as (
      name: string,
      config: {
        description?: string
        inputSchema?: Record<string, unknown>
      },
      cb: (args: unknown) => Promise<unknown>
    ) => void
  ).bind(server)

  const isWriteTool = tool.scopes.some((s) => s.endsWith(':write'))
  // Para tools de escritura, exponemos `idempotencyKey` en el inputSchema
  // declarado al cliente MCP, así el LLM lo descubre vía `tools/list`.
  const inputShape = isWriteTool
    ? { ...(tool.inputShape ?? {}), idempotencyKey: IDEMPOTENCY_KEY_SCHEMA }
    : tool.inputShape

  registerToolFn(
    tool.name,
    {
      description: tool.description,
      inputSchema: inputShape as Record<string, unknown> | undefined,
    },
    async (args: unknown) => {
      const startedAt = Date.now()
      const rawArgs = (args as Record<string, unknown>) ?? {}
      const { idempotencyKey, ...safeArgs } = rawArgs as {
        idempotencyKey?: unknown
        [key: string]: unknown
      }
      const idemKey =
        isWriteTool && typeof idempotencyKey === 'string' && idempotencyKey.length > 0
          ? idempotencyKey
          : null

      return withToolSpan({ toolName: tool.name, userId: ctx.userId, scopes: ctx.scopes }, async () => {
        try {
          if (!hasAllScopes(ctx.scopes, tool.scopes)) {
            throw new McpToolError(
              `Tu API key no tiene los scopes requeridos: ${tool.scopes.join(', ')}`,
              'FORBIDDEN'
            )
          }

          if (idemKey) {
            const cached = getIdempotentResult(ctx.userId, tool.name, idemKey)
            if (cached !== undefined) {
              const durationMs = Date.now() - startedAt
              logToolInvocation({
                userId: ctx.userId,
                tool: tool.name,
                args: { ...safeArgs, idempotencyKey: idemKey, _cached: true },
                durationMs,
                ok: true,
              })
              reportToolOutcome({
                toolName: tool.name,
                userId: ctx.userId,
                ok: true,
                durationMs,
                cached: true,
              })
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: stringify(cached),
                  },
                ],
              }
            }
          }

          const result = await tool.handler(safeArgs as never)
          if (idemKey) {
            storeIdempotentResult(ctx.userId, tool.name, idemKey, result)
          }
          const durationMs = Date.now() - startedAt
          logToolInvocation({
            userId: ctx.userId,
            tool: tool.name,
            args: idemKey ? { ...safeArgs, idempotencyKey: idemKey } : safeArgs,
            durationMs,
            ok: true,
          })
          reportToolOutcome({
            toolName: tool.name,
            userId: ctx.userId,
            ok: true,
            durationMs,
          })

          return {
            content: [
              {
                type: 'text' as const,
                text: stringify(result),
              },
            ],
          }
        } catch (error) {
          const mcpErr = toMcpError(error)
          const durationMs = Date.now() - startedAt
          logToolInvocation({
            userId: ctx.userId,
            tool: tool.name,
            args: safeArgs,
            durationMs,
            ok: false,
            error: mcpErr.message,
          })
          reportToolOutcome({
            toolName: tool.name,
            userId: ctx.userId,
            ok: false,
            durationMs,
            error: mcpErr.message,
          })

          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: mcpErr.message,
                  code: mcpErr.code,
                  ...(mcpErr.details ? { details: mcpErr.details } : {}),
                }),
              },
            ],
          }
        }
      })
    }
  )
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, jsonReplacer, 2)
  } catch {
    return String(value)
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  return value
}
