import { describe, it, expect } from 'vitest'
import { authenticator } from 'otplib'
import { evaluateTwoFactor } from './two-factor-gate'
import { generateTotpSecret, generateRecoveryCodes, hashRecoveryCodes } from './totp'

describe('evaluateTwoFactor', () => {
  it('is not required when 2FA is disabled', async () => {
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
      ''
    )
    expect(res.status).toBe('not_required')
  })

  it('is not required when enabled but the secret is missing', async () => {
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: true, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
      '123456'
    )
    expect(res.status).toBe('not_required')
  })

  it('reports missing_code when 2FA is on but no code is supplied', async () => {
    const secret = generateTotpSecret()
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: true, twoFactorSecret: secret, twoFactorRecoveryCodes: [] },
      '   '
    )
    expect(res.status).toBe('missing_code')
  })

  it('accepts a valid TOTP token', async () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: true, twoFactorSecret: secret, twoFactorRecoveryCodes: [] },
      token
    )
    expect(res.status).toBe('ok_totp')
  })

  it('accepts a recovery code and returns the remaining codes', async () => {
    const secret = generateTotpSecret()
    const codes = generateRecoveryCodes(3)
    const hashed = await hashRecoveryCodes(codes)
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: true, twoFactorSecret: secret, twoFactorRecoveryCodes: hashed },
      codes[0]
    )
    expect(res.status).toBe('ok_recovery')
    if (res.status === 'ok_recovery') {
      expect(res.remainingRecoveryCodes).toHaveLength(2)
    }
  })

  it('rejects an invalid code', async () => {
    const secret = generateTotpSecret()
    const hashed = await hashRecoveryCodes(generateRecoveryCodes(2))
    const res = await evaluateTwoFactor(
      { twoFactorEnabled: true, twoFactorSecret: secret, twoFactorRecoveryCodes: hashed },
      '000000'
    )
    expect(res.status).toBe('invalid')
  })
})
