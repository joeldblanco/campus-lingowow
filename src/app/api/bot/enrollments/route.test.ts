import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Student = {
  id: string
  email: string
  name: string | null
  lastName: string | null
  roles: string[]
  timezone: string
}

type Enrollment = {
  id: string
  studentId: string
  courseId: string
  academicPeriodId: string
  teacherId: string | null
  status: string
  classesTotal: number
}

type State = {
  students: Student[]
  enrollments: Enrollment[]
  invoices: Array<{ paypalOrderId: string }>
  schedules: Array<{ enrollmentId: string; dayOfWeek: number; startTime: string; endTime: string }>
  bookings: Array<{ teacherId: string; enrollmentId: string; day: string; timeSlot: string }>
}

type Options = { failBookingAt?: number }

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  courseFindUnique: vi.fn(),
  academicPeriodFindUnique: vi.fn(),
  enrollmentFindUnique: vi.fn(),
  enrollmentCreate: vi.fn(),
  invoiceFindFirst: vi.fn(),
  classScheduleCreate: vi.fn(),
  classBookingFindUnique: vi.fn(),
  classBookingCreate: vi.fn(),
  transaction: vi.fn(),
  verifyPaypalTransaction: vi.fn(),
  createInvoiceFromPaypal: vi.fn(),
  notify: vi.fn(),
  convertRecurringScheduleToUTC: vi.fn(),
  convertTimeSlotToUTC: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => ({ authenticateRequest: mocks.authenticate }))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transaction,
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    course: { findUnique: mocks.courseFindUnique },
    academicPeriod: { findUnique: mocks.academicPeriodFindUnique },
    enrollment: { findUnique: mocks.enrollmentFindUnique },
  },
}))
vi.mock('@/lib/actions/commercial', () => ({
  verifyPaypalTransaction: mocks.verifyPaypalTransaction,
  createInvoiceFromPaypal: mocks.createInvoiceFromPaypal,
}))
vi.mock('@/lib/enrollments/self-service-enrollment', () => ({
  notifySelfServiceEnrollmentCreated: mocks.notify,
}))
vi.mock('@/lib/utils/date', () => ({
  convertRecurringScheduleToUTC: mocks.convertRecurringScheduleToUTC,
  convertTimeSlotToUTC: mocks.convertTimeSlotToUTC,
}))

import { POST } from './route'

const course = {
  id: 'course-1',
  title: 'English',
  classDuration: 60,
  isSynchronous: true,
}
const academicPeriod = {
  id: 'period-1',
  name: '2026',
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2099-12-31T00:00:00.000Z'),
}
const teacher = { id: 'teacher-1', name: 'Teacher', lastName: null, roles: ['TEACHER'], timezone: 'UTC' }

function cloneState(state: State): State {
  return {
    students: state.students.map((student) => ({ ...student, roles: [...student.roles] })),
    enrollments: state.enrollments.map((enrollment) => ({ ...enrollment })),
    invoices: state.invoices.map((invoice) => ({ ...invoice })),
    schedules: state.schedules.map((schedule) => ({ ...schedule })),
    bookings: state.bookings.map((booking) => ({ ...booking })),
  }
}

function makeClient(target: State, options: Options = {}) {
  let bookingCreates = 0
  return {
    user: {
      findUnique: async ({ where, select }: { where: Record<string, string>; select?: unknown }) => {
        const student = where.email
          ? target.students.find((candidate) => candidate.email === where.email)
          : target.students.find((candidate) => candidate.id === where.id)
        if (student) {
          if (where.id === teacher.id && select && JSON.stringify(select).includes('timezone')) return teacher
          if (where.id === teacher.id && select && JSON.stringify(select).includes('roles')) return teacher
          return { ...student }
        }
        if (where.id === teacher.id) return teacher
        return null
      },
      create: async ({ data }: { data: Omit<Student, 'id' | 'timezone'> }) => {
        const student = {
          id: `student-${target.students.length + 1}`,
          timezone: 'UTC',
          ...data,
        }
        target.students.push(student)
        return student
      },
    },
    enrollment: {
      findUnique: async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => {
        const key = where.studentId_courseId_academicPeriodId as
          | { studentId: string; courseId: string; academicPeriodId: string }
          | undefined
        const enrollment = key
          ? target.enrollments.find(
              (candidate) =>
                candidate.studentId === key.studentId &&
                candidate.courseId === key.courseId &&
                candidate.academicPeriodId === key.academicPeriodId
            )
          : target.enrollments.find((candidate) => candidate.id === where.id)
        if (!enrollment) return null
        if (!include) return { ...enrollment }
        const student = target.students.find((candidate) => candidate.id === enrollment.studentId)!
        return {
          ...enrollment,
          student: { id: student.id, name: student.name, lastName: student.lastName, email: student.email },
          course: { id: course.id, title: course.title, language: 'English', level: 'A1' },
          academicPeriod,
          teacher: enrollment.teacherId ? { id: teacher.id, name: teacher.name, lastName: teacher.lastName } : null,
          schedules: target.schedules.filter((schedule) => schedule.enrollmentId === enrollment.id),
        }
      },
      create: async ({ data }: { data: Omit<Enrollment, 'id'> }) => {
        const enrollment = { id: `enrollment-${target.enrollments.length + 1}`, ...data }
        target.enrollments.push(enrollment)
        return enrollment
      },
    },
    invoice: {
      findFirst: async ({ where }: { where: { paypalOrderId: string } }) =>
        target.invoices.find((invoice) => invoice.paypalOrderId === where.paypalOrderId) ?? null,
      create: async ({ data }: { data: { paypalOrderId: string } }) => {
        const invoice = { paypalOrderId: data.paypalOrderId }
        target.invoices.push(invoice)
        return invoice
      },
    },
    classSchedule: {
      create: async ({ data }: { data: State['schedules'][number] }) => {
        target.schedules.push(data)
        return data
      },
    },
    classBooking: {
      findUnique: async ({ where }: { where: { teacherId_day_timeSlot: { teacherId: string; day: string; timeSlot: string } } }) => {
        const key = where.teacherId_day_timeSlot
        return (
          target.bookings.find(
            (booking) =>
              booking.teacherId === key.teacherId && booking.day === key.day && booking.timeSlot === key.timeSlot
          ) ?? null
        )
      },
      create: async ({ data }: { data: State['bookings'][number] }) => {
        bookingCreates++
        if (bookingCreates === options.failBookingAt) throw new Error('booking constraint failed')
        target.bookings.push(data)
        return data
      },
    },
  }
}

function installHarness(state: State, options: Options = {}) {
  mocks.transaction.mockImplementation(async (callback: (client: ReturnType<typeof makeClient>) => Promise<unknown>) => {
    const staged = cloneState(state)
    const result = await callback(makeClient(staged, options))
    Object.assign(state, staged)
    return result
  })
}

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bot/enrollments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    studentEmail: 'new@example.com',
    studentName: 'New Student',
    courseId: course.id,
    academicPeriodId: academicPeriod.id,
    teacherId: teacher.id,
    ...overrides,
  }
}

const paypalData = {
  type: 'order',
  resourceId: 'paypal-1',
  email: 'new@example.com',
  firstName: 'New',
  lastName: 'Student',
  amount: 100,
  currency: 'USD',
  items: [],
  date: new Date('2026-11-01T00:00:00.000Z'),
}

describe('POST /api/bot/enrollments atomicity', () => {
  let state: State

  beforeEach(() => {
    vi.clearAllMocks()
    state = { students: [], enrollments: [], invoices: [], schedules: [], bookings: [] }
    mocks.authenticate.mockResolvedValue({ success: true })
    mocks.courseFindUnique.mockResolvedValue(course)
    mocks.academicPeriodFindUnique.mockResolvedValue(academicPeriod)
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: false })
    mocks.createInvoiceFromPaypal.mockResolvedValue({ success: true })
    mocks.notify.mockResolvedValue({ success: true })
    mocks.convertRecurringScheduleToUTC.mockImplementation((dayOfWeek: number, startTime: string, endTime: string) => ({
      dayOfWeek,
      startTime,
      endTime,
    }))
    mocks.convertTimeSlotToUTC.mockImplementation((day: string, timeSlot: string) => ({ day, timeSlot }))
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.userCreate.mockImplementation(async ({ data }: { data: Omit<Student, 'id' | 'timezone'> }) => {
      const student = { id: `student-${state.students.length + 1}`, timezone: 'UTC', ...data }
      state.students.push(student)
      return student
    })
    mocks.enrollmentFindUnique.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it('rolls back the student, enrollment, invoice, schedules, and earlier bookings after a late booking failure', async () => {
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: true, data: paypalData })
    installHarness(state, { failBookingAt: 2 })

    const response = await POST(
      buildRequest(
        validBody({
          paypalOrderId: paypalData.resourceId,
          weeklySchedule: [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }],
          scheduledClasses: [
            { date: '2026-11-03', startTime: '10:00', endTime: '11:00' },
            { date: '2026-11-04', startTime: '10:00', endTime: '11:00' },
          ],
        })
      )
    )

    expect(response.status).toBe(500)
    expect(state).toEqual({ students: [], enrollments: [], invoices: [], schedules: [], bookings: [] })
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it('commits successful counts while skipping an occupied slot', async () => {
    state.bookings.push({
      teacherId: teacher.id,
      enrollmentId: 'other-enrollment',
      day: '2026-11-03',
      timeSlot: '10:00-11:00',
    })
    installHarness(state)

    const response = await POST(
      buildRequest(
        validBody({
          weeklySchedule: [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }],
          scheduledClasses: [
            { date: '2026-11-03', startTime: '10:00', endTime: '11:00' },
            { date: '2026-11-04', startTime: '10:00', endTime: '11:00' },
          ],
        })
      )
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { schedulesCreated: 1, classesCreated: 1 },
    })
    expect(state.students).toHaveLength(1)
    expect(state.enrollments).toHaveLength(1)
    expect(state.schedules).toHaveLength(1)
    expect(state.bookings).toHaveLength(2)
    expect(mocks.notify).toHaveBeenCalledWith('enrollment-1')
  })

  it('commits a verified PayPal invoice through the transaction client', async () => {
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: true, data: paypalData })
    mocks.createInvoiceFromPaypal.mockImplementation(
      async (_data: unknown, _userId: string, client: ReturnType<typeof makeClient>) => {
        await client.invoice.create({ data: { paypalOrderId: paypalData.resourceId } })
        return { success: true }
      }
    )
    installHarness(state)

    const response = await POST(buildRequest(validBody({ paypalOrderId: paypalData.resourceId })))

    expect(response.status).toBe(201)
    expect(mocks.createInvoiceFromPaypal).toHaveBeenCalledWith(
      paypalData,
      'student-1',
      expect.objectContaining({ invoice: expect.any(Object) })
    )
    expect(state.invoices).toEqual([{ paypalOrderId: paypalData.resourceId }])
  })

  it.each([
    ['course', () => mocks.courseFindUnique.mockResolvedValue(null)],
    ['academic period', () => mocks.academicPeriodFindUnique.mockResolvedValue(null)],
  ])('does not create a student when the %s validation fails', async (_label, failValidation) => {
    failValidation()
    installHarness(state)

    const response = await POST(buildRequest(validBody()))

    expect(response.status).toBe(404)
    expect(state.students).toEqual([])
    expect(mocks.userCreate).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('does not create a student when required student validation fails', async () => {
    installHarness(state)

    const response = await POST(buildRequest(validBody({ studentName: undefined })))

    expect(response.status).toBe(400)
    expect(state.students).toEqual([])
    expect(state.enrollments).toEqual([])
  })

  it('does not leave a new student when the enrollment is a duplicate', async () => {
    const existingStudent: Student = {
      id: 'student-1',
      email: 'new@example.com',
      name: 'Existing',
      lastName: null,
      roles: ['STUDENT'],
      timezone: 'UTC',
    }
    state.students.push(existingStudent)
    state.enrollments.push({
      id: 'existing-enrollment',
      studentId: existingStudent.id,
      courseId: course.id,
      academicPeriodId: academicPeriod.id,
      teacherId: null,
      status: 'ACTIVE',
      classesTotal: 8,
    })
    installHarness(state)

    const response = await POST(buildRequest(validBody()))

    expect(response.status).toBe(409)
    expect(state.students).toHaveLength(1)
    expect(state.enrollments).toHaveLength(1)
    await expect(response.json()).resolves.toMatchObject({ existingEnrollmentId: 'existing-enrollment' })
  })

  it('does not write when PayPal verification fails', async () => {
    installHarness(state)
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: false, error: 'provider unavailable' })

    const response = await POST(buildRequest(validBody({ paypalOrderId: 'paypal-1' })))

    expect(response.status).toBe(400)
    expect(state.students).toEqual([])
    expect(state.enrollments).toEqual([])
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('reports invoice failure and rolls back the local transaction', async () => {
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: true, data: paypalData })
    mocks.createInvoiceFromPaypal.mockResolvedValue({ success: false, error: 'invoice failed' })
    installHarness(state)

    const response = await POST(buildRequest(validBody({ paypalOrderId: paypalData.resourceId })))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Error al generar la factura. La inscripción ha sido revertida.',
    })
    expect(state.students).toEqual([])
    expect(state.enrollments).toEqual([])
    expect(state.invoices).toEqual([])
  })
})
