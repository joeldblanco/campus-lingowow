import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    academicPeriod: {
      findUnique: vi.fn(),
    },
    classBooking: {
      findMany: vi.fn(),
    },
    teacherCourse: {
      findMany: vi.fn(),
    },
    teacherPaymentConfirmation: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@prisma/client', () => ({
  BookingStatus: {
    COMPLETED: 'COMPLETED',
  },
  Prisma: {
    validator: () => (value: unknown) => value,
  },
}))

import { getTeacherPaymentsReport } from './teacher-payments'

const startDate = new Date('2026-03-01T12:00:00.000Z')
const endDate = new Date('2026-03-31T12:00:00.000Z')

const teacher = {
  id: 'teacher-1',
  name: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@lingowow.com',
  image: null,
  paymentSettings: JSON.stringify({
    paymentMethod: 'paypal',
    paypalEmail: 'ada.payments@example.com',
  }),
  teacherRank: {
    name: 'Senior',
    rateMultiplier: 1.5,
  },
}

describe('getTeacherPaymentsReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.academicPeriod.findUnique).mockResolvedValue(null as never)
    vi.mocked(db.teacherCourse.findMany).mockResolvedValue([] as never)
    vi.mocked(db.teacherPaymentConfirmation.findMany).mockResolvedValue([] as never)
  })

  it('merges payable class detail, payment confirmation, and summary totals in one report', async () => {
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      {
        id: 'booking-2',
        teacherId: 'teacher-1',
        day: '2026-03-12',
        timeSlot: '11:00 - 11:30',
        isPayable: true,
        completedAt: new Date('2026-03-12T11:30:00.000Z'),
        teacher,
        student: {
          name: 'Grace',
          lastName: 'Hopper',
        },
        enrollment: {
          course: {
            id: 'course-2',
            title: 'English Conversation',
            classDuration: 30,
            defaultPaymentPerClass: 20,
          },
          academicPeriod: {
            id: 'period-1',
            name: 'Marzo 2026',
          },
        },
        teacherAttendances: [],
        attendances: [
          {
            timestamp: new Date('2026-03-12T11:00:00.000Z'),
          },
        ],
        videoCalls: [
          {
            duration: 30,
          },
        ],
      },
      {
        id: 'booking-1',
        teacherId: 'teacher-1',
        day: '2026-03-10',
        timeSlot: '10:00 - 11:00',
        isPayable: false,
        completedAt: new Date('2026-03-10T11:00:00.000Z'),
        teacher,
        student: {
          name: 'Margaret',
          lastName: 'Hamilton',
        },
        enrollment: {
          course: {
            id: 'course-1',
            title: 'English Basics',
            classDuration: 60,
            defaultPaymentPerClass: null,
          },
          academicPeriod: {
            id: 'period-1',
            name: 'Marzo 2026',
          },
        },
        teacherAttendances: [
          {
            timestamp: new Date('2026-03-10T10:00:00.000Z'),
          },
        ],
        attendances: [
          {
            timestamp: new Date('2026-03-10T10:01:00.000Z'),
          },
        ],
        videoCalls: [
          {
            duration: 60,
          },
        ],
      },
      {
        id: 'booking-3',
        teacherId: 'teacher-1',
        day: '2026-03-08',
        timeSlot: '09:00 - 09:30',
        isPayable: false,
        completedAt: new Date('2026-03-08T09:30:00.000Z'),
        teacher,
        student: {
          name: 'Katherine',
          lastName: 'Johnson',
        },
        enrollment: {
          course: {
            id: 'course-3',
            title: 'Pronunciation Lab',
            classDuration: 30,
            defaultPaymentPerClass: 12,
          },
          academicPeriod: {
            id: 'period-1',
            name: 'Marzo 2026',
          },
        },
        teacherAttendances: [],
        attendances: [],
        videoCalls: [
          {
            duration: 30,
          },
        ],
      },
    ] as never)
    vi.mocked(db.teacherCourse.findMany).mockResolvedValue([
      {
        teacherId: 'teacher-1',
        courseId: 'course-1',
        paymentPerClass: 18,
      },
    ] as never)
    vi.mocked(db.teacherPaymentConfirmation.findMany).mockResolvedValue([
      {
        teacherId: 'teacher-1',
        confirmedAt: new Date('2026-03-31T18:00:00.000Z'),
      },
    ] as never)

    const report = await getTeacherPaymentsReport({ startDate, endDate })

    expect(db.classBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'COMPLETED',
          day: {
            gte: '2026-03-01',
            lte: '2026-03-31',
          },
        },
        orderBy: {
          day: 'desc',
        },
      })
    )

    expect(report.summary).toEqual({
      totalTeachers: 1,
      totalClasses: 2,
      totalHours: 1.5,
      totalPayment: 38,
      averagePaymentPerTeacher: 38,
      averagePaymentPerClass: 19,
      totalCompletedClasses: 3,
      totalPayableClasses: 2,
      totalNonPayableClasses: 1,
    })

    expect(report.filters).toEqual({
      teacherId: null,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      periodId: null,
    })

    expect(report.teacherReports).toHaveLength(1)
    expect(report.teacherReports[0]).toMatchObject({
      teacherId: 'teacher-1',
      teacherName: 'Ada Lovelace',
      teacherEmail: 'ada@lingowow.com',
      rankName: 'Senior',
      rateMultiplier: 1.5,
      totalClasses: 2,
      totalHours: 1.5,
      totalPayment: 38,
      averagePerClass: 19,
      paymentMethod: 'PayPal',
      paymentDetails: 'ada.payments@example.com',
      paymentConfirmed: true,
      paymentConfirmedAt: new Date('2026-03-31T18:00:00.000Z'),
    })
    expect(report.teacherReports[0].classes).toHaveLength(2)
    expect(report.teacherReports[0].classes[1]).toMatchObject({
      id: 'booking-1',
      academicPeriodName: 'Marzo 2026',
      payment: 18,
      isPayable: false,
      teacherAttendanceTime: '2026-03-10T10:00:00.000Z',
      studentAttendanceTime: '2026-03-10T10:01:00.000Z',
    })
  })

  it('uses academic period dates when filtering by periodId so confirmations stay aligned', async () => {
    const periodStart = new Date('2026-04-01T00:00:00.000Z')
    const periodEnd = new Date('2026-04-30T23:59:59.999Z')

    vi.mocked(db.academicPeriod.findUnique).mockResolvedValue({
      startDate: periodStart,
      endDate: periodEnd,
    } as never)
    vi.mocked(db.classBooking.findMany).mockResolvedValue([
      {
        id: 'booking-4',
        teacherId: 'teacher-2',
        day: '2026-04-05',
        timeSlot: '08:00 - 08:30',
        isPayable: true,
        completedAt: new Date('2026-04-05T08:30:00.000Z'),
        teacher: {
          ...teacher,
          id: 'teacher-2',
          name: 'Sofia',
          lastName: 'Torres',
          paymentSettings: null,
          teacherRank: {
            name: 'Lead',
            rateMultiplier: 2,
          },
        },
        student: {
          name: 'Alan',
          lastName: 'Turing',
        },
        enrollment: {
          course: {
            id: 'course-4',
            title: 'Fluency Sprint',
            classDuration: 30,
            defaultPaymentPerClass: null,
          },
          academicPeriod: {
            id: 'period-2',
            name: 'Abril 2026',
          },
        },
        teacherAttendances: [],
        attendances: [],
        videoCalls: [],
      },
    ] as never)

    await getTeacherPaymentsReport({ periodId: 'period-2' })

    expect(db.academicPeriod.findUnique).toHaveBeenCalledWith({
      where: { id: 'period-2' },
      select: { startDate: true, endDate: true },
    })
    expect(db.teacherPaymentConfirmation.findMany).toHaveBeenCalledWith({
      where: {
        teacherId: { in: ['teacher-2'] },
        periodStart,
        periodEnd,
      },
      select: {
        teacherId: true,
        confirmedAt: true,
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    })
  })
})
