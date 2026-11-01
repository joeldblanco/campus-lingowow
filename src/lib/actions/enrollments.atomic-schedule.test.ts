import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type EnrollmentRecord = {
  id: string
  studentId: string
  courseId: string
  academicPeriodId: string
  teacherId: string | null
  status: string
  progress: number
  classesTotal: number
  classesAttended: number
  classesMissed: number
  notes: string | null
  lastAccessed: Date | null
}

type BookingRecord = {
  id: string
  studentId: string
  teacherId: string
  enrollmentId: string | null
  day: string
  timeSlot: string
  status: string
  cancelledAt: Date | null
  cancelledBy: string | null
}

type ScheduleRecord = {
  id: string
  enrollmentId: string
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

type State = {
  enrollment: EnrollmentRecord | null
  bookings: BookingRecord[]
  schedules: ScheduleRecord[]
}

type Options = {
  failBookingCreateAt?: number
  failBookingUpdate?: boolean
  failScheduleCreateMany?: boolean
  createdNotes?: string | null
  reviewNotesBeforeUpdate?: string
}

type Counters = { bookingCreates: number }
type EnrollmentCreateData = Pick<
  EnrollmentRecord,
  | 'studentId'
  | 'courseId'
  | 'academicPeriodId'
  | 'status'
  | 'progress'
  | 'classesTotal'
  | 'classesAttended'
  | 'classesMissed'
> & { teacherId?: string | null }
type EnrollmentUpdateData = Partial<
  Pick<
    EnrollmentRecord,
    'status' | 'progress' | 'courseId' | 'academicPeriodId' | 'teacherId' | 'notes' | 'lastAccessed'
  >
> & { classesTotal?: number }
type BookingCreateData = Pick<
  BookingRecord,
  'studentId' | 'teacherId' | 'enrollmentId' | 'day' | 'timeSlot' | 'status'
>
type BookingUpdateData = Partial<Pick<BookingRecord, 'status' | 'cancelledAt' | 'cancelledBy'>>
type ScheduleData = Pick<ScheduleRecord, 'enrollmentId' | 'teacherId' | 'dayOfWeek' | 'startTime' | 'endTime'>
type DatabaseClient = {
  enrollment: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<EnrollmentRecord | null>
    findFirst: (args: { where: Record<string, unknown> }) => Promise<EnrollmentRecord | null>
    create: (args: { data: EnrollmentCreateData }) => Promise<EnrollmentRecord>
    update: (args: { data: EnrollmentUpdateData }) => Promise<EnrollmentRecord>
  }
  classBooking: {
    findUnique: (args: {
      where: { teacherId_day_timeSlot: { teacherId: string; day: string; timeSlot: string } }
    }) => Promise<BookingRecord | null>
    create: (args: { data: BookingCreateData }) => Promise<BookingRecord>
    update: (args: { where: { id: string }; data: BookingUpdateData }) => Promise<BookingRecord>
    updateMany: (args: {
      where: { enrollmentId: string; day: { gte: string }; status: { in: string[] } }
      data: BookingUpdateData
    }) => Promise<{ count: number }>
  }
  classSchedule: {
    create: (args: { data: ScheduleData }) => Promise<ScheduleRecord>
    createMany: (args: { data: ScheduleData[] }) => Promise<{ count: number }>
    deleteMany: (args: { where: { enrollmentId: string } }) => Promise<{ count: number }>
  }
  user: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<{ id: string }>
    findMany: (args: { where: { id: { in: string[] } } }) => Promise<Array<{ id: string; timezone: string }>>
  }
  course: { findUnique: (args: { where: Record<string, unknown> }) => Promise<{ isSynchronous: boolean; title: string }> }
  academicPeriod: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<{ startDate: Date; endDate: Date }>
  }
}

const mocks = vi.hoisted(() => ({
  enrollmentFindUnique: vi.fn(),
  enrollmentFindFirst: vi.fn(),
  enrollmentCreate: vi.fn(),
  enrollmentUpdate: vi.fn(),
  classBookingFindUnique: vi.fn(),
  classBookingCreate: vi.fn(),
  classBookingUpdate: vi.fn(),
  classBookingUpdateMany: vi.fn(),
  classScheduleCreate: vi.fn(),
  classScheduleCreateMany: vi.fn(),
  classScheduleDeleteMany: vi.fn(),
  userFindUnique: vi.fn(),
  courseFindUnique: vi.fn(),
  academicPeriodFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  verifyPaypalTransaction: vi.fn(),
  createInvoiceFromPaypal: vi.fn(),
  verifyLingowowInvoice: vi.fn(),
  notify: vi.fn(),
  revalidatePath: vi.fn(),
  auth: vi.fn(),
  auditLog: vi.fn(),
  getCurrentDate: vi.fn(),
  isAfterDate: vi.fn(),
  getTodayStart: vi.fn(),
  getStartOfDayUTC: vi.fn(),
  getEndOfDayUTC: vi.fn(),
  convertRecurringScheduleToUTC: vi.fn(),
  convertTimeSlotToUTC: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transaction,
    $queryRaw: mocks.queryRaw,
    enrollment: {
      findUnique: mocks.enrollmentFindUnique,
      findFirst: mocks.enrollmentFindFirst,
      create: mocks.enrollmentCreate,
      update: mocks.enrollmentUpdate,
    },
    classBooking: {
      findUnique: mocks.classBookingFindUnique,
      create: mocks.classBookingCreate,
      update: mocks.classBookingUpdate,
      updateMany: mocks.classBookingUpdateMany,
    },
    classSchedule: {
      create: mocks.classScheduleCreate,
      createMany: mocks.classScheduleCreateMany,
      deleteMany: mocks.classScheduleDeleteMany,
    },
    user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
    course: { findUnique: mocks.courseFindUnique },
    academicPeriod: { findUnique: mocks.academicPeriodFindUnique },
  },
}))

vi.mock('@/lib/actions/commercial', () => ({
  verifyPaypalTransaction: mocks.verifyPaypalTransaction,
  createInvoiceFromPaypal: mocks.createInvoiceFromPaypal,
  verifyLingowowInvoice: mocks.verifyLingowowInvoice,
}))
vi.mock('@/lib/enrollments/self-service-enrollment', () => ({
  notifySelfServiceEnrollmentCreated: mocks.notify,
}))
vi.mock('@/lib/audit-log', () => ({ auditLog: mocks.auditLog }))
vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/utils/date', () => ({
  getCurrentDate: mocks.getCurrentDate,
  isAfterDate: mocks.isAfterDate,
  getTodayStart: mocks.getTodayStart,
  getStartOfDayUTC: mocks.getStartOfDayUTC,
  getEndOfDayUTC: mocks.getEndOfDayUTC,
  convertRecurringScheduleToUTC: mocks.convertRecurringScheduleToUTC,
  convertTimeSlotToUTC: mocks.convertTimeSlotToUTC,
}))

import {
  createEnrollmentWithSchedule,
  updateEnrollmentSchedules,
  updateEnrollmentWithSchedule,
} from './enrollments'

const NOW = new Date('2026-11-01T00:00:00.000Z')
const enrollmentId = 'enrollment-1'

function makeEnrollment(overrides: Partial<EnrollmentRecord> = {}): EnrollmentRecord {
  return {
    id: enrollmentId,
    studentId: 'student-1',
    courseId: 'course-1',
    academicPeriodId: 'period-1',
    teacherId: 'teacher-1',
    status: 'ACTIVE',
    progress: 0,
    classesTotal: 8,
    classesAttended: 0,
    classesMissed: 0,
    notes: null,
    lastAccessed: null,
    ...overrides,
  }
}

function makeBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: 'booking-fixture',
    studentId: 'student-1',
    teacherId: 'teacher-1',
    enrollmentId,
    day: '2099-01-01',
    timeSlot: '10:00-10:40',
    status: 'CONFIRMED',
    cancelledAt: null,
    cancelledBy: null,
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
  return {
    id: 'schedule-fixture',
    enrollmentId,
    teacherId: 'teacher-1',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '10:40',
    ...overrides,
  }
}

function cloneState(value: State): State {
  return {
    enrollment: value.enrollment ? { ...value.enrollment } : null,
    bookings: value.bookings.map((booking) => ({ ...booking })),
    schedules: value.schedules.map((schedule) => ({ ...schedule })),
  }
}

function createClient(
  target: State,
  options: Options = {},
  counters: Counters = { bookingCreates: 0 }
): DatabaseClient {
  return {
    enrollment: {
      findUnique: async ({ where }) => {
        const enrollment = target.enrollment
        if ('id' in where && enrollment && enrollment.id === where.id) {
          return { ...enrollment }
        }
        return null
      },
      findFirst: async () => null,
      create: async ({ data }) => {
        const record = makeEnrollment({
          id: `enrollment-${target.enrollment ? 'next' : 'created'}`,
          studentId: data.studentId,
          courseId: data.courseId,
          academicPeriodId: data.academicPeriodId,
          teacherId: data.teacherId ?? null,
          status: data.status,
          progress: data.progress,
          classesTotal: data.classesTotal,
          classesAttended: data.classesAttended,
          classesMissed: data.classesMissed,
          notes: options.createdNotes ?? null,
        })
        target.enrollment = record
        return { ...record }
      },
      update: async ({ data }) => {
        if (!target.enrollment) throw new Error('enrollment missing')
        const { classesTotal, ...enrollmentData } = data
        Object.assign(target.enrollment, enrollmentData)
        if (typeof classesTotal === 'number') target.enrollment.classesTotal = classesTotal
        return { ...target.enrollment }
      },
    },
    classBooking: {
      findUnique: async ({ where }) => {
        const key = where.teacherId_day_timeSlot
        return (
          target.bookings.find(
            (booking) =>
              booking.teacherId === key.teacherId &&
              booking.day === key.day &&
              booking.timeSlot === key.timeSlot
          ) ?? null
        )
      },
      create: async ({ data }) => {
        counters.bookingCreates++
        if (counters.bookingCreates === options.failBookingCreateAt) {
          throw new Error('booking insert failed')
        }
        const booking = makeBooking({
          id: `booking-created-${counters.bookingCreates}`,
          studentId: data.studentId,
          teacherId: data.teacherId,
          enrollmentId: data.enrollmentId,
          day: data.day,
          timeSlot: data.timeSlot,
          status: data.status,
        })
        target.bookings.push(booking)
        return { ...booking }
      },
      update: async ({ where, data }) => {
        if (options.failBookingUpdate) throw new Error('booking reactivation failed')
        const booking = target.bookings.find((candidate) => candidate.id === where.id)
        if (!booking) throw new Error('booking missing')
        Object.assign(booking, data)
        return { ...booking }
      },
      updateMany: async ({ where, data }) => {
        const day = where.day.gte
        const statuses = new Set(where.status.in)
        const matching = target.bookings.filter(
          (booking) =>
            booking.enrollmentId === where.enrollmentId &&
            booking.day >= day &&
            statuses.has(booking.status)
        )
        matching.forEach((booking) => Object.assign(booking, data))
        return { count: matching.length }
      },
    },
    classSchedule: {
      create: async ({ data }) => {
        const schedule = makeSchedule({
          id: `schedule-created-${target.schedules.length + 1}`,
          enrollmentId: data.enrollmentId,
          teacherId: data.teacherId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        })
        target.schedules.push(schedule)
        return { ...schedule }
      },
      createMany: async ({ data }) => {
        if (options.failScheduleCreateMany) throw new Error('schedule createMany failed')
        data.forEach((item) => {
          target.schedules.push(
            makeSchedule({
              id: `schedule-created-${target.schedules.length + 1}`,
              enrollmentId: item.enrollmentId,
              teacherId: item.teacherId,
              dayOfWeek: item.dayOfWeek,
              startTime: item.startTime,
              endTime: item.endTime,
            })
          )
        })
        return { count: data.length }
      },
      deleteMany: async ({ where }) => {
        const kept = target.schedules.filter((schedule) => schedule.enrollmentId !== where.enrollmentId)
        const count = target.schedules.length - kept.length
        target.schedules = kept
        return { count }
      },
    },
    user: {
      findUnique: async () => ({ id: 'student-1' }),
      findMany: async ({ where }) =>
        where.id.in.map((id: string) => ({ id, timezone: 'UTC' })),
    },
    course: { findUnique: async () => ({ isSynchronous: true, title: 'English' }) },
    academicPeriod: {
      findUnique: async () => ({ startDate: new Date('2026-01-01'), endDate: new Date('2099-12-31') }),
    },
  }
}

function installDatabase(state: State, options: Options = {}) {
  const counters = { bookingCreates: 0 }
  const client = () => createClient(state, options, counters)
  mocks.enrollmentFindUnique.mockImplementation((args) => client().enrollment.findUnique(args))
  mocks.enrollmentFindFirst.mockImplementation((args) => client().enrollment.findFirst(args))
  mocks.enrollmentCreate.mockImplementation((args) => client().enrollment.create(args))
  mocks.enrollmentUpdate.mockImplementation((args) => client().enrollment.update(args))
  mocks.classBookingFindUnique.mockImplementation((args) => client().classBooking.findUnique(args))
  mocks.classBookingCreate.mockImplementation((args) => client().classBooking.create(args))
  mocks.classBookingUpdate.mockImplementation((args) => client().classBooking.update(args))
  mocks.classBookingUpdateMany.mockImplementation((args) => client().classBooking.updateMany(args))
  mocks.classScheduleCreate.mockImplementation((args) => client().classSchedule.create(args))
  mocks.classScheduleCreateMany.mockImplementation((args) => client().classSchedule.createMany(args))
  mocks.classScheduleDeleteMany.mockImplementation((args) => client().classSchedule.deleteMany(args))
  mocks.userFindUnique.mockImplementation((args) => client().user.findUnique(args))
  mocks.userFindMany.mockImplementation((args) => client().user.findMany(args))
  mocks.courseFindUnique.mockImplementation((args) => client().course.findUnique(args))
  mocks.academicPeriodFindUnique.mockImplementation((args) =>
    client().academicPeriod.findUnique(args)
  )
  mocks.queryRaw.mockImplementation(async () => {
    if (!state.enrollment) return []
    if (options.reviewNotesBeforeUpdate !== undefined) {
      state.enrollment.notes = options.reviewNotesBeforeUpdate
    }
    const marker = 'schedule_pending_review:scheduling_failed'
    if (!state.enrollment.notes) {
      state.enrollment.notes = marker
    } else if (!state.enrollment.notes.includes('schedule_pending_review:')) {
      state.enrollment.notes = `${state.enrollment.notes}; ${marker}`
    }
    return [{ id: state.enrollment.id, notes: state.enrollment.notes }]
  })
  mocks.transaction.mockImplementation(async (callback: (client: DatabaseClient) => Promise<unknown>) => {
    const staged = cloneState(state)
    const result = await callback(createClient(staged, options, { bookingCreates: 0 }))
    state.enrollment = staged.enrollment
    state.bookings = staged.bookings
    state.schedules = staged.schedules
    return result
  })
}

function classInput(date: string, startTime = '10:00', endTime = '10:40') {
  return { date, dayOfWeek: 1, startTime, endTime, teacherId: 'teacher-1' }
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    studentId: 'student-1',
    courseId: 'course-1',
    academicPeriodId: 'period-1',
    invoiceType: 'lingowow' as const,
    lingowowInvoiceNumber: 'invoice-1',
    teacherId: 'teacher-1',
    scheduledClasses: [classInput('2099-01-01')],
    isRecurring: false,
    weeklySchedule: [],
    userTimezone: 'UTC',
    ...overrides,
  }
}

describe('enrollment schedule atomicity', () => {
  let state: State

  beforeEach(() => {
    vi.clearAllMocks()
    state = { enrollment: null, bookings: [], schedules: [] }
    mocks.verifyLingowowInvoice.mockResolvedValue({ success: false })
    mocks.verifyPaypalTransaction.mockResolvedValue({ success: false })
    mocks.createInvoiceFromPaypal.mockResolvedValue({ success: true })
    mocks.notify.mockResolvedValue({ success: true })
    mocks.getCurrentDate.mockReturnValue(NOW)
    mocks.getTodayStart.mockReturnValue(NOW)
    mocks.isAfterDate.mockImplementation((left: Date, right: Date) => left > right)
    mocks.convertRecurringScheduleToUTC.mockImplementation(
      (dayOfWeek: number, startTime: string, endTime: string) => ({ dayOfWeek, startTime, endTime })
    )
    mocks.convertTimeSlotToUTC.mockImplementation((day: string, timeSlot: string) => ({ day, timeSlot }))
    installDatabase(state)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a created enrollment but rolls back schedules/bookings and marks scheduling review', async () => {
    installDatabase(state, { failBookingCreateAt: 2, createdNotes: 'manual scheduling context' })

    const result = await createEnrollmentWithSchedule(
      createInput({
        isRecurring: true,
        weeklySchedule: [
          { teacherId: 'teacher-1', dayOfWeek: 1, startTime: '10:00', endTime: '10:40' },
          { teacherId: 'teacher-1', dayOfWeek: 2, startTime: '10:00', endTime: '10:40' },
        ],
        scheduledClasses: [classInput('2099-01-01'), classInput('2099-01-02')],
      })
    )

    expect(result).toMatchObject({
      success: true,
      classesCreated: 0,
      schedule_pending_review: true,
    })
    expect(state.enrollment).toMatchObject({
      notes: 'manual scheduling context; schedule_pending_review:scheduling_failed',
    })
    expect(state.bookings).toEqual([])
    expect(state.schedules).toEqual([])
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it('creates a normal scheduled enrollment and notifies only after the transaction succeeds', async () => {
    const result = await createEnrollmentWithSchedule(createInput())

    expect(result).toMatchObject({ success: true, classesCreated: 1, schedule_pending_review: false })
    expect(state.bookings).toHaveLength(1)
    expect(mocks.notify).toHaveBeenCalledWith('enrollment-created')
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })

  it('reports only committed class inserts when a requested slot is occupied', async () => {
    state.bookings = [
      makeBooking({
        id: 'occupied-slot',
        studentId: 'student-2',
        enrollmentId: 'other-enrollment',
      }),
    ]
    installDatabase(state)

    const result = await createEnrollmentWithSchedule(createInput())

    expect(result).toMatchObject({ success: true, classesCreated: 0, schedule_pending_review: false })
    expect(state.bookings).toHaveLength(1)
  })

  it('preserves a concurrent staff note when appending the review marker', async () => {
    installDatabase(state, {
      failBookingCreateAt: 2,
      createdNotes: 'initial scheduling context',
      reviewNotesBeforeUpdate: 'staff note added concurrently',
    })

    const result = await createEnrollmentWithSchedule(
      createInput({ scheduledClasses: [classInput('2099-01-01'), classInput('2099-01-02')] })
    )

    expect(result).toMatchObject({ success: true, classesCreated: 0, schedule_pending_review: true })
    expect(state.enrollment).toMatchObject({
      notes: 'staff note added concurrently; schedule_pending_review:scheduling_failed',
    })
    expect(mocks.queryRaw).toHaveBeenCalled()
  })

  it('preserves existing schedules when replacement createMany fails', async () => {
    state.enrollment = makeEnrollment()
    state.schedules = [makeSchedule({ id: 'old-1' }), makeSchedule({ id: 'old-2', dayOfWeek: 2 })]
    const original = cloneState(state)
    installDatabase(state, { failScheduleCreateMany: true })

    const result = await updateEnrollmentSchedules(enrollmentId, [
      { teacherId: 'teacher-1', dayOfWeek: 3, startTime: '11:00', endTime: '11:40' },
    ])

    expect(result).toEqual({ success: false, error: 'Error al actualizar los horarios' })
    expect(state).toEqual(original)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('replaces schedules atomically on a successful update', async () => {
    state.enrollment = makeEnrollment()
    state.schedules = [makeSchedule({ id: 'old-1' })]

    const result = await updateEnrollmentSchedules(enrollmentId, [
      { teacherId: 'teacher-1', dayOfWeek: 4, startTime: '11:00', endTime: '11:40' },
    ])

    expect(result).toMatchObject({ success: true })
    expect(state.schedules).toMatchObject([
      { enrollmentId, teacherId: 'teacher-1', dayOfWeek: 4, startTime: '11:00', endTime: '11:40' },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/enrollments')
  })

  it('rolls back enrollment changes, cancellations, deletion, and reactivation together', async () => {
    state.enrollment = makeEnrollment({ classesTotal: 8, progress: 12 })
    state.schedules = [makeSchedule({ id: 'old-1' })]
    state.bookings = [
      makeBooking({ id: 'confirmed-old', day: '2099-01-01', timeSlot: '09:00-09:40' }),
      makeBooking({
        id: 'cancelled-target',
        day: '2099-01-02',
        timeSlot: '10:00-10:40',
        status: 'CANCELLED',
        cancelledAt: new Date('2098-01-01'),
        cancelledBy: 'ADMIN_RESCHEDULE',
      }),
    ]
    const original = cloneState(state)
    installDatabase(state, { failBookingUpdate: true })

    const result = await updateEnrollmentWithSchedule(enrollmentId, {
      status: 'PAUSED' as never,
      progress: 99,
      teacherId: 'teacher-1',
      scheduledClasses: [classInput('2099-01-02')],
      isRecurring: true,
      weeklySchedule: [{ teacherId: 'teacher-1', dayOfWeek: 5, startTime: '12:00', endTime: '12:40' }],
      userTimezone: 'UTC',
    })

    expect(result).toEqual({ success: false, error: 'Error al actualizar la inscripción con horarios' })
    expect(state).toEqual(original)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('keeps occupied slots skipped while committing a successful reschedule', async () => {
    state.enrollment = makeEnrollment()
    state.schedules = [makeSchedule({ id: 'old-1' })]
    state.bookings = [
      makeBooking({ id: 'cancelled-target', day: '2099-01-02', status: 'CANCELLED' }),
      makeBooking({
        id: 'occupied-other',
        studentId: 'student-2',
        enrollmentId: 'other-enrollment',
        day: '2099-01-03',
        timeSlot: '11:00-11:40',
      }),
    ]

    const result = await updateEnrollmentWithSchedule(enrollmentId, {
      teacherId: 'teacher-1',
      scheduledClasses: [classInput('2099-01-02'), classInput('2099-01-03', '11:00', '11:40')],
      isRecurring: true,
      weeklySchedule: [{ teacherId: 'teacher-1', dayOfWeek: 5, startTime: '12:00', endTime: '12:40' }],
      userTimezone: 'UTC',
    })

    expect(result).toMatchObject({ success: true, cancelledCount: 0, createdCount: 1 })
    expect(state.schedules).toHaveLength(1)
    expect(state.bookings.find((booking) => booking.id === 'cancelled-target')?.status).toBe('CONFIRMED')
    expect(state.bookings.find((booking) => booking.id === 'occupied-other')?.status).toBe('CONFIRMED')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/student/classes')
  })

  it('does not mutate when the enrollment validation fails', async () => {
    const result = await updateEnrollmentSchedules('missing-enrollment', [
      { teacherId: 'teacher-1', dayOfWeek: 1, startTime: '10:00', endTime: '10:40' },
    ])

    expect(result).toEqual({ success: false, error: 'Inscripción no encontrada' })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(state).toEqual({ enrollment: null, bookings: [], schedules: [] })
  })
})
