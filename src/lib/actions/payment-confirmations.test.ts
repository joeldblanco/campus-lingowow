import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    teacherPaymentConfirmation: {
      create: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    clientVersion: string
    meta?: Record<string, unknown>
    constructor(
      message: string,
      { code, clientVersion, meta }: { code: string; clientVersion: string; meta?: Record<string, unknown> }
    ) {
      super(message)
      this.code = code
      this.clientVersion = clientVersion
      this.meta = meta
    }
  }
  return {
    ConfirmationStatus: {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
    },
    Prisma: {
      PrismaClientKnownRequestError,
    },
  }
})

import { Prisma } from '@prisma/client'
import { createPaymentConfirmation } from './payment-confirmations'

const teacher = {
  name: 'Emma',
  lastName: 'Pérez',
  email: 'emma@lingowow.com',
}

const baseInput = {
  teacherId: 'teacher-emma',
  amount: 80,
  periodStart: new Date('2026-05-01T00:00:00.000Z'),
  periodEnd: new Date('2026-05-31T23:59:59.999Z'),
}

describe('createPaymentConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists the confirmation and returns the mapped payload on success', async () => {
    const createdAt = new Date('2026-05-30T02:00:00.000Z')
    vi.mocked(db.teacherPaymentConfirmation.create).mockResolvedValue({
      id: 'confirmation-1',
      teacherId: baseInput.teacherId,
      amount: baseInput.amount,
      periodStart: baseInput.periodStart,
      periodEnd: baseInput.periodEnd,
      confirmedAt: createdAt,
      hasProof: false,
      proofUrl: null,
      notes: null,
      status: 'PENDING',
      createdAt,
      updatedAt: createdAt,
      teacher,
    } as never)

    const result = await createPaymentConfirmation(baseInput)

    expect(result.success).toBe(true)
    expect(result.confirmation).toMatchObject({
      id: 'confirmation-1',
      teacherId: baseInput.teacherId,
      teacherName: 'Emma Pérez',
      amount: 80,
      status: 'PENDING',
    })
    expect(db.teacherPaymentConfirmation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teacherId: baseInput.teacherId,
          amount: 80,
          periodStart: baseInput.periodStart,
          periodEnd: baseInput.periodEnd,
          status: 'PENDING',
        }),
      })
    )
  })

  it('returns the friendly P2002 message when the unique constraint trips', async () => {
    vi.mocked(db.teacherPaymentConfirmation.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`teacherId`,`periodStart`,`periodEnd`)',
        { code: 'P2002', clientVersion: 'test', meta: { target: ['teacherId', 'periodStart', 'periodEnd'] } }
      )
    )

    const result = await createPaymentConfirmation(baseInput)

    expect(result).toEqual({
      success: false,
      error:
        'Ya confirmaste el pago de este período. Los administradores lo están revisando.',
    })
  })

  it('falls back to the generic error for unknown failures', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(db.teacherPaymentConfirmation.create).mockRejectedValue(
      new Error('database is on fire')
    )

    const result = await createPaymentConfirmation(baseInput)

    expect(result).toEqual({
      success: false,
      error: 'Error al crear la confirmación de pago',
    })
    consoleSpy.mockRestore()
  })
})
