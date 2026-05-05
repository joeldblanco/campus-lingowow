import { NextRequest, NextResponse } from 'next/server'
import { signIn, auth } from '@/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { auditLog } from '@/lib/audit-log'
import { verifyImpersonationToken } from '@/lib/mcp/impersonation-token'
import { hasRole } from '@/lib/utils/roles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/impersonate/consume?token=<jwt>
 *
 * Canjea un token de impersonación generado por el MCP (lingowow_users_impersonate_token).
 * Requiere:
 *   1. Sesión NextAuth válida del admin que generó el token (la cookie debe coincidir
 *      con el `originalUserId` del payload).
 *   2. Token JWT válido y no expirado (TTL: 5 minutos).
 *
 * Si todo es correcto, crea la sesión del usuario suplantado y redirige a /dashboard.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const payload = verifyImpersonationToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
  }

  // Verificar que la sesión actual coincide con el originalUserId del token.
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión como el admin que generó el token' },
      { status: 401 }
    )
  }
  if (session.user.id !== payload.originalUserId) {
    return NextResponse.json(
      { error: 'El token fue generado por otro usuario administrador' },
      { status: 403 }
    )
  }
  if (!hasRole(session.user.roles, UserRole.ADMIN)) {
    return NextResponse.json(
      { error: 'Solo los administradores pueden canjear tokens de impersonación' },
      { status: 403 }
    )
  }

  // Verificar que el usuario destino exista y esté activo.
  const targetUser = await db.user.findUnique({
    where: { id: payload.targetUserId },
    select: { id: true, email: true, status: true, timezone: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario destino no existe' }, { status: 404 })
  }
  if (targetUser.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'El usuario destino no está activo' }, { status: 403 })
  }

  // Auditar la acción antes de crear la nueva sesión (para no perder contexto).
  auditLog({
    userId: session.user.id,
    action: 'USER_IMPERSONATED',
    category: 'ADMIN',
    description: `Impersonación canjeada vía MCP token: ${session.user.id} → ${targetUser.id}`,
    metadata: {
      adminId: session.user.id,
      targetUserId: targetUser.id,
      via: 'mcp-magic-link',
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
