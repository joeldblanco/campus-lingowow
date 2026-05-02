import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TOOL_REGISTRY } from '@/lib/mcp/registry'
import { hasAllScopes } from '@/lib/mcp/auth'
import { logToolInvocation } from '@/lib/mcp/audit'
import { McpToolError, toMcpError } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

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

  registerToolFn(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputShape as Record<string, unknown> | undefined,
    },
    async (args: unknown) => {
      const startedAt = Date.now()
      const safeArgs = (args as Record<string, unknown>) ?? {}
      try {
        if (!hasAllScopes(ctx.scopes, tool.scopes)) {
          throw new McpToolError(
            `Tu API key no tiene los scopes requeridos: ${tool.scopes.join(', ')}`,
            'FORBIDDEN'
          )
        }

        const result = await tool.handler(safeArgs as never)
        logToolInvocation({
          userId: ctx.userId,
          tool: tool.name,
          args: safeArgs,
          durationMs: Date.now() - startedAt,
          ok: true,
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
        logToolInvocation({
          userId: ctx.userId,
          tool: tool.name,
          args: safeArgs,
          durationMs: Date.now() - startedAt,
          ok: false,
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
