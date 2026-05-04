/**
 * Rate limiting in-memory por userId para el endpoint MCP.
 *
 * Para deployments multi-instance (Vercel serverless con múltiples regiones)
 * esto NO es global — cada instancia mantiene su propio contador. Para
 * límites estrictos a nivel de cuenta, sustituye por Redis/Upstash.
 *
 * Política por defecto: 60 requests por minuto por userId. Se puede ajustar
 * vía MCP_RATE_LIMIT_PER_MINUTE.
 */

const WINDOW_MS = 60_000

const buckets = new Map<string, { count: number; resetAt: number }>()

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
}
