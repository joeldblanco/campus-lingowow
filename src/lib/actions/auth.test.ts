import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

// NextAuth and the heavy auth dependencies are neutralized — this suite only
// exercises `newPassword`, the server action that consumes a single-use
// PasswordResetToken (the same token guest activation mints) and sets the
// account password.
vi.mock('@/auth', () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }))
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }))

vi.mock('@/lib/db', () => ({
  db: {
    user: { update: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/actions/user', () => ({ getUserByEmail: vi.fn() }))
vi.mock('@/lib/tokens', () => ({
  generatePasswordResetToken: vi.fn(),
  generateVerificationToken: vi.fn(),
}))
vi.mock('@/lib/mail', () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}))
vi.mock('@/lib/actions/newsletter', () => ({ subscribeToNewsletter: vi.fn() }))
vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn(), createAuditLog: vi.fn() }))

import { db } from '@/lib/db'
import { getUserByEmail } from '@/lib/actions/user'
import { newPassword } from './auth'

const VALID_PASSWORD = 'Abcd1234!' // satisfies NewPasswordSchema complexity

describe('newPassword (activation / reset token consumption)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets a hashed password and consumes the token (single-use)', async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue({
      id: 'token-1',
      email: 'guest@example.com',
      token: 'activation-token',
      expires: new Date(Date.now() + 60_000),
    } as never)
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'guest@example.com',
    } as never)
    vi.mocked(db.user.update).mockResolvedValue({} as never)
    vi.mocked(db.passwordResetToken.delete).mockResolvedValue({} as never)

    const res = await newPassword({ password: VALID_PASSWORD }, 'activation-token')

    expect(res).toEqual({ success: 'Contraseña actualizada correctamente' })

    // password stored as a bcrypt hash, not plaintext
    const updateArg = vi.mocked(db.user.update).mock.calls[0][0] as {
      where: { id: string }
      data: { password: string }
    }
    expect(updateArg.where).toEqual({ id: 'user-1' })
    expect(updateArg.data.password).not.toBe(VALID_PASSWORD)
    expect(await bcrypt.compare(VALID_PASSWORD, updateArg.data.password)).toBe(true)

    // token deleted → cannot be reused
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
  })

  it('rejects an expired token without touching the password', async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue({
      id: 'token-1',
      email: 'guest@example.com',
      token: 'activation-token',
      expires: new Date(Date.now() - 60_000),
    } as never)
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'guest@example.com',
    } as never)

    const res = await newPassword({ password: VALID_PASSWORD }, 'activation-token')

    expect(res).toEqual({ error: 'El token ha expirado' })
    expect(db.user.update).not.toHaveBeenCalled()
    expect(db.passwordResetToken.delete).not.toHaveBeenCalled()
  })

  it('rejects an unknown token', async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(null as never)

    const res = await newPassword({ password: VALID_PASSWORD }, 'does-not-exist')

    expect(res).toEqual({ error: 'Token no encontrado' })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('rejects a missing token argument', async () => {
    const res = await newPassword({ password: VALID_PASSWORD }, null)

    expect(res).toEqual({ error: 'Token no encontrado' })
    expect(db.passwordResetToken.findUnique).not.toHaveBeenCalled()
  })
})
