import { z } from 'zod'
import { NotificationType, UserRole } from '@prisma/client'
import {
  createNotification,
  createNotificationsForUsers,
  getBulkNotificationPreview,
  getUserCountByRole,
  notifyAdmins,
  sendBulkNotificationByRole,
} from '@/lib/actions/notifications'
import {
  checkNewsletterSubscription,
  getNewsletterSubscriptions,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} from '@/lib/actions/newsletter'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const notificationTypeEnum = z.nativeEnum(NotificationType)
const userRoleEnum = z.nativeEnum(UserRole)
const userStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ALL'])

const bulkFiltersShape = z.object({
  roles: z.array(userRoleEnum).min(1),
  userStatus: userStatusEnum.optional(),
  language: z.string().optional(),
  level: z.string().optional(),
  courseId: z.string().optional(),
  teacherRankId: z.string().optional(),
  academicPeriodId: z.string().optional(),
})

export const notificationTools: AnyToolModule[] = [
  {
    name: 'lingowow_notifications_create',
    description:
      'Crea una notificación dirigida a un usuario específico (in-app). El usuario la verá en su campanita.',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      userId: z.string().min(1),
      type: notificationTypeEnum,
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(2000),
      link: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    },
    handler: async (args) => {
      const result = await createNotification({
        userId: args.userId,
        type: args.type,
        title: args.title,
        message: args.message,
        link: args.link,
        metadata: args.metadata,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_create_for_users',
    description: 'Crea la misma notificación para una lista explícita de userIds (lote).',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      userIds: z.array(z.string().min(1)).min(1),
      type: notificationTypeEnum,
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(2000),
      link: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    },
    handler: async ({ userIds, type, title, message, link, metadata }) => {
      const result = await createNotificationsForUsers(userIds, {
        type,
        title,
        message,
        link,
        metadata,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_notify_admins',
    description: 'Crea la notificación para todos los usuarios con rol ADMIN activos.',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      type: notificationTypeEnum,
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(2000),
      link: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    },
    handler: async (args) => {
      const result = await notifyAdmins({
        type: args.type,
        title: args.title,
        message: args.message,
        link: args.link,
        metadata: args.metadata,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_bulk_preview',
    description:
      'Devuelve un preview de a cuántos usuarios afectaría una notificación masiva con los filtros dados, sin enviarla.',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      filters: bulkFiltersShape,
    },
    handler: async ({ filters }) => {
      const result = await getBulkNotificationPreview(filters)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_count_by_role',
    description: 'Cuenta cuántos usuarios coinciden con un set de filtros bulk, agrupados por rol.',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      filters: bulkFiltersShape,
    },
    handler: async ({ filters }) => {
      const result = await getUserCountByRole(filters)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_send_bulk',
    description:
      'Envía una notificación masiva a todos los usuarios que coincidan con los filtros (rol obligatorio, status/idioma/nivel/curso opcionales). Operación destructiva-on-recipients: se recomienda verificar antes con el preview.',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      type: notificationTypeEnum,
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(2000),
      link: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      filters: bulkFiltersShape,
    },
    handler: async (args) => {
      const result = await sendBulkNotificationByRole({
        type: args.type,
        title: args.title,
        message: args.message,
        link: args.link,
        metadata: args.metadata,
        filters: args.filters,
      })
      return unwrapActionResult(result)
    },
  },

  // Newsletter
  {
    name: 'lingowow_notifications_newsletter_list',
    description: 'Lista las suscripciones al newsletter con filtros opcionales (paginado).',
    scopes: ['mcp:notifications:read'],
    inputShape: {
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
      offset: z.number().int().min(0).optional(),
    },
    handler: async (args) => getNewsletterSubscriptions(args),
  },

  {
    name: 'lingowow_notifications_newsletter_check',
    description: 'Verifica si un email está suscrito al newsletter.',
    scopes: ['mcp:notifications:read'],
    inputShape: { email: z.string().email() },
    handler: async ({ email }) => checkNewsletterSubscription(email),
  },

  {
    name: 'lingowow_notifications_newsletter_subscribe',
    description: 'Suscribe un email al newsletter (idempotente: re-activa si estaba inactivo).',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      email: z.string().email(),
      name: z.string().optional(),
      source: z.string().optional(),
    },
    handler: async ({ email, name, source }) => {
      const result = await subscribeToNewsletter(email, name, source)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_notifications_newsletter_unsubscribe',
    description: 'Desuscribe un email del newsletter (lo marca como isActive=false).',
    scopes: ['mcp:notifications:write'],
    inputShape: { email: z.string().email() },
    handler: async ({ email }) => {
      const result = await unsubscribeFromNewsletter(email)
      return unwrapActionResult(result)
    },
  },
]
