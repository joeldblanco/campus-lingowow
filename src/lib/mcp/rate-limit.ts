/**
 * Rate limiting in-memory por userId para el endpoint MCP.
 *
 * Para deployments multi-instance (Vercel serverless con múltiples regiones)
 * esto NO es global — cada instancia mantiene su propio contador. Para
 * límites estrictos a nivel de cuenta, sustituye por Redis/Upstash.
 *
 * Política por defecto: 60 requests por minuto por userId. Se puede ajustar
 * vía MCP_RATE_LIMIT_PER_MINUTE. Algunos tools costosos tienen un límite
 * separado más estricto — ver TOOL_LIMITS.
 */

const WINDOW_MS = 60_000

const buckets = new Map<string, { count: number; resetAt: number }>()
const toolBuckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Límite específico por tool, en requests/minuto. Se aplica EN ADICIÓN al
 * límite global por userId; el más restrictivo manda. Útil para tools que
 * golpean APIs externas con sus propios límites (Cloudinary, LiveKit, AI).
 */
const TOOL_LIMITS: Record<string, number> = {
  lingowow_files_sync_cloudinary: 2,
  lingowow_files_batch_delete: 5,
  lingowow_classroom_recover_orphaned_recordings: 2,
  lingowow_users_impersonate_token: 5,
  lingowow_notifications_send_bulk: 3,
  lingowow_academic_periods_generate_year: 2,
  lingowow_finance_report: 10,
  lingowow_analytics_revenue: 10,
  lingowow_analytics_expenses: 10,
  lingowow_analytics_projections: 10,
}

function getLimit(): number {
  const raw = process.env.MCP_RATE_LIMIT_PER_MINUTE
  if (!raw) return 60
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
  limit: number
}

export function checkMcpRateLimit(userId: string): RateLimitResult {
  const limit = getLimit()
  const now = Date.now()
  const bucket = buckets.get(userId)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0, limit }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      limit,
    }
  }

  bucket.count += 1
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
    limit,
  }
}

/**
 * Limpia buckets expirados para evitar crecimiento ilimitado en procesos largos.
 * Llamar periódicamente; barato (O(n) sobre el mapa).
 */
export function pruneExpiredBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  for (const [key, bucket] of toolBuckets.entries()) {
    if (bucket.resetAt <= now) toolBuckets.delete(key)
  }
}

/**
 * Verifica el límite específico de una tool. Se evalúa AL INICIO de la
 * ejecución de la tool (después del límite global). Si se excede, devuelve
 * un error que el server convierte en McpToolError 'FORBIDDEN'.
 */
export function checkToolRateLimit(userId: string, toolName: string): RateLimitResult {
  const limit = TOOL_LIMITS[toolName]
  if (!limit) {
    // No hay límite específico; el global ya validó.
    return { ok: true, remaining: -1, retryAfterSeconds: 0, limit: -1 }
  }
  const now = Date.now()
  const key = `${userId}::${toolName}`
  const bucket = toolBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    toolBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0, limit }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      limit,
    }
  }

  bucket.count += 1
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
    limit,
  }
}

/**
 * Lectura del catálogo de límites por tool — útil para que la tool de help
 * lo exponga al agente sin tener que duplicar la información.
 */
export function getToolRateLimits(): Record<string, number> {
  return { ...TOOL_LIMITS }
}
