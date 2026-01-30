import { NotificationType, UserRole } from '@prisma/client'

export interface BulkNotificationFilters {
  roles: UserRole[]
  userStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL'
  language?: string
  level?: string
  courseId?: string
  teacherRankId?: string
  academicPeriodId?: string
}

export interface BulkNotificationPayload {
  title: string
  message: string
  type: NotificationType
  link?: string
  metadata?: Record<string, unknown>
  filters: BulkNotificationFilters
}

export interface BulkNotificationResult {
  success: boolean
  totalSent: number
  byRole: Record<UserRole, number>
  failedCount: number
  error?: string
  notificationIds?: string[]
}

export interface BulkNotificationStats {
  id: string
  title: string
  message: string
  type: NotificationType
  filters: BulkNotificationFilters
  totalSent: number
  byRole: Record<UserRole, number>
  sentAt: Date
  sentBy: string
}

export interface NotificationPreviewData {
  title: string
  message: string
  type: NotificationType
  link?: string
  affectedUsers: {
    role: UserRole
    count: number
  }[]
  totalAffected: number
}

export interface BulkNotificationHistoryItem {
  id: string
  title: string
  message: string
  type: NotificationType
  totalSent: number
  byRole: Record<string, number>
  sentAt: Date
  sentBy: {
    id: string
    name: string
    email: string
  }
}
