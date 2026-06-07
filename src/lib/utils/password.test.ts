import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { isBcryptHash } from './password'

describe('isBcryptHash', () => {
  it('recognizes real bcrypt hashes (any 2a/2b/2y variant)', async () => {
    const hash = await bcrypt.hash('LuzMaria123*', 10)
    expect(isBcryptHash(hash)).toBe(true)
    // Variantes de prefijo válidas conocidas.
    expect(isBcryptHash('$2y$10$' + 'a'.repeat(53))).toBe(true)
    expect(isBcryptHash('$2b$12$' + 'a'.repeat(53))).toBe(true)
  })

  it('treats plaintext passwords as not hashed', () => {
    expect(isBcryptHash('LuzMaria123*')).toBe(false)
    expect(isBcryptHash('admin')).toBe(false)
    // Longitud 60 pero sin formato bcrypt -> sigue siendo texto plano.
    expect(isBcryptHash('x'.repeat(60))).toBe(false)
  })

  it('handles empty / null / undefined safely', () => {
    expect(isBcryptHash('')).toBe(false)
    expect(isBcryptHash(null)).toBe(false)
    expect(isBcryptHash(undefined)).toBe(false)
  })

  it('a freshly hashed value is never re-flagged (idempotency guard)', async () => {
    const once = await bcrypt.hash('changeme!', 10)
    // El script solo re-hashea cuando isBcryptHash === false.
    expect(isBcryptHash(once)).toBe(true)
  })
})
