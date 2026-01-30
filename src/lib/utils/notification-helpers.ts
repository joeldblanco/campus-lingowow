import { NotificationType, UserRole } from '@prisma/client'

export const notificationTypeLabels: Record<NotificationType, string> = {
  NEW_ENROLLMENT: 'Nueva Inscripción',
  ENROLLMENT_CONFIRMED: 'Inscripción Confirmada',
  TASK_ASSIGNED: 'Tarea Asignada',
  TASK_SUBMITTED: 'Tarea Enviada',
  TASK_GRADED: 'Tarea Calificada',
  PAYMENT_RECEIVED: 'Pago Recibido',
  PAYMENT_CONFIRMED: 'Pago Confirmado',
  TEACHER_PAYMENT_CONFIRMED: 'Pago de Profesor',
  CLASS_REMINDER: 'Recordatorio de Clase',
  CLASS_CANCELLED: 'Clase Cancelada',
  CLASS_RESCHEDULED: 'Clase Reagendada',
  RECORDING_READY: 'Grabación Lista',
  SYSTEM_ANNOUNCEMENT: 'Anuncio del Sistema',
  ACCOUNT_UPDATE: 'Actualización de Cuenta',
}

export const notificationTypeIcons: Record<NotificationType, string> = {
  NEW_ENROLLMENT: '👤',
  ENROLLMENT_CONFIRMED: '✅',
  TASK_ASSIGNED: '📝',
  TASK_SUBMITTED: '📤',
  TASK_GRADED: '⭐',
  PAYMENT_RECEIVED: '💰',
  PAYMENT_CONFIRMED: '💳',
  TEACHER_PAYMENT_CONFIRMED: '✔️',
  CLASS_REMINDER: '⏰',
  CLASS_CANCELLED: '❌',
  CLASS_RESCHEDULED: '📅',
  RECORDING_READY: '🎥',
  SYSTEM_ANNOUNCEMENT: '📢',
  ACCOUNT_UPDATE: '👤',
}

export const notificationTypeColors: Record<NotificationType, string> = {
  NEW_ENROLLMENT: 'bg-blue-500',
  ENROLLMENT_CONFIRMED: 'bg-green-500',
  TASK_ASSIGNED: 'bg-purple-500',
  TASK_SUBMITTED: 'bg-indigo-500',
  TASK_GRADED: 'bg-yellow-500',
  PAYMENT_RECEIVED: 'bg-emerald-500',
  PAYMENT_CONFIRMED: 'bg-green-500',
  TEACHER_PAYMENT_CONFIRMED: 'bg-teal-500',
  CLASS_REMINDER: 'bg-orange-500',
  CLASS_CANCELLED: 'bg-red-500',
  CLASS_RESCHEDULED: 'bg-amber-500',
  RECORDING_READY: 'bg-blue-600',
  SYSTEM_ANNOUNCEMENT: 'bg-slate-500',
  ACCOUNT_UPDATE: 'bg-gray-500',
}

export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TEACHER]: 'Profesor',
  [UserRole.STUDENT]: 'Estudiante',
  [UserRole.GUEST]: 'Invitado',
  [UserRole.EDITOR]: 'Editor',
}

export const roleShortLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.TEACHER]: 'Prof',
  [UserRole.STUDENT]: 'Est',
  [UserRole.GUEST]: 'Inv',
  [UserRole.EDITOR]: 'Ed',
}

export function formatNotificationType(type: NotificationType): string {
  return notificationTypeLabels[type] || type
}

export function getNotificationIcon(type: NotificationType): string {
  return notificationTypeIcons[type] || '📬'
}

export function getNotificationColor(type: NotificationType): string {
  return notificationTypeColors[type] || 'bg-gray-500'
}

export function formatRoleLabel(role: UserRole): string {
  return roleLabels[role] || role
}

export function formatRoleShortLabel(role: UserRole): string {
  return roleShortLabels[role] || role
}

export function validateNotificationPayload(
  title: string,
  message: string,
  roles: UserRole[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!title || title.trim().length === 0) {
    errors.push('El título es obligatorio')
  }

  if (title && title.length > 255) {
    errors.push('El título no puede exceder 255 caracteres')
  }

  if (!message || message.trim().length === 0) {
    errors.push('El mensaje es obligatorio')
  }

  if (message && message.length > 2000) {
    errors.push('El mensaje no puede exceder 2000 caracteres')
  }

  if (!roles || roles.length === 0) {
    errors.push('Debes seleccionar al menos un rol')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function sanitizeNotificationContent(content: string): string {
  return content
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 2000)
}
