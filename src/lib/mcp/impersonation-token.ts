import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const TTL_SECONDS = 300 // 5 minutos

interface ImpersonationTokenPayload {
  sub: string // targetUserId
  by: string // originalUserId (admin que generó el token)
  type: 'mcp-impersonate'
  iat: number
  exp: number
}

/**
 * Genera un token JWT firmado para suplantar a un usuario. El token caduca en
 * 5 minutos y debe ser canjeado por el endpoint /api/admin/impersonate/consume,
 * que crea la sesión NextAuth correspondiente.
 *
 * @returns el token raw — incluirlo en una URL de un solo uso para el admin.
 */
export function signImpersonationToken(targetUserId: string, originalUserId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado')
  }
  return jwt.sign(
    {
      sub: targetUserId,
      by: originalUserId,
      type: 'mcp-impersonate' as const,
    },
    JWT_SECRET,
    { expiresIn: TTL_SECONDS }
  )
}

export function verifyImpersonationToken(
  token: string
): { targetUserId: string; originalUserId: string } | null {
  if (!JWT_SECRET) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ImpersonationTokenPayload
    if (payload.type !== 'mcp-impersonate') return null
    if (!payload.sub || !payload.by) return null
    return { targetUserId: payload.sub, originalUserId: payload.by }
  } catch {
    return null
  }
}

export function buildImpersonationUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const path = `/api/admin/impersonate/consume?token=${encodeURIComponent(token)}`
  return base ? `${base}${path}` : path
}

export const IMPERSONATION_TOKEN_TTL_SECONDS = TTL_SECONDS
