'use server'

import { db } from '@/lib/db'
import { NotificationType, UserRole, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/utils/session'

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
  teacherId: string
  courseName: string
  enrollmentId: string
}) {
  const { studentId, studentName, teacherId, courseName, enrollmentId } = data

  // Notificar al profesor
  await createNotification({
    userId: teacherId,
    type: NotificationType.NEW_ENROLLMENT,
    title: 'Nuevo estudiante inscrito',
    message: `${studentName} se ha inscrito en ${courseName}`,
    link: `/teacher/students`,
    metadata: { studentId, enrollmentId, courseName },
  })

  // Notificar a los administradores
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
