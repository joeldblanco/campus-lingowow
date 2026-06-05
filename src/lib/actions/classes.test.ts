import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/db', () => ({
  db: {
    classBooking: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/class-booking-auto-completion', () => ({
  syncAutoCompletedClassBookings: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { toggleClassPayable } from './classes'

describe('toggleClassPayable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.classBooking.update).mockResolvedValue({} as never)
  })

  it('updates the booking payable flag and returns a success message', async () => {
    const result = await toggleClassPayable('booking-1', true)

    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { isPayable: true },
    })
    expect(result).toEqual({
      success: true,
      message: 'Clase marcada como válida para pago',
    })
  })

  it('returns the unmarked message when toggling payable off', async () => {
    const result = await toggleClassPayable('booking-1', false)

    expect(db.classBooking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { isPayable: false },
    })
    expect(result).toEqual({
      success: true,
      message: 'Clase desmarcada como válida para pago',
    })
  })

  // Regression: the inline classes table relies on optimistic client updates and
  // keeps its filters in the URL via history.replaceState. Calling revalidatePath
  // here forced a refresh of /admin/classes that wiped those filters, unlike the
  // "mark completed" flow. toggleClassPayable must not revalidate any path.
  it('does not call revalidatePath so the classes table filters are preserved', async () => {
    await toggleClassPayable('booking-1', true)

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns an error result when the update fails', async () => {
    vi.mocked(db.classBooking.update).mockRejectedValueOnce(new Error('db down'))

    const result = await toggleClassPayable('booking-1', true)

    expect(result).toEqual({
      success: false,
      error: 'Error al actualizar el estado de pago de la clase',
    })
  })
})
