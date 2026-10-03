import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExternalPaymentEnrollmentSchema } from '@/schemas/external-payment'

const mocks = vi.hoisted(() => {
  const tx = {
    externalPayment: { findUnique: vi.fn(), create: vi.fn() },
    enrollment: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
    academicPeriod: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  }
  return { tx, auth: vi.fn(), transaction: vi.fn(), revalidate: vi.fn() }
})
vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: { $transaction: mocks.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
import {
  getExternalPaymentEnrollmentOptions,
  registerExternalPaymentEnrollment,
} from './external-payments'

const input = {
  studentId: 'student-test',
  courseId: 'course-test',
  academicPeriodId: 'period-test',
  provider: 'culqi',
  reference: 'chr_test_reference',
  amount: '240.01',
  currency: 'USD',
  paidAt: '2020-01-01T18:00:00Z',
  classesTotal: 12,
  description: 'Test package',
}

describe('external payment enrollment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-test', roles: ['ADMIN'] } })
    mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
    mocks.tx.externalPayment.findUnique.mockResolvedValue(null)
    mocks.tx.enrollment.findUnique.mockResolvedValue(null)
    mocks.tx.user.findUnique.mockResolvedValue({ roles: ['STUDENT'], status: 'ACTIVE' })
    mocks.tx.course.findUnique.mockResolvedValue({ isPublished: true })
    mocks.tx.academicPeriod.findUnique.mockResolvedValue({
      startDate: new Date('2090-01-01'),
      endDate: new Date('2090-02-01'),
    })
    mocks.tx.enrollment.create.mockResolvedValue({ id: 'enrollment-test' })
    mocks.tx.externalPayment.create.mockResolvedValue({ id: 'payment-test' })
  })

  it.each([
    null,
    { user: { id: 'student', roles: ['STUDENT'] } },
    { user: { id: 'teacher', roles: ['TEACHER'] } },
    { user: { id: 'admin', roles: ['ADMIN'], isImpersonating: true } },
  ])('rejects unauthorized session %j before DB access', async (session) => {
    mocks.auth.mockResolvedValue(session)
    expect((await registerExternalPaymentEnrollment(input)).success).toBe(false)
    await expect(getExternalPaymentEnrollmentOptions()).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('stores cents, real provider, date, admin and manual pending enrollment with mandatory transactional audit', async () => {
    expect(await registerExternalPaymentEnrollment(input)).toMatchObject({
      success: true,
      data: { alreadyRecorded: false },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.tx.externalPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'culqi',
        reference: input.reference,
        amountMinor: 24001,
        currency: 'USD',
        paidAt: new Date(input.paidAt),
        recordedBy: 'admin-test',
        enrollmentId: 'enrollment-test',
      }),
    })
    expect(mocks.tx.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PENDING',
        classesTotal: 12,
        enrollmentType: 'MANUAL',
        enrolledBy: 'admin-test',
      }),
    })
    expect(mocks.tx.auditLog.create).toHaveBeenCalledTimes(2)
  })

  it('creates ACTIVE status during the period', async () => {
    mocks.tx.academicPeriod.findUnique.mockResolvedValue({
      startDate: new Date('2020-01-01'),
      endDate: new Date('2090-01-01'),
    })
    await registerExternalPaymentEnrollment(input)
    expect(mocks.tx.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'ACTIVE' }),
    })
  })

  it.each([
    { amount: '0' },
    { amount: '-1' },
    { amount: '1.234' },
    { amount: '1e2' },
    { amount: '1,20' },
    { amount: 240 },
    { currency: 'EUR' },
    { paidAt: '2099-01-01T00:00:00Z' },
    { paidAt: 'invalid' },
    { reference: '' },
    { provider: 'paypal' },
    { classesTotal: 0 },
    { classesTotal: 1.5 },
    { studentId: '' },
    { description: '' },
  ])('rejects invalid data %j before transaction', async (invalid) => {
    expect((await registerExternalPaymentEnrollment({ ...input, ...invalid })).success).toBe(false)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each(['0.01', '240', '240.1', '240.01'])('converts decimal %s exactly', (amount) => {
    const parsed = ExternalPaymentEnrollmentSchema.parse({ ...input, amount })
    expect(parsed.amount).toBe({ '0.01': 1, '240': 24000, '240.1': 24010, '240.01': 24001 }[amount])
  })

  it('returns original enrollment on exact retry without any new writes', async () => {
    mocks.tx.externalPayment.findUnique.mockResolvedValue({
      id: 'payment-test',
      amountMinor: 24001,
      currency: 'USD',
      paidAt: new Date(input.paidAt),
      description: input.description,
      enrollment: { ...input, id: 'enrollment-test' },
    })
    expect(
      await registerExternalPaymentEnrollment({ ...input, reference: ` ${input.reference} ` })
    ).toMatchObject({
      success: true,
      data: { enrollmentId: 'enrollment-test', alreadyRecorded: true },
    })
    expect(mocks.tx.enrollment.create).not.toHaveBeenCalled()
    expect(mocks.tx.externalPayment.create).not.toHaveBeenCalled()
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled()
  })

  it.each([
    { amount: '240.02' },
    { currency: 'PEN' },
    { studentId: 'another' },
    { courseId: 'another' },
    { academicPeriodId: 'another' },
    { classesTotal: 8 },
    { description: 'Another package' },
    { paidAt: '2020-02-01T18:00:00Z' },
  ])('rejects reference reuse with changed data %j', async (change) => {
    mocks.tx.externalPayment.findUnique.mockResolvedValue({
      amountMinor: 24001,
      currency: 'USD',
      paidAt: new Date(input.paidAt),
      description: input.description,
      enrollment: { ...input, id: 'enrollment-test' },
    })
    expect((await registerExternalPaymentEnrollment({ ...input, ...change })).success).toBe(false)
    expect(mocks.tx.enrollment.create).not.toHaveBeenCalled()
  })

  it.each(['student', 'course', 'period', 'enrollment'])(
    'rejects invalid %s before writes',
    async (kind) => {
      if (kind === 'student') mocks.tx.user.findUnique.mockResolvedValue(null)
      if (kind === 'course') mocks.tx.course.findUnique.mockResolvedValue({ isPublished: false })
      if (kind === 'period')
        mocks.tx.academicPeriod.findUnique.mockResolvedValue({ endDate: new Date('2020-01-01') })
      if (kind === 'enrollment') mocks.tx.enrollment.findUnique.mockResolvedValue({ id: 'exists' })
      expect((await registerExternalPaymentEnrollment(input)).success).toBe(false)
      expect(mocks.tx.enrollment.create).not.toHaveBeenCalled()
    }
  )

  it('lets audit failure abort the transaction and reports failure', async () => {
    mocks.tx.auditLog.create.mockRejectedValue(new Error('audit unavailable'))
    expect((await registerExternalPaymentEnrollment(input)).success).toBe(false)
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  it('handles a concurrent duplicate constrained by the database', async () => {
    mocks.transaction.mockRejectedValue({ code: 'P2002' })
    expect(await registerExternalPaymentEnrollment(input)).toMatchObject({
      success: false,
      error: expect.stringContaining('Reintenta'),
    })
  })

  it('does not expose internal errors or report failure after a successful commit', async () => {
    mocks.revalidate.mockImplementation(() => {
      throw new Error('cache')
    })
    expect((await registerExternalPaymentEnrollment(input)).success).toBe(true)
    mocks.transaction.mockRejectedValue(new Error('secret connection string'))
    expect(await registerExternalPaymentEnrollment(input)).toMatchObject({
      success: false,
      error: expect.not.stringContaining('secret'),
    })
  })
})
