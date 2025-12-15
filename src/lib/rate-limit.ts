const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now - record.lastReset > config.windowMs) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  if (record.count >= config.maxRequests) {
    const resetIn = config.windowMs - (now - record.lastReset)
    return {
      success: false,
      remaining: 0,
      resetIn,
    }
  }

  record.count++
  return {
    success: true,
    remaining: config.maxRequests - record.count,
    resetIn: config.windowMs - (now - record.lastReset),
  }
}

export function getRateLimitHeaders(result: { remaining: number; resetIn: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  }
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.lastReset > 5 * 60 * 1000) {
        rateLimitMap.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}
