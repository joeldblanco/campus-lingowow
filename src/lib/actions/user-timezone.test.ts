import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { db } from '@/lib/db'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { updateUserTimezone } from './user-timezone'

describe('updateUserTimezone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.update).mockResolvedValue({} as never)
  })

  it('updates the stored timezone for a normal (non-impersonated) session', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'student-1', isImpersonating: false },
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ timezone: 'America/Lima' } as never)

    const result = await updateUserTimezone('America/New_York')

    expect(result).toEqual({ success: true, updated: true })
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { timezone: 'America/New_York' },
    })
  })

  it('does NOT overwrite the impersonated user timezone with the admin browser timezone', async () => {
    // Admin (browser en America/New_York) suplantando a un estudiante de America/Lima.
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'student-1', isImpersonating: true, originalUserId: 'admin-1' },
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ timezone: 'America/Lima' } as never)

    const result = await updateUserTimezone('America/New_York')

    expect(result).toEqual({ success: false, updated: false })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('is a no-op when the timezone already matches', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'student-1', isImpersonating: false },
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ timezone: 'America/Lima' } as never)

    const result = await updateUserTimezone('America/Lima')

    expect(result).toEqual({ success: true, updated: false })
    expect(db.user.update).not.toHaveBeenCalled()
  })
})
