import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
    classBooking: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    userActivity: {
      findMany: vi.fn(),
    },
    userStreak: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/utils/date', () => ({
  convertTimeSlotFromUTC: vi.fn((day: string, slot: string) => ({
    day,
    timeSlot: slot,
  })),
  formatToISO: vi.fn((date: Date) => date.toISOString().split('T')[0]),
  getCurrentDate: vi.fn(() => new Date('2026-07-10T12:00:00Z')),
}))

import { getStudentDashboardStats } from './dashboard'

describe('getStudentDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches student statistics and maps enrollment teacherName correctly', async () => {
    // Mock student timezone
    vi.mocked(db.user.findUnique).mockResolvedValue({ timezone: 'America/Lima' } as never)

    // Mock enrollments with a teacher
    vi.mocked(db.enrollment.findMany).mockResolvedValue([
      {
        id: 'enrollment-1',
        progress: 45.5,
        course: {
          id: 'course-1',
          title: 'Lingowow Exclusivo',
          language: 'ENGLISH',
          image: '/images/course.png',
        },
        teacher: {
          name: 'Sarah',
          lastName: 'Connor',
        },
      },
    ] as never)

    // Mock booking counts for attendance rate
    vi.mocked(db.classBooking.count)
      .mockResolvedValueOnce(10) // total bookings
      .mockResolvedValueOnce(8)  // attended bookings

    // Mock upcoming classes
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      {
        id: 'booking-1',
        day: '2026-07-10',
        timeSlot: '15:00 - 16:00',
        teacher: {
          name: 'John',
          lastName: 'Doe',
        },
        enrollment: {
          course: {
            title: 'Lingowow Exclusivo',
          },
        },
      },
    ] as never)

    // Mock user activities (XP points)
    vi.mocked(db.userActivity.findMany).mockResolvedValue([
      {
        activity: {
          points: 150,
        },
      },
    ] as never)

    // Mock streak
    vi.mocked(db.userStreak.findUnique).mockResolvedValue({
      currentStreak: 5,
      longestStreak: 12,
    } as never)

    const stats = await getStudentDashboardStats('student-1')

    expect(stats.activeCourses).toBe(1)
    expect(stats.attendanceRate).toBe(80)
    expect(stats.totalPoints).toBe(150)
    expect(stats.currentLevel).toBe(2) // Math.floor(150 / 100) + 1
    expect(stats.currentStreak).toBe(5)
    
    // Check teacherName mapping
    expect(stats.enrollments).toHaveLength(1)
    expect(stats.enrollments[0]).toEqual({
      id: 'enrollment-1',
      courseId: 'course-1',
      title: 'Lingowow Exclusivo',
      image: '/images/course.png',
      progress: 45.5,
      teacherName: 'Sarah Connor',
    })

    // Check upcomingClasses mapping
    expect(stats.upcomingClasses).toHaveLength(1)
    expect(stats.upcomingClasses[0]).toEqual({
      course: 'Lingowow Exclusivo',
      teacher: 'John Doe',
      date: '2026-07-10',
      time: '15:00 - 16:00',
      link: '/classroom?classId=booking-1',
    })
  })
})
