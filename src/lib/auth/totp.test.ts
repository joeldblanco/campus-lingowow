import { describe, it, expect } from 'vitest'
import { authenticator } from 'otplib'
import {
  generateTotpSecret,
  buildTotpAuthUri,
  verifyTotpToken,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from './totp'

describe('generateTotpSecret', () => {
  it('returns a non-empty base32 secret', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(secret.length).toBeGreaterThanOrEqual(16)
  })
})

describe('buildTotpAuthUri', () => {
  it('encodes the issuer and account into an otpauth URI', () => {
    const uri = buildTotpAuthUri('user@example.com', 'JBSWY3DPEHPK3PXP')
    expect(uri.startsWith('otpauth://totp/')).toBe(true)
    expect(uri).toContain('Lingowow')
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain(encodeURIComponent('user@example.com'))
  })
})

describe('verifyTotpToken', () => {
  it('accepts the current token for a secret', () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    expect(verifyTotpToken(token, secret)).toBe(true)
  })

  it('tolerates whitespace in the submitted token', () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    const spaced = `${token.slice(0, 3)} ${token.slice(3)}`
    expect(verifyTotpToken(spaced, secret)).toBe(true)
  })

  it('rejects malformed (non 6-digit) tokens without throwing', () => {
    const secret = generateTotpSecret()
    expect(verifyTotpToken('', secret)).toBe(false)
    expect(verifyTotpToken('abcdef', secret)).toBe(false)
    expect(verifyTotpToken('12345', secret)).toBe(false)
    expect(verifyTotpToken('1234567', secret)).toBe(false)
  })

  it('rejects a token generated from a different secret', () => {
    const secretA = generateTotpSecret()
    const secretB = generateTotpSecret()
    const tokenForB = authenticator.generate(secretB)
    // Astronomically unlikely to collide; guards the wrong-secret path.
    expect(verifyTotpToken(tokenForB, secretA)).toBe(false)
  })
})

describe('generateRecoveryCodes', () => {
  it('generates the requested number of unique, well-formatted codes', () => {
    const codes = generateRecoveryCodes(8)
    expect(codes).toHaveLength(8)
    codes.forEach((code) => expect(code).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/))
    expect(new Set(codes).size).toBe(8)
  })

  it('defaults to 10 codes', () => {
    expect(generateRecoveryCodes()).toHaveLength(10)
  })
})

describe('normalizeRecoveryCode', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeRecoveryCode('AB12C-DE34F')).toBe('ab12cde34f')
    expect(normalizeRecoveryCode('ab12c de34f')).toBe('ab12cde34f')
  })
})

describe('recovery code hashing + consumption', () => {
  it('matches a valid code regardless of formatting and removes it (single-use)', async () => {
    const codes = generateRecoveryCodes(3)
    const hashed = await hashRecoveryCodes(codes)

    // Submit the same code with different casing/spacing than stored.
    const submitted = codes[1].toUpperCase().replace('-', ' ')
    const result = await consumeRecoveryCode(submitted, hashed)

    expect(result.matched).toBe(true)
    expect(result.remaining).toHaveLength(2)

    // The consumed code can no longer be used.
    const reuse = await consumeRecoveryCode(codes[1], result.remaining)
    expect(reuse.matched).toBe(false)
    expect(reuse.remaining).toHaveLength(2)
  })

  it('does not match an unknown code and leaves the set intact', async () => {
    const hashed = await hashRecoveryCodes(generateRecoveryCodes(3))
    const result = await consumeRecoveryCode('00000-00000', hashed)
    expect(result.matched).toBe(false)
    expect(result.remaining).toHaveLength(3)
  })

  it('rejects an empty submission', async () => {
    const hashed = await hashRecoveryCodes(generateRecoveryCodes(2))
    const result = await consumeRecoveryCode('   ', hashed)
    expect(result.matched).toBe(false)
    expect(result.remaining).toHaveLength(2)
  })
})
