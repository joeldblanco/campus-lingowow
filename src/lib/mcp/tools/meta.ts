import { z } from 'zod'
import { db } from '@/lib/db'
import { TOOL_REGISTRY } from '@/lib/mcp/registry'
import { MCP_SCOPES, MCP_SCOPE_PRESETS } from '@/lib/mcp/scopes'
import { getToolRateLimits } from '@/lib/mcp/rate-limit'
import type { AnyToolModule } from '@/lib/mcp/types'

/**
 * Tools de meta-introspección y diagnóstico.
 *
 * - lingowow_help: descubrimiento del catálogo (dominios, scopes, presets,
 *   límites por tool). Útil para que el agente pida las API keys con los
 *   scopes correctos sin que el humano tenga que enseñárselos manualmente.
 * - lingowow_health: probe de conectividad a dependencias críticas
 *   (PostgreSQL, env vars). Útil antes de operaciones largas o multi-step.
 */

function summarizeRegistry() {
  const byDomain: Record<string, { read: number; write: number; tools: string[] }> = {}
  for (const tool of TOOL_REGISTRY) {
    const domainScope = tool.scopes.find((s) => s.startsWith('mcp:'))
    const domain = domainScope ? domainScope.split(':')[1] : 'misc'
    if (!byDomain[domain]) byDomain[domain] = { read: 0, write: 0, tools: [] }
    const isWrite = tool.scopes.some((s) => s.endsWith(':write') || s.endsWith(':impersonate'))
    if (isWrite) byDomain[domain].write += 1
    else byDomain[domain].read += 1
    byDomain[domain].tools.push(tool.name)
  }
  return byDomain
}

export const metaTools: AnyToolModule[] = [
  {
    name: 'lingowow_help',
    description:
      'Devuelve el catálogo de dominios, scopes, presets de scopes, límites por tool y conteo total de tools del servidor MCP. Úsalo al iniciar una sesión para descubrir qué puedes hacer y qué scopes necesitas pedir.',
    scopes: ['mcp:access'],
    inputShape: {
      domain: z
        .string()
        .optional()
        .describe(
          'Filtra por dominio (users, classes, finance, etc.). Si se omite, devuelve todos.'
        ),
      includeToolList: z
        .boolean()
        .optional()
        .default(false)
        .describe('Si true, incluye los nombres de tools dentro de cada dominio.'),
    },
    handler: async ({ domain, includeToolList }) => {
      const summary = summarizeRegistry()
      const filtered = domain
        ? Object.fromEntries(Object.entries(summary).filter(([d]) => d === domain))
        : summary

      return {
        totalTools: TOOL_REGISTRY.length,
        domains: Object.fromEntries(
          Object.entries(filtered).map(([d, info]) => [
            d,
            {
              read: info.read,
              write: info.write,
              ...(includeToolList ? { tools: info.tools } : {}),
            },
          ])
        ),
        scopes: MCP_SCOPES,
        scopePresets: MCP_SCOPE_PRESETS,
        toolRateLimitsPerMinute: getToolRateLimits(),
        notes: {
          idempotency:
            'Toda tool de escritura acepta `idempotencyKey: string` opcional. Misma key dentro de 24h devuelve resultado cacheado.',
          paginationDefaults: 'Las tools de listado aceptan limit (max 200) y offset (default 0).',
          dateFormat: 'Todas las fechas en input son ISO 8601 (datetime); las que llevan solo día son YYYY-MM-DD.',
        },
      }
    },
  },

  {
    name: 'lingowow_health',
    description:
      'Probe de salud del servidor MCP: verifica conectividad con PostgreSQL, presencia de env vars críticas y estado del feature flag. Útil antes de operaciones largas o multi-step.',
    scopes: ['mcp:access'],
    handler: async () => {
      const checks: Record<string, { ok: boolean; detail?: string }> = {}
      const startedAt = Date.now()

      try {
        await db.$queryRaw`SELECT 1`
        checks.database = { ok: true, detail: 'PostgreSQL responde' }
      } catch (error) {
        checks.database = {
          ok: false,
          detail: error instanceof Error ? error.message : 'Error desconocido',
        }
      }

      checks.envJwtSecret = {
        ok: !!process.env.JWT_SECRET,
        detail: process.env.JWT_SECRET ? 'OK' : 'Falta JWT_SECRET (impersonate fallará)',
      }

      checks.envAppUrl = {
        ok: !!process.env.NEXT_PUBLIC_APP_URL,
        detail: process.env.NEXT_PUBLIC_APP_URL || 'NEXT_PUBLIC_APP_URL no configurada (magic links sin baseUrl absoluto)',
      }

      checks.mcpDisabled = {
        ok: process.env.MCP_DISABLED?.toLowerCase() !== 'true',
        detail: process.env.MCP_DISABLED?.toLowerCase() === 'true' ? 'MCP_DISABLED=true (kill switch activo)' : 'no',
      }

      checks.mcpAllowedHosts = {
        ok: true,
        detail: process.env.MCP_ALLOWED_HOSTS?.trim() || 'sin restricción (recomendable definir en producción)',
      }

      const allOk = Object.values(checks).every((c) => c.ok)
      return {
        ok: allOk,
        durationMs: Date.now() - startedAt,
        checks,
        toolCount: TOOL_REGISTRY.length,
        timestamp: new Date().toISOString(),
      }
    },
  },
]
