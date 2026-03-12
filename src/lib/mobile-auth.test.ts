import { describe, it, expect } from 'vitest'
import { extractBearerToken } from './mobile-auth'

describe('extractBearerToken', () => {
  it('should extract token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer my-secret-token')).toBe('my-secret-token')
  })

  it('should return null for null input', () => {
    expect(extractBearerToken(null)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(extractBearerToken('')).toBeNull()
  })

  it('should return null for non-Bearer auth type', () => {
    expect(extractBearerToken('Basic dXNlcm5hbWU6cGFzc3dvcmQ=')).toBeNull()
  })

  it('should return null for incorrect casing', () => {
    expect(extractBearerToken('bearer my-secret-token')).toBeNull()
  })

  it('should return null for missing space', () => {
    expect(extractBearerToken('Bearermy-secret-token')).toBeNull()
  })

  it('should return empty string if only prefix is provided', () => {
    expect(extractBearerToken('Bearer ')).toBe('')
  })
})
