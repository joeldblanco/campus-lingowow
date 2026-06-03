// Mock Prisma Client for testing
export const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type UserStatus = typeof UserStatus[keyof typeof UserStatus]

export const EnrollmentStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
} as const

export type EnrollmentStatus = typeof EnrollmentStatus[keyof typeof EnrollmentStatus]

export const NotificationType = {
  NEW_ENROLLMENT: 'NEW_ENROLLMENT',
  ENROLLMENT_CONFIRMED: 'ENROLLMENT_CONFIRMED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_SUBMITTED: 'TASK_SUBMITTED',
  TASK_GRADED: 'TASK_GRADED',
  EXAM_ASSIGNED: 'EXAM_ASSIGNED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  TEACHER_PAYMENT_CONFIRMED: 'TEACHER_PAYMENT_CONFIRMED',
  CLASS_REMINDER: 'CLASS_REMINDER',
  CLASS_CANCELLED: 'CLASS_CANCELLED',
  CLASS_RESCHEDULED: 'CLASS_RESCHEDULED',
  RECORDING_READY: 'RECORDING_READY',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
} as const

export type NotificationType = typeof NotificationType[keyof typeof NotificationType]

export const AssignmentStatus = {
  ASSIGNED: 'ASSIGNED',
  STARTED: 'STARTED',
  SUBMITTED: 'SUBMITTED',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const

export type AssignmentStatus = typeof AssignmentStatus[keyof typeof AssignmentStatus]

export const PrismaClient = class PrismaClient {}
