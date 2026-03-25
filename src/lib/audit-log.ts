import { db } from '@/lib/db'
import { AuditAction, AuditCategory, Prisma } from '@prisma/client'
import { headers } from 'next/headers'

interface AuditLogParams {
  userId?: string | null
  action: AuditAction
  category: AuditCategory
  description: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra una acción en el sistema de audit logs.
 * Extrae automáticamente IP y User-Agent de los headers si no se proporcionan.
 * Se ejecuta de forma no-bloqueante (fire-and-forget).
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    let ipAddress = params.ipAddress
    let userAgent = params.userAgent

    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers()
        ipAddress =
          ipAddress ||
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          headersList.get('x-real-ip') ||
          undefined
        userAgent = userAgent || headersList.get('user-agent') || undefined
      } catch {
        // headers() puede fallar fuera de un request context
      }
    }

    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        category: params.category,
        description: params.description,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    })
  } catch (error) {
    // No lanzar errores - el logging no debe afectar el flujo principal
    console.error('[AUDIT LOG ERROR]', error)
  }
}

/**
 * Versión fire-and-forget del audit log.
 * Útil para no bloquear la respuesta del servidor.
 */
export function auditLog(params: AuditLogParams) {
  createAuditLog(params).catch((err) => console.error('[AUDIT LOG ERROR]', err))
}
