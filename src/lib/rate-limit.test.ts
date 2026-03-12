import { describe, it, expect } from 'vitest'
import { getRateLimitHeaders } from './rate-limit'

describe('getRateLimitHeaders', () => {
  it('should format normal values correctly', () => {
    const result = { remaining: 5, resetIn: 30000 } // 30 seconds
    const headers = getRateLimitHeaders(result)

    expect(headers).toEqual({
      'X-RateLimit-Remaining': '5',
      'X-RateLimit-Reset': '30',
    })
  })

  it('should round up resetIn correctly', () => {
    const result = { remaining: 2, resetIn: 30500 } // 30.5 seconds -> should round to 31
    const headers = getRateLimitHeaders(result)

    expect(headers).toEqual({
      'X-RateLimit-Remaining': '2',
      'X-RateLimit-Reset': '31',
    })
  })

  it('should handle zero values correctly', () => {
    const result = { remaining: 0, resetIn: 0 }
    const headers = getRateLimitHeaders(result)

    expect(headers).toEqual({
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '0',
    })
  })

  it('should handle small fractional seconds by rounding up to 1', () => {
    const result = { remaining: 9, resetIn: 100 } // 0.1 seconds -> should round to 1
    const headers = getRateLimitHeaders(result)

    expect(headers).toEqual({
      'X-RateLimit-Remaining': '9',
      'X-RateLimit-Reset': '1',
    })
  })
})
