import { NextRequest, NextResponse } from 'next/server'
import { signIn, auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { auditLog } from '@/lib/audit-log'
import { consumeImpersonationToken } from '@/lib/mcp/impersonation-token'
import { hasRole } from '@/lib/utils/roles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/impersonate/consume?token=<raw>
 *
 * Canjea un token de impersonación generado por el MCP (lingowow_users_impersonate_token).
 * El token es de un solo uso: se persiste en BD y se marca `usedAt` atómicamente.
 *
 * Requiere:
 *   1. Sesión NextAuth válida del admin que generó el token (la cookie debe coincidir
 *      con el `originalUserId` del registro).
 *   2. Token válido, no expirado y no canjeado previamente.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  // Verificar sesión PRIMERO — si no es el admin correcto, ni siquiera consumimos
  // el token (lo dejamos disponible por si el admin real lo está abriendo).
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión como el admin que generó el token' },
      { status: 401 }
    )
  }
  if (!hasRole(session.user.roles, UserRole.ADMIN)) {
    return NextResponse.json(
      { error: 'Solo los administradores pueden canjear tokens de impersonación' },
      { status: 403 }
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')
  const ua = request.headers.get('user-agent')

  const result = await consumeImpersonationToken(token, { ip, userAgent: ua })
  if (!result.ok) {
    const message =
      result.reason === 'expired'
        ? 'El token ha expirado'
        : result.reason === 'already_used'
          ? 'El token ya fue canjeado'
          : 'Token inválido'
    return NextResponse.json({ error: message }, { status: result.reason === 'not_found' ? 401 : 410 })
  }

  if (session.user.id !== result.originalUserId) {
    // El token es válido pero pertenece a otro admin — no lo consumimos como
    // exitoso. (Aunque ya marcamos usedAt; aceptamos esa pequeña fuga: el token
    // fue presentado por alguien con sesión admin pero distinto al emisor.)
    return NextResponse.json(
      { error: 'El token fue generado por otro usuario administrador' },
      { status: 403 }
    )
  }

  const targetUser = await db.user.findUnique({
    where: { id: result.targetUserId },
    select: { id: true, email: true, status: true, timezone: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario destino no existe' }, { status: 404 })
  }
  if (targetUser.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'El usuario destino no está activo' }, { status: 403 })
  }

  auditLog({
    userId: session.user.id,
    action: 'USER_IMPERSONATED',
    category: 'ADMIN',
    description: `Impersonación canjeada vía MCP token: ${session.user.id} → ${targetUser.id}`,
    metadata: {
      adminId: session.user.id,
      targetUserId: targetUser.id,
      via: 'mcp-magic-link',
      ip,
      userAgent: ua,
    },
  })

  const impersonationData = {
    originalUserId: session.user.id,
    targetUserId: targetUser.id,
    isImpersonating: true,
    targetTimezone: targetUser.timezone ?? 'America/Lima',
  }

  await signIn('credentials', {
    userId: targetUser.id,
    impersonationData: JSON.stringify(impersonationData),
    redirect: false,
  })

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
