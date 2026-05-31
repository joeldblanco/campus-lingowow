import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { authenticateRequest, type ApiAuthResult } from '@/lib/api-auth'
import { db } from '@/lib/db'

export interface McpAuthResult {
  success: boolean
  error?: string
  status?: number
  userId?: string
  scopes?: string[]
  roles?: UserRole[]
}

const BASE_MCP_SCOPE = 'mcp:access'

/**
 * `mcp:access` es un scope IMPLÍCITO: cualquier API key con al menos un scope
 * `mcp:<dominio>:<accion>` o el wildcard global `*` lo recibe automáticamente.
 * Lo usan las meta tools (lingowow_help, lingowow_health) y el chequeo de
 * acceso al endpoint en sí.
 */
function hasImplicitMcpAccess(scopes: string[]): boolean {
  if (scopes.includes('*')) return true
  return scopes.some((s) => s === BASE_MCP_SCOPE || s.startsWith('mcp:'))
}

export async function authenticateMcpRequest(
  request: NextRequest,
  toolScopes?: string[]
): Promise<McpAuthResult> {
  // En la fase de autenticación NO exigimos un scope específico — cualquier
  // key con cualquier scope MCP entra al endpoint. La autorización fina se
  // hace en cada tool vía `hasAllScopes(ctx.scopes, tool.scopes)`.
  const auth: ApiAuthResult = await authenticateRequest(request, toolScopes)
  if (!auth.success || !auth.userId) {
    return {
      success: false,
      error: auth.error || 'No autorizado',
      status: auth.status || 401,
    }
  }

  // Si la key no tiene NINGÚN scope MCP, rechazar el endpoint completo.
  if (!hasImplicitMcpAccess(auth.scopes ?? [])) {
    return {
      success: false,
      error: 'Tu API key no tiene scopes MCP. Añade al menos uno (mcp:*:read).',
      status: 403,
    }
  }

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { roles: true, status: true },
  })

  if (!user) {
    return { success: false, error: 'Usuario no encontrado', status: 401 }
  }

  if (user.status !== 'ACTIVE') {
    return { success: false, error: 'La cuenta del usuario no está activa', status: 403 }
  }

  if (!user.roles.includes(UserRole.ADMIN)) {
    return {
      success: false,
      error: 'El servidor MCP requiere un usuario con rol ADMIN',
      status: 403,
    }
  }

  return {
    success: true,
    userId: auth.userId,
    scopes: auth.scopes ?? [],
    roles: user.roles,
  }
}

export function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes('*') || scopes.includes(required)) return true

  // mcp:access es implícito: lo recibe cualquier key con cualquier scope mcp:*.
  if (required === BASE_MCP_SCOPE && hasImplicitMcpAccess(scopes)) return true

  // Wildcard por dominio: mcp:users:* cubre mcp:users:read y mcp:users:write
  const parts = required.split(':')
  if (parts.length < 2) return false
  const domainWildcard = `${parts.slice(0, -1).join(':')}:*`
  if (scopes.includes(domainWildcard)) return true

  // Wildcard global mcp:*
  if (parts[0] === 'mcp' && scopes.includes('mcp:*')) return true

  return false
}

export function hasAllScopes(scopes: string[], required: string[]): boolean {
  return required.every((scope) => hasScope(scopes, scope))
}
