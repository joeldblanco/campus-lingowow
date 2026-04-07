'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { AuditAction, AuditCategory, UserRole } from '@prisma/client'
import { formatFullName } from '@/lib/utils/name-formatter'
import { hasRole } from '@/lib/utils/roles'

export interface AuditLogFilters {
  search?: string
  action?: AuditAction
  category?: AuditCategory
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface AuditLogItem {
  id: string
  action: AuditAction
  category: AuditCategory
  description: string
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    name: string
    lastName: string | null
    email: string
    roles: UserRole[]
    image: string | null
  } | null
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const session = await auth()
  if (!session?.user?.id || !hasRole(session.user.roles, UserRole.ADMIN)) {
    return { error: 'No autorizado' }
  }

  const { search, action, category, userId, dateFrom, dateTo, page = 1, pageSize = 50 } = filters

  const where: Record<string, unknown> = {}

  if (action) where.action = action
  if (category) where.category = category
  if (userId) where.userId = userId

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
    }
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { ipAddress: { contains: search } },
    ]
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            roles: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ])

  return {
    logs: logs as AuditLogItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function exportAuditLogs(filters: AuditLogFilters = {}) {
  const session = await auth()
  if (!session?.user?.id || !hasRole(session.user.roles, UserRole.ADMIN)) {
    return { error: 'No autorizado' }
  }

  const { search, action, category, userId, dateFrom, dateTo } = filters

  const where: Record<string, unknown> = {}

  if (action) where.action = action
  if (category) where.category = category
  if (userId) where.userId = userId

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
    }
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const logs = await db.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          lastName: true,
          email: true,
          roles: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000, // Limitar exportación a 10k registros
  })

  return logs.map((log) => ({
    fecha: log.createdAt.toISOString(),
    usuario: log.user ? formatFullName(log.user.name, log.user.lastName) : 'Sistema',
    email: log.user?.email || '-',
    roles: log.user?.roles?.join(', ') || '-',
    accion: log.action,
    categoria: log.category,
    descripcion: log.description,
    ip: log.ipAddress || '-',
    metadata: log.metadata ? JSON.stringify(log.metadata) : '-',
  }))
}
