import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticator } from 'otplib'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(async () => 'data:image/png;base64,FAKEQR') },
}))

import { auth } from '@/auth'
import { db } from '@/lib/db'
import {
  getTwoFactorStatus,
  startTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
} from './two-factor'
import { generateTotpSecret } from '@/lib/auth/totp'

const USER_ID = 'user-1'

describe('two-factor actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTwoFactorStatus', () => {
    it('rejects an unauthenticated caller', async () => {
      vi.mocked(auth).mockResolvedValue(null as never)
      const res = await getTwoFactorStatus()
      expect(res.success).toBe(false)
    })

    it('reports enabled state and remaining recovery codes', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      vi.mocked(db.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: ['a', 'b', 'c'],
      } as never)
      const res = await getTwoFactorStatus()
      expect(res.success).toBe(true)
      expect(res.data).toEqual({ enabled: true, remainingRecoveryCodes: 3 })
    })
  })

  describe('startTwoFactorSetup', () => {
    it('rejects an unauthenticated caller', async () => {
      vi.mocked(auth).mockResolvedValue(null as never)
      const res = await startTwoFactorSetup()
      expect(res.success).toBe(false)
    })

    it('returns a secret, otpauth URI and QR data URL', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: USER_ID, email: 'u@example.com' },
      } as never)
      const res = await startTwoFactorSetup()
      expect(res.success).toBe(true)
      expect(res.data?.secret).toMatch(/^[A-Z2-7]+$/)
      expect(res.data?.otpauthUri).toContain('otpauth://totp/')
      expect(res.data?.qrCodeDataUrl).toBe('data:image/png;base64,FAKEQR')
    })
  })

  describe('enableTwoFactor', () => {
    it('rejects an invalid token without persisting anything', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      const secret = generateTotpSecret()
      const res = await enableTwoFactor(secret, '000000')
      // '000000' is overwhelmingly unlikely to be the live token.
      expect(res.success).toBe(false)
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('enables 2FA and returns 10 one-time recovery codes for a valid token', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      const secret = generateTotpSecret()
      const token = authenticator.generate(secret)

      const res = await enableTwoFactor(secret, token)

      expect(res.success).toBe(true)
      expect(res.data?.recoveryCodes).toHaveLength(10)
      expect(db.user.update).toHaveBeenCalledTimes(1)
      const updateArg = vi.mocked(db.user.update).mock.calls[0][0]
      expect(updateArg.where).toEqual({ id: USER_ID })
      expect(updateArg.data.twoFactorEnabled).toBe(true)
      expect(updateArg.data.twoFactorSecret).toBe(secret)
      // Stored codes are hashed (not the plaintext shown to the user).
      expect(updateArg.data.twoFactorRecoveryCodes).toHaveLength(10)
      expect(updateArg.data.twoFactorRecoveryCodes).not.toContain(res.data?.recoveryCodes[0])
    })
  })

  describe('disableTwoFactor', () => {
    it('rejects when 2FA is not enabled', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      vi.mocked(db.user.findUnique).mockResolvedValue({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      } as never)
      const res = await disableTwoFactor('123456')
      expect(res.success).toBe(false)
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('rejects an invalid token', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      const secret = generateTotpSecret()
      vi.mocked(db.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      } as never)
      const res = await disableTwoFactor('000000')
      expect(res.success).toBe(false)
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('disables and clears 2FA fields for a valid token', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
      const secret = generateTotpSecret()
      vi.mocked(db.user.findUnique).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      } as never)
      const token = authenticator.generate(secret)

      const res = await disableTwoFactor(token)

      expect(res.success).toBe(true)
      const updateArg = vi.mocked(db.user.update).mock.calls[0][0]
      expect(updateArg.data).toEqual({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
      })
    })
  })
})
