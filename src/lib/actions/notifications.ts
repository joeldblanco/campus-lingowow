'use server'

import { db } from '@/lib/db'
import { NotificationType, UserRole, Prisma, UserStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/utils/session'
import {
  BulkNotificationPayload,
  BulkNotificationResult,
  NotificationPreviewData,
  BulkNotificationFilters,
} from '@/types/notifications'

export interface NotificationWithUser {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: Date | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

// Obtener notificaciones del usuario actual
export async function getUserNotifications(limit: number = 20) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return { success: true, data: notifications }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, error: 'Error al obtener notificaciones' }
  }
}

// Obtener conteo de notificaciones no leídas
export async function getUnreadNotificationCount() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autenticado', count: 0 }
    }

    const count = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return { success: true, count }
  } catch (error) {
    console.error('Error counting unread notifications:', error)
    return { success: false, error: 'Error al contar notificaciones', count: 0 }
  }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    const notification = await db.notification.update({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath('/dashboard')
    return { success: true, data: notification }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, error: 'Error al marcar notificación como leída' }
  }
}

// Marcar todas las notificaciones como leídas
export async function markAllNotificationsAsRead() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    await db.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return { success: false, error: 'Error al marcar notificaciones como leídas' }
  }
}

// Eliminar una notificación
export async function deleteNotification(notificationId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    await db.notification.delete({
      where: {
        id: notificationId,
        userId: user.id,
      },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting notification:', error)
    return { success: false, error: 'Error al eliminar notificación' }
  }
}

// =============================================
// FUNCIONES INTERNAS PARA CREAR NOTIFICACIONES
// =============================================

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}

// Crear una notificación individual
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    })

    return { success: true, data: notification }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error: 'Error al crear notificación' }
  }
}

// Crear notificaciones para múltiples usuarios
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    const notifications = await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      })),
    })

    return { success: true, count: notifications.count }
  } catch (error) {
    console.error('Error creating notifications for users:', error)
    return { success: false, error: 'Error al crear notificaciones' }
  }
}

// Crear notificaciones para todos los administradores
export async function notifyAdmins(params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const admins = await db.user.findMany({
      where: {
        roles: { has: UserRole.ADMIN },
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    if (admins.length === 0) {
      return { success: true, count: 0 }
    }

    const adminIds = admins.map((admin) => admin.id)
    return await createNotificationsForUsers(adminIds, params)
  } catch (error) {
    console.error('Error notifying admins:', error)
    return { success: false, error: 'Error al notificar administradores' }
  }
}

// =============================================
// FUNCIONES ESPECÍFICAS POR EVENTO
// =============================================

// Notificar nueva inscripción de estudiante
export async function notifyNewEnrollment(data: {
  studentId: string
  studentName: string
  teacherId?: string
  courseName: string
  enrollmentId: string
}) {
  const { studentId, studentName, teacherId, courseName, enrollmentId } = data

  // Notificar al profesor solo si hay un teacherId válido
  if (teacherId && teacherId.trim() !== '') {
    await createNotification({
      userId: teacherId,
      type: NotificationType.NEW_ENROLLMENT,
      title: 'Nuevo estudiante inscrito',
      message: `${studentName} se ha inscrito en ${courseName}`,
      link: `/teacher/students`,
      metadata: { studentId, enrollmentId, courseName },
    })
  }

  // Notificar a los administradores (siempre)
  await notifyAdmins({
    type: NotificationType.NEW_ENROLLMENT,
    title: 'Nueva inscripción',
    message: `${studentName} se ha inscrito en ${courseName}`,
    link: `/admin/enrollments`,
    metadata: { studentId, enrollmentId, courseName },
  })
}

// Notificar tarea asignada al estudiante
export async function notifyTaskAssigned(data: {
  studentId: string
  taskTitle: string
  teacherName: string
  taskId: string
  dueDate?: Date
}) {
  const { studentId, taskTitle, teacherName, taskId, dueDate } = data

  await createNotification({
    userId: studentId,
    type: NotificationType.TASK_ASSIGNED,
    title: 'Nueva tarea asignada',
    message: `${teacherName} te ha asignado: ${taskTitle}`,
    link: `/dashboard/activities`,
    metadata: { taskId, dueDate: dueDate?.toISOString() },
  })
}

// Notificar confirmación de pago del profesor
export async function notifyTeacherPaymentConfirmed(data: {
  teacherId: string
  teacherName: string
  periodName: string
  amount: number
}) {
  const { teacherId, teacherName, periodName, amount } = data

  // Notificar a los administradores
  await notifyAdmins({
    type: NotificationType.TEACHER_PAYMENT_CONFIRMED,
    title: 'Pago de profesor confirmado',
    message: `${teacherName} confirmó su monto de $${amount.toFixed(2)} para ${periodName}`,
    link: `/admin/payments/teachers`,
    metadata: { teacherId, periodName, amount },
  })
}

// Notificar nueva compra/pago
export async function notifyNewPurchase(data: {
  userId: string
  userName: string
  productName: string
  amount: number
  invoiceId: string
}) {
  const { userId, userName, productName, amount, invoiceId } = data

  // Notificar a los administradores
  await notifyAdmins({
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Nuevo pago recibido',
    message: `${userName} ha pagado $${amount.toFixed(2)} por ${productName}`,
    link: `/admin/invoices/${invoiceId}`,
    metadata: { userId, productName, amount, invoiceId },
  })
}

// Notificar recordatorio de clase
export async function notifyClassReminder(data: {
  studentId: string
  teacherId: string
  courseName: string
  classTime: string
  bookingId: string
}) {
  const { studentId, teacherId, courseName, classTime, bookingId } = data

  // Notificar al estudiante
  await createNotification({
    userId: studentId,
    type: NotificationType.CLASS_REMINDER,
    title: 'Recordatorio de clase',
    message: `Tu clase de ${courseName} comienza en 1 hora (${classTime})`,
    link: `/dashboard/classes`,
    metadata: { bookingId, classTime },
  })

  // Notificar al profesor
  await createNotification({
    userId: teacherId,
    type: NotificationType.CLASS_REMINDER,
    title: 'Recordatorio de clase',
    message: `Tu clase de ${courseName} comienza en 1 hora (${classTime})`,
    link: `/teacher/schedule`,
    metadata: { bookingId, classTime },
  })
}

// Notificar clase reagendada
export async function notifyClassRescheduled(data: {
  studentId: string
  studentName: string
  teacherId: string
  teacherName: string
  courseName: string
  oldDay: string
  oldTimeSlot: string
  newDay: string
  newTimeSlot: string
  bookingId: string
}) {
  const { 
    studentId, 
    studentName, 
    teacherId, 
    teacherName, 
    courseName, 
    oldDay, 
    oldTimeSlot, 
    newDay, 
    newTimeSlot, 
    bookingId 
  } = data

  // Notificar al estudiante (confirmación)
  await createNotification({
    userId: studentId,
    type: NotificationType.CLASS_RESCHEDULED,
    title: 'Clase reagendada',
    message: `Tu clase de ${courseName} ha sido reagendada de ${oldDay} ${oldTimeSlot} a ${newDay} ${newTimeSlot}`,
    link: `/dashboard/schedule`,
    metadata: { bookingId, oldDay, oldTimeSlot, newDay, newTimeSlot, teacherName },
  })

  // Notificar al profesor
  await createNotification({
    userId: teacherId,
    type: NotificationType.CLASS_RESCHEDULED,
    title: 'Clase reagendada por estudiante',
    message: `${studentName} ha reagendado su clase de ${courseName} de ${oldDay} ${oldTimeSlot} a ${newDay} ${newTimeSlot}`,
    link: `/teacher/schedule`,
    metadata: { bookingId, oldDay, oldTimeSlot, newDay, newTimeSlot, studentId, studentName },
  })

  // Notificar a los administradores
  await notifyAdmins({
    type: NotificationType.CLASS_RESCHEDULED,
    title: 'Clase reagendada',
    message: `${studentName} reagendó su clase de ${courseName} con ${teacherName}`,
    link: `/admin/bookings`,
    metadata: { bookingId, studentId, teacherId, oldDay, oldTimeSlot, newDay, newTimeSlot },
  })
}

// =============================================
// FUNCIONES DE NOTIFICACIONES MASIVAS
// =============================================

// Obtener usuarios por filtros
async function getUsersByFilters(filters: BulkNotificationFilters) {
  try {
    const whereConditions: Prisma.UserWhereInput = {
      roles: {
        hasSome: filters.roles,
      },
    }

    if (filters.userStatus && filters.userStatus !== 'ALL') {
      whereConditions.status = filters.userStatus as UserStatus
    }

    if (filters.language) {
      whereConditions.timezone = { contains: filters.language }
    }

    const users = await db.user.findMany({
      where: whereConditions,
      select: { id: true, roles: true },
    })

    return users
  } catch (error) {
    console.error('Error fetching users by filters:', error)
    throw error
  }
}

// Obtener conteo de usuarios por rol
export async function getUserCountByRole(filters: BulkNotificationFilters) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      return { success: false, error: 'No autorizado' }
    }

    const counts: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.TEACHER]: 0,
      [UserRole.STUDENT]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.GUEST]: 0,
    }

    for (const role of filters.roles) {
      const count = await db.user.count({
        where: {
          roles: { has: role },
          status: filters.userStatus && filters.userStatus !== 'ALL' 
            ? (filters.userStatus as UserStatus)
            : undefined,
        },
      })
      counts[role] = count
    }

    return { success: true, data: counts }
  } catch (error) {
    console.error('Error counting users by role:', error)
    return { success: false, error: 'Error al contar usuarios' }
  }
}

// Enviar notificación masiva por rol
export async function sendBulkNotificationByRole(
  payload: BulkNotificationPayload
): Promise<BulkNotificationResult> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      return {
        success: false,
        totalSent: 0,
        byRole: {
          [UserRole.ADMIN]: 0,
          [UserRole.TEACHER]: 0,
          [UserRole.STUDENT]: 0,
          [UserRole.EDITOR]: 0,
          [UserRole.GUEST]: 0,
        },
        failedCount: 0,
        error: 'No autorizado',
      }
    }

    const users = await getUsersByFilters(payload.filters)

    if (users.length === 0) {
      return {
        success: true,
        totalSent: 0,
        byRole: {
          [UserRole.ADMIN]: 0,
          [UserRole.TEACHER]: 0,
          [UserRole.STUDENT]: 0,
          [UserRole.EDITOR]: 0,
          [UserRole.GUEST]: 0,
        },
        failedCount: 0,
      }
    }

    // Crear notificaciones en lotes
    const batchSize = 1000
    const notificationIds: string[] = []
    const byRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.TEACHER]: 0,
      [UserRole.STUDENT]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.GUEST]: 0,
    }

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)

      await db.notification.createMany({
        data: batch.map((u) => ({
          userId: u.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        })),
      })

      // Contar por rol
      batch.forEach((u) => {
        u.roles.forEach((role) => {
          if (role in byRole) {
            byRole[role as UserRole]++
          }
        })
      })
    }

    revalidatePath('/admin/notifications')

    return {
      success: true,
      totalSent: users.length,
      byRole,
      failedCount: 0,
      notificationIds,
    }
  } catch (error) {
    console.error('Error sending bulk notification:', error)
    return {
      success: false,
      totalSent: 0,
      byRole: {
        [UserRole.ADMIN]: 0,
        [UserRole.TEACHER]: 0,
        [UserRole.STUDENT]: 0,
        [UserRole.EDITOR]: 0,
        [UserRole.GUEST]: 0,
      },
      failedCount: 0,
      error: 'Error al enviar notificaciones masivas',
    }
  }
}

// Obtener preview de notificación masiva
export async function getBulkNotificationPreview(
  filters: BulkNotificationFilters
): Promise<{ success: boolean; data?: NotificationPreviewData; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.roles.includes(UserRole.ADMIN)) {
      return { success: false, error: 'No autorizado' }
    }

    const countResult = await getUserCountByRole(filters)
    if (!countResult.success || !countResult.data) {
      return { success: false, error: 'Error al obtener conteo de usuarios' }
    }

    const affectedUsers = Object.entries(countResult.data).map(([role, count]) => ({
      role: role as UserRole,
      count,
    }))

    const totalAffected = Object.values(countResult.data).reduce((a, b) => a + b, 0)

    return {
      success: true,
      data: {
        title: '',
        message: '',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        affectedUsers,
        totalAffected,
      },
    }
  } catch (error) {
    console.error('Error getting bulk notification preview:', error)
    return { success: false, error: 'Error al obtener preview' }
  }
}
