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

export async function authenticateMcpRequest(
  request: NextRequest,
  toolScopes?: string[]
): Promise<McpAuthResult> {
  const required = toolScopes && toolScopes.length > 0 ? toolScopes : [BASE_MCP_SCOPE]

  const auth: ApiAuthResult = await authenticateRequest(request, required)
  if (!auth.success || !auth.userId) {
    return {
      success: false,
      error: auth.error || 'No autorizado',
      status: auth.status || 401,
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
  // Wildcard por dominio: mcp:users:* cubre mcp:users:read y mcp:users:write
  const parts = required.split(':')
  if (parts.length < 2) return false
  const domainWildcard = `${parts.slice(0, -1).join(':')}:*`
  return scopes.includes(domainWildcard)
}

export function hasAllScopes(scopes: string[], required: string[]): boolean {
  return required.every((scope) => hasScope(scopes, scope))
}
