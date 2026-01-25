// Types for Teacher Schedule View

import { Prisma } from '@prisma/client'

export type LessonStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'available' | 'blocked'

export interface Student {
  id: string
  name: string
  lastName?: string
  email: string
  image?: string | null
}

// Prisma-based type for raw booking data from database
export type TeacherScheduleLessonRaw = Prisma.ClassBookingGetPayload<{
  include: {
    student: {
      select: {
        id: true
        name: true
        lastName: true
        email: true
        image: true
      }
    }
    enrollment: {
      include: {
        course: {
          select: {
            id: true
            title: true
            level: true
            classDuration: true
          }
        }
      }
    }
  }
}>

// Transformed type for client-side usage (with processed fields)
export interface TeacherScheduleLesson {
  id: string
  courseTitle: string
  courseLevel: string
  courseId: string
  student: {
    id: string
    name: string
    lastName?: string
    email: string
    image?: string | null
  }
  startTime: string
  endTime: string
  date: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  topic?: string
  duration: number
  roomUrl?: string
  color: 'blue' | 'purple' | 'orange' | 'green' | 'gray'
  enrollmentId: string
}

export interface ScheduleLesson {
  id: string
  courseTitle: string
  courseLevel: string
  courseId: string
  student: Student
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  date: Date
  status: LessonStatus
  topic?: string
  duration: number // in minutes
  roomUrl?: string
  color?: 'blue' | 'purple' | 'orange' | 'green' | 'gray'
}

export interface TeacherAvailabilitySlot {
  id: string
  day: string
  startTime: string
  endTime: string
}

export interface TeacherScheduleData {
  lessons: TeacherScheduleLesson[]
  availability: TeacherAvailabilitySlot[]
  blockedDays: string[]
}

export interface AvailableSlot {
  id: string
  startTime: string
  endTime: string
  date: Date
  duration: number
}

export interface BlockedSlot {
  id: string
  startTime: string
  endTime: string
  date: Date
  reason?: string
}

export type ScheduleViewType = 'day' | 'week' | 'month'

export interface DaySchedule {
  date: Date
  lessons: ScheduleLesson[]
  availableSlots: AvailableSlot[]
  blockedSlots: BlockedSlot[]
}

export interface WeekSchedule {
  startDate: Date
  endDate: Date
  days: DaySchedule[]
}

export interface MonthSchedule {
  month: number
  year: number
  days: DaySchedule[]
}

// Helper function to get color classes based on course type
export function getLessonColorClasses(color: ScheduleLesson['color'] = 'blue') {
  const colorMap = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      border: 'border-blue-200 dark:border-blue-800/50',
      text: 'text-blue-700 dark:text-blue-300',
      accent: 'border-l-primary',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/40',
      border: 'border-purple-200 dark:border-purple-800/50',
      text: 'text-purple-700 dark:text-purple-300',
      accent: 'border-l-purple-500',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/40',
      border: 'border-orange-200 dark:border-orange-800/50',
      text: 'text-orange-700 dark:text-orange-300',
      accent: 'border-l-orange-400',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/40',
      border: 'border-green-200 dark:border-green-800/50',
      text: 'text-green-700 dark:text-green-300',
      accent: 'border-l-green-500',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      accent: 'border-l-gray-300 dark:border-l-gray-600',
    },
  }
  return colorMap[color]
}

// Helper to get initials from name
export function getInitials(name: string, lastName?: string): string {
  const first = name.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : name.split(' ')[1]?.charAt(0)?.toUpperCase() || ''
  return first + last
}
