import { describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ withSentryConfig: (config: unknown) => config }))

import nextConfig from '../../next.config'

describe('shared deployment server memory budget', () => {
  it('runs page build workers sequentially instead of scaling to the host CPU count', () => {
    expect(nextConfig.experimental?.cpus).toBe(1)
    expect(nextConfig.experimental?.webpackMemoryOptimizations).toBe(true)
  })
})
