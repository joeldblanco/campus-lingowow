import crypto from 'crypto'
import { db } from '@/lib/db'

const TTL_SECONDS = 300 // 5 minutos
const TOKEN_PREFIX = 'lw_imp_'

export const IMPERSONATION_TOKEN_TTL_SECONDS = TTL_SECONDS

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRawToken(): string {
  // 32 bytes = 256 bits de entropía
  return `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`
}

/**
 * Genera y persiste un token de impersonación de un solo uso. El raw token se
 * devuelve UNA vez para construir el magic link; en BD solo se guarda el hash.
 *
 * Garantías:
 *   - Uso único: el endpoint de consumo marca `usedAt` dentro de una transacción.
 *   - TTL fijo de 5 minutos (no extensible).
 *   - Revocación: borrar el registro o forzar `usedAt`.
 */
export async function issueImpersonationToken(
  targetUserId: string,
  originalUserId: string
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRawToken()
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000)

  await db.impersonationToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      originalUserId,
      targetUserId,
      expiresAt,
    },
  })

  return { rawToken, expiresAt }
}

interface ConsumeResult {
  ok: true
  targetUserId: string
  originalUserId: string
}

interface ConsumeError {
  ok: false
  reason: 'not_found' | 'expired' | 'already_used'
}

/**
 * Canjea un token de impersonación. Atómico:
 *   1. Busca por hash.
 *   2. Verifica que no haya expirado.
 *   3. Verifica que `usedAt` siga siendo null.
 *   4. Setea `usedAt` con consumedFromIp/consumedFromUa para trazabilidad.
 *
 * Devuelve los IDs originales solo si el canje es válido. En cualquier otro
 * caso devuelve un objeto con `ok: false` y la razón.
 */
export async function consumeImpersonationToken(
  rawToken: string,
  metadata?: { ip?: string | null; userAgent?: string | null }
): Promise<ConsumeResult | ConsumeError> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) {
    return { ok: false, reason: 'not_found' }
  }
  const tokenHash = hashToken(rawToken)

  const record = await db.impersonationToken.findUnique({
    where: { tokenHash },
  })

  if (!record) return { ok: false, reason: 'not_found' }
  if (record.usedAt) return { ok: false, reason: 'already_used' }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  // Usamos updateMany con condición sobre usedAt para evitar TOCTOU si hay
  // dos requests concurrentes con el mismo token.
  const claim = await db.impersonationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: {
      usedAt: new Date(),
      consumedFromIp: metadata?.ip ?? undefined,
      consumedFromUa: metadata?.userAgent ?? undefined,
    },
  })
  if (claim.count !== 1) {
    return { ok: false, reason: 'already_used' }
  }

  return {
    ok: true,
    targetUserId: record.targetUserId,
    originalUserId: record.originalUserId,
  }
}

export function buildImpersonationUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const path = `/api/admin/impersonate/consume?token=${encodeURIComponent(token)}`
  return base ? `${base}${path}` : path
}

/**
 * Mantenimiento: elimina tokens expirados o canjeados con > 24h. Llamar desde
 * un cron periódico para evitar crecimiento ilimitado de la tabla.
 */
export async function pruneOldImpersonationTokens(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const result = await db.impersonationToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { lt: cutoff } }],
    },
  })
  return { deleted: result.count }
}
