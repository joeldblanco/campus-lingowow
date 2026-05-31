/**
 * Idempotencia para tools MCP de escritura.
 *
 * El cliente puede pasar `idempotencyKey` (string) en cualquier tool. La primera
 * llamada ejecuta el handler y cachea el resultado por TTL_MS; las siguientes
 * llamadas con la misma (userId, tool, idempotencyKey) devuelven el resultado
 * cacheado sin volver a ejecutar el handler.
 *
 * Esto evita duplicados cuando un agente reintenta por timeout o fallo de red.
 *
 * Limitaciones (MVP):
 *  - Cache in-memory por instancia (no compartido entre réplicas serverless).
 *  - TTL fijo de 24h. Para cargas críticas, mover a Redis con persistencia.
 */

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 5000

interface CachedEntry {
  result: unknown
  expiresAt: number
}

const cache = new Map<string, CachedEntry>()

function makeKey(userId: string, tool: string, idempotencyKey: string): string {
  return `${userId}::${tool}::${idempotencyKey}`
}

function evictExpired(now = Date.now()) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}

function evictOldestIfFull() {
  if (cache.size < MAX_ENTRIES) return
  // Elimina el primer (más antiguo) entry. Map mantiene orden de inserción.
  const firstKey = cache.keys().next().value
  if (firstKey) cache.delete(firstKey)
}

export function getIdempotentResult(
  userId: string,
  tool: string,
  idempotencyKey: string
): unknown | undefined {
  evictExpired()
  const entry = cache.get(makeKey(userId, tool, idempotencyKey))
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(makeKey(userId, tool, idempotencyKey))
    return undefined
  }
  return entry.result
}

export function storeIdempotentResult(
  userId: string,
  tool: string,
  idempotencyKey: string,
  result: unknown
): void {
  evictOldestIfFull()
  cache.set(makeKey(userId, tool, idempotencyKey), {
    result,
    expiresAt: Date.now() + TTL_MS,
  })
}

export function clearIdempotencyCache(): void {
  cache.clear()
}
