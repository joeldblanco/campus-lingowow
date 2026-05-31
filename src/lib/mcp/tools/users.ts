import { z } from 'zod'
import { UserRole, UserStatus } from '@prisma/client'
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
} from '@/lib/actions/user'
import { CreateUserSchema } from '@/schemas/user'
import { unwrapActionResult, McpToolError } from '@/lib/mcp/errors'
import { getMcpContext } from '@/lib/mcp/context'
import {
  IMPERSONATION_TOKEN_TTL_SECONDS,
  buildImpersonationUrl,
  issueImpersonationToken,
} from '@/lib/mcp/impersonation-token'
import type { AnyToolModule } from '@/lib/mcp/types'

const userRoleEnum = z.enum([
  UserRole.ADMIN,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.EDITOR,
  UserRole.GUEST,
] as const)

const userStatusEnum = z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE] as const)

export const userTools: AnyToolModule[] = [
  {
    name: 'lingowow_users_list',
    description:
      'Lista usuarios del campus. Soporta paginación con limit/offset (default limit 50, máx 200).',
    scopes: ['mcp:users:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const result = await getAllUsers()
      if (!Array.isArray(result)) {
        return unwrapActionResult(result)
      }
      return {
        total: result.length,
        limit,
        offset,
        users: result.slice(offset, offset + limit).map((u) => ({
          id: u.id,
          name: u.name,
          lastName: u.lastName,
          email: u.email,
          roles: u.roles,
          status: u.status,
          createdAt: u.createdAt,
        })),
      }
    },
  },

  {
    name: 'lingowow_users_get',
    description: 'Obtiene un usuario por ID o por email. Indica al menos uno.',
    scopes: ['mcp:users:read'],
    inputShape: {
      id: z.string().optional(),
      email: z.string().email().optional(),
    },
    handler: async ({ id, email }) => {
      if (!id && !email) {
        throw new Error('Debes indicar id o email')
      }
      const user = id ? await getUserById(id) : await getUserByEmail(email!)
      return unwrapActionResult(user)
    },
  },

  {
    name: 'lingowow_users_create',
    description:
      'Crea un usuario nuevo. La contraseña debe cumplir las reglas estándar: 8-32 chars, mayúscula, minúscula, número y símbolo.',
    scopes: ['mcp:users:write'],
    inputShape: {
      name: z.string().min(2),
      lastName: z.string().optional(),
      email: z.string().email(),
      password: z.string().min(8),
      roles: z.array(userRoleEnum).default([UserRole.STUDENT]),
      status: userStatusEnum.default(UserStatus.ACTIVE),
      image: z.string().nullable().optional(),
    },
    handler: async (args) => {
      const data = CreateUserSchema.parse(args)
      const user = await createUser(data)
      return unwrapActionResult(user)
    },
  },

  {
    name: 'lingowow_users_update',
    description: 'Actualiza un usuario existente. Pasa solo los campos a modificar.',
    scopes: ['mcp:users:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      image: z.string().nullable().optional(),
      roles: z.array(userRoleEnum).optional(),
      status: userStatusEnum.optional(),
    },
    handler: async ({ id, ...data }) => {
      const updated = await updateUser(id, data)
      return unwrapActionResult(updated)
    },
  },

  {
    name: 'lingowow_users_set_status',
    description: 'Activa o desactiva una cuenta de usuario.',
    scopes: ['mcp:users:write'],
    inputShape: {
      id: z.string().min(1),
      status: userStatusEnum,
    },
    handler: async ({ id, status }) => {
      const updated = await updateUser(id, { status })
      return unwrapActionResult(updated)
    },
  },

  {
    name: 'lingowow_users_delete',
    description:
      'Elimina un usuario por ID. Operación destructiva: no es idempotente y borra datos relacionados según las reglas del schema.',
    scopes: ['mcp:users:write'],
    inputShape: {
      id: z.string().min(1),
    },
    handler: async ({ id }) => {
      const result = await deleteUser(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_users_impersonate_token',
    description:
      'Genera un magic link de un solo uso para impersonar a un usuario. El admin (dueño de la API key) debe abrir la URL en un navegador donde ya esté logueado como ese mismo admin — el endpoint /api/admin/impersonate/consume verifica que la cookie coincida y crea la sesión del usuario destino. TTL: 5 minutos.',
    scopes: ['mcp:users:impersonate'],
    inputShape: {
      targetUserId: z.string().min(1),
      baseUrl: z
        .string()
        .url()
        .optional()
        .describe('Si no se pasa, se usa NEXT_PUBLIC_APP_URL del servidor'),
    },
    handler: async ({ targetUserId, baseUrl }) => {
      const ctx = getMcpContext()
      if (!ctx?.userId) {
        throw new McpToolError(
          'Esta tool solo se puede invocar desde el servidor MCP (no se detectó contexto)',
          'FORBIDDEN'
        )
      }
      const { rawToken, expiresAt } = await issueImpersonationToken(targetUserId, ctx.userId)
      const url = buildImpersonationUrl(rawToken, baseUrl)
      return {
        token: rawToken,
        url,
        expiresAt: expiresAt.toISOString(),
        ttlSeconds: IMPERSONATION_TOKEN_TTL_SECONDS,
        instructions:
          'Abre esta URL en un navegador donde estés logueado como el admin que ejecutó esta tool. El token es de un solo uso — al canjearse, queda inutilizable. Caduca en 5 minutos.',
      }
    },
  },
]
