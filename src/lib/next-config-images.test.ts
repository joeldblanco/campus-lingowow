import { describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ withSentryConfig: (config: unknown) => config }))

import nextConfig from '../../next.config'

describe('Next image remote patterns', () => {
  it('allows approved YouTube thumbnails without allowing a broader host', () => {
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      protocol: 'https',
      hostname: 'img.youtube.com',
      pathname: '/**',
    })
    expect(nextConfig.images?.remotePatterns).not.toContainEqual({
      protocol: 'https',
      hostname: 'youtube.com',
      pathname: '/**',
    })
  })
})
