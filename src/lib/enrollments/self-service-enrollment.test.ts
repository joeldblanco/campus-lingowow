import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  notifySelfServiceEnrollmentCreated,
  upsertSelfServiceEnrollment,
} from './self-service-enrollment'
import { db } from '@/lib/db'
import { notifyNewEnrollment } from '@/lib/actions/notifications'
import { sendEnrollmentConfirmationStudentEmail, sendNewEnrollmentTeacherEmail } from '@/lib/mail'

vi.mock('@/lib/db', () => ({
  db: {
    enrollment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/actions/notifications', () => ({
  notifyNewEnrollment: vi.fn(),
}))

vi.mock('@/lib/mail', () => ({
  sendEnrollmentConfirmationStudentEmail: vi.fn(),
  sendNewEnrollmentTeacherEmail: vi.fn(),
}))

describe('self-service enrollment helper', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.mocked(db.enrollment.findUnique).mockReset()
    vi.mocked(db.enrollment.create).mockReset()
    vi.mocked(db.enrollment.update).mockReset()
    vi.mocked(notifyNewEnrollment).mockReset()
    vi.mocked(sendEnrollmentConfirmationStudentEmail).mockReset()
    vi.mocked(sendNewEnrollmentTeacherEmail).mockReset()
  })

  it('creates a new enrollment and reports it as newly created', async () => {
    vi.mocked(db.enrollment.findUnique).mockResolvedValueOnce(null)
    vi.mocked(db.enrollment.create).mockResolvedValueOnce({ id: 'enrollment-1' } as never)

    const result = await upsertSelfServiceEnrollment({
      studentId: 'student-1',
      courseId: 'course-1',
      academicPeriodId: 'period-1',
      teacherId: 'teacher-1',
      classesTotal: 6,
    })

    expect(result.wasCreated).toBe(true)
    expect(result.enrollment).toEqual({ id: 'enrollment-1' })
    expect(db.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 'student-1',
        courseId: 'course-1',
        academicPeriodId: 'period-1',
        teacherId: 'teacher-1',
        classesTotal: 6,
      }),
    })
  })

  it('updates an existing enrollment without changing classesTotal when disabled', async () => {
    vi.mocked(db.enrollment.findUnique).mockResolvedValueOnce({ id: 'enrollment-1' } as never)
    vi.mocked(db.enrollment.update).mockResolvedValueOnce({ id: 'enrollment-1' } as never)

    const result = await upsertSelfServiceEnrollment({
      studentId: 'student-1',
      courseId: 'course-1',
      academicPeriodId: 'period-1',
      classesTotal: 8,
      updateClassesTotal: false,
    })

    expect(result.wasCreated).toBe(false)
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: 'ACTIVE' },
    })
  })

  it('falls back to update when a concurrent create hits the unique constraint', async () => {
    vi.mocked(db.enrollment.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'enrollment-2' } as never)
    vi.mocked(db.enrollment.create).mockRejectedValueOnce({ code: 'P2002' })
    vi.mocked(db.enrollment.update).mockResolvedValueOnce({ id: 'enrollment-2' } as never)

    const result = await upsertSelfServiceEnrollment({
      studentId: 'student-1',
      courseId: 'course-1',
      academicPeriodId: 'period-1',
      classesTotal: 10,
      teacherId: 'teacher-2',
    })

    expect(result.wasCreated).toBe(false)
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-2' },
      data: {
        status: 'ACTIVE',
        classesTotal: 10,
        teacherId: 'teacher-2',
      },
    })
  })

  it('loads enrollment data and dispatches platform and email notifications', async () => {
    vi.mocked(db.enrollment.findUnique).mockResolvedValueOnce({
      id: 'enrollment-1',
      studentId: 'student-1',
      teacherId: 'teacher-1',
      enrollmentDate: new Date('2026-04-03T10:00:00.000Z'),
      student: {
        name: 'Ana',
        lastName: 'Pérez',
        email: 'ana@example.com',
        timezone: 'Asia/Tokyo',
      },
      teacher: {
        name: 'Luis',
        lastName: 'García',
        email: 'luis@example.com',
        timezone: 'America/Lima',
      },
      course: { title: 'English A1', isSynchronous: true },
      academicPeriod: { startDate: new Date('2026-04-01T00:00:00.000Z') },
      schedules: [{ dayOfWeek: 2, startTime: '23:00', endTime: '23:40' }],
      bookings: [{ day: '2026-04-10', timeSlot: '23:00-23:40' }],
    } as never)
    vi.mocked(notifyNewEnrollment).mockResolvedValueOnce({ success: true } as never)
    vi.mocked(sendEnrollmentConfirmationStudentEmail).mockResolvedValueOnce(undefined)
    vi.mocked(sendNewEnrollmentTeacherEmail).mockResolvedValueOnce(undefined)

    const result = await notifySelfServiceEnrollmentCreated('enrollment-1')

    expect(notifyNewEnrollment).toHaveBeenCalledWith({
      studentId: 'student-1',
      studentName: 'Ana Pérez',
      teacherId: 'teacher-1',
      courseName: 'English A1',
      enrollmentId: 'enrollment-1',
    })
    expect(sendEnrollmentConfirmationStudentEmail).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({
        studentName: 'Ana Pérez',
        courseName: 'English A1',
        teacherName: 'Luis García',
        isSynchronousCourse: true,
        firstClassDate: expect.stringContaining('11 de abril'),
        firstClassTime: expect.stringMatching(/8:00/),
      })
    )
    expect(sendNewEnrollmentTeacherEmail).toHaveBeenCalledWith(
      'luis@example.com',
      expect.objectContaining({
        teacherName: 'Luis García',
        studentName: 'Ana Pérez',
        courseName: 'English A1',
        studentScheduleSummary: expect.stringMatching(/martes.*6/),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('sends only the student confirmation when there is no teacher schedule yet', async () => {
    vi.mocked(db.enrollment.findUnique).mockResolvedValueOnce({
      id: 'enrollment-2',
      studentId: 'student-2',
      teacherId: null,
      enrollmentDate: new Date('2026-04-03T10:00:00.000Z'),
      student: {
        name: 'María',
        lastName: null,
        email: 'maria@example.com',
        timezone: 'America/Lima',
      },
      teacher: null,
      course: { title: 'French A2', isSynchronous: false },
      academicPeriod: { startDate: new Date('2026-04-01T00:00:00.000Z') },
      schedules: [],
      bookings: [],
    } as never)
    vi.mocked(notifyNewEnrollment).mockResolvedValueOnce({ success: true } as never)
    vi.mocked(sendEnrollmentConfirmationStudentEmail).mockResolvedValueOnce(undefined)

    await notifySelfServiceEnrollmentCreated('enrollment-2')

    expect(sendEnrollmentConfirmationStudentEmail).toHaveBeenCalledWith(
      'maria@example.com',
      expect.objectContaining({
        studentName: 'María',
        courseName: 'French A2',
        isSynchronousCourse: false,
      })
    )
    expect(sendNewEnrollmentTeacherEmail).not.toHaveBeenCalled()
  })

  it('derives the first class from recurring schedules when bookings are not available yet', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'))

    vi.mocked(db.enrollment.findUnique).mockResolvedValueOnce({
      id: 'enrollment-3',
      studentId: 'student-3',
      teacherId: 'teacher-3',
      enrollmentDate: new Date('2026-04-03T10:00:00.000Z'),
      student: {
        name: 'Sofía',
        lastName: 'López',
        email: 'sofia@example.com',
        timezone: 'Asia/Tokyo',
      },
      teacher: {
        name: 'Diego',
        lastName: 'Ruiz',
        email: 'diego@example.com',
        timezone: 'America/Lima',
      },
      course: { title: 'German B1', isSynchronous: true },
      academicPeriod: { startDate: new Date('2026-04-01T00:00:00.000Z') },
      schedules: [{ dayOfWeek: 0, startTime: '23:00', endTime: '23:40' }],
      bookings: [],
    } as never)
    vi.mocked(notifyNewEnrollment).mockResolvedValueOnce({ success: true } as never)
    vi.mocked(sendEnrollmentConfirmationStudentEmail).mockResolvedValueOnce(undefined)
    vi.mocked(sendNewEnrollmentTeacherEmail).mockResolvedValueOnce(undefined)

    await notifySelfServiceEnrollmentCreated('enrollment-3')

    expect(sendEnrollmentConfirmationStudentEmail).toHaveBeenCalledWith(
      'sofia@example.com',
      expect.objectContaining({
        isSynchronousCourse: true,
        firstClassDate: expect.stringContaining('6 de abril'),
        firstClassTime: expect.stringMatching(/8:00/),
      })
    )
  })
})
