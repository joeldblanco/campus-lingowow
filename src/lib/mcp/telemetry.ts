/**
 * Telemetría de invocaciones MCP — envía spans y tags a Sentry para que
 * podamos medir latencia, conteo de errores y uso por tool en producción.
 *
 * Si Sentry no está cargado (entorno de tests, edge runtime no soportado),
 * los wrappers degradan silenciosamente.
 */

import * as Sentry from '@sentry/nextjs'

interface ToolSpanContext {
  toolName: string
  userId: string
  scopes: string[]
}

/**
 * Envuelve la ejecución de una tool con un span de Sentry. El span captura:
 *   - op: "mcp.tool"
 *   - name: <toolName>
 *   - tags: tool, userId, scope_count
 *   - measurements: durationMs (auto)
 *
 * En caso de error, además se hace `Sentry.captureException` con tags.
 */
export async function withToolSpan<T>(
  ctx: ToolSpanContext,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'mcp.tool',
      name: ctx.toolName,
      attributes: {
        'mcp.tool': ctx.toolName,
        'mcp.user_id': ctx.userId,
        'mcp.scope_count': ctx.scopes.length,
      },
    },
    async () => {
      try {
        return await fn()
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            mcp_tool: ctx.toolName,
            mcp_user_id: ctx.userId,
          },
        })
        throw error
      }
    }
  )
}

/**
 * Reporta un evento de tool ya completada (éxito o error). Se complementa
 * con el span de arriba: el span da latencia + traces, esta función agrega
 * un breadcrumb para trazabilidad.
 */
export function reportToolOutcome(params: {
  toolName: string
  userId: string
  ok: boolean
  durationMs: number
  cached?: boolean
  error?: string
}) {
  Sentry.addBreadcrumb({
    category: 'mcp.tool',
    message: `${params.toolName} ${params.ok ? 'ok' : 'error'} (${params.durationMs}ms${params.cached ? ', cached' : ''})`,
    level: params.ok ? 'info' : 'error',
    data: {
      tool: params.toolName,
      userId: params.userId,
      ok: params.ok,
      durationMs: params.durationMs,
      cached: params.cached || false,
      error: params.error,
    },
  })
}
