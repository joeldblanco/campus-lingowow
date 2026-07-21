import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/mail', () => ({
  sendAccountActivationEmail: vi.fn(),
}))

vi.mock('uuid', () => ({ v4: () => 'fixed-activation-token' }))

import { db } from '@/lib/db'
import { sendAccountActivationEmail } from '@/lib/mail'
import {
  GUEST_ACTIVATION_TOKEN_TTL_MS,
  createGuestActivationToken,
  sendGuestActivationEmail,
} from './guest-activation'

describe('guest activation token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(db.passwordResetToken.create).mockImplementation(
      // echo back the data so the caller sees the persisted token
      (async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'token-row',
        ...data,
      })) as never
    )
  })

  describe('createGuestActivationToken', () => {
    it('clears any prior token for the email before minting a new one (single live link)', async () => {
      await createGuestActivationToken('guest@example.com')

      expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'guest@example.com' },
      })

      const deleteOrder = vi.mocked(db.passwordResetToken.deleteMany).mock.invocationCallOrder[0]
      const createOrder = vi.mocked(db.passwordResetToken.create).mock.invocationCallOrder[0]
      expect(deleteOrder).toBeLessThan(createOrder)
    })

    it('creates a token row that expires ~24h in the future', async () => {
      const before = Date.now()
      const record = await createGuestActivationToken('guest@example.com')
      const after = Date.now()

      expect(record.token).toBe('fixed-activation-token')

      const createArg = vi.mocked(db.passwordResetToken.create).mock.calls[0][0] as {
        data: { email: string; token: string; expires: Date }
      }
      expect(createArg.data.email).toBe('guest@example.com')
      expect(createArg.data.token).toBe('fixed-activation-token')

      const expiresMs = createArg.data.expires.getTime()
      expect(expiresMs).toBeGreaterThanOrEqual(before + GUEST_ACTIVATION_TOKEN_TTL_MS)
      expect(expiresMs).toBeLessThanOrEqual(after + GUEST_ACTIVATION_TOKEN_TTL_MS)
    })

    it('honors a custom ttl', async () => {
      const before = Date.now()
      await createGuestActivationToken('guest@example.com', 1000)

      const createArg = vi.mocked(db.passwordResetToken.create).mock.calls[0][0] as {
        data: { expires: Date }
      }
      const expiresMs = createArg.data.expires.getTime()
      expect(expiresMs).toBeGreaterThanOrEqual(before + 1000)
      expect(expiresMs).toBeLessThan(before + GUEST_ACTIVATION_TOKEN_TTL_MS)
    })
  })

  describe('sendGuestActivationEmail', () => {
    it('emails the activation link with the freshly minted token and name', async () => {
      const res = await sendGuestActivationEmail({ email: 'guest@example.com', name: 'Ada' })

      expect(res).toEqual({ success: true })
      expect(sendAccountActivationEmail).toHaveBeenCalledWith(
        'guest@example.com',
        'fixed-activation-token',
        'Ada'
      )
    })

    it('passes undefined name through when none is available', async () => {
      await sendGuestActivationEmail({ email: 'guest@example.com' })

      expect(sendAccountActivationEmail).toHaveBeenCalledWith(
        'guest@example.com',
        'fixed-activation-token',
        undefined
      )
    })

    it('never throws and reports failure when token creation fails', async () => {
      vi.mocked(db.passwordResetToken.create).mockRejectedValueOnce(new Error('db down'))

      const res = await sendGuestActivationEmail({ email: 'guest@example.com' })

      expect(res.success).toBe(false)
      expect(res.error).toBe('db down')
      expect(sendAccountActivationEmail).not.toHaveBeenCalled()
    })
  })
})
