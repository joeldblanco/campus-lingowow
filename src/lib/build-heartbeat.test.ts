import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const { runBuild } = createRequire(import.meta.url)('../../scripts/build-with-heartbeat.cjs') as {
  runBuild: (args: string[], intervalMs: number) => Promise<number>
}

describe('build heartbeat', () => {
  it('emits progress while a silent child runs and preserves its failure', async () => {
    const progress = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      expect(await runBuild(['-e', 'setTimeout(() => process.exit(7), 100)'], 10)).toBe(7)
      expect(progress).toHaveBeenCalledWith('Build still running')
      const completedCalls = progress.mock.calls.length
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(progress.mock.calls.length).toBe(completedCalls)
    } finally {
      progress.mockRestore()
    }
  })

  it('returns success when the child completes successfully', async () => {
    expect(await runBuild(['-e', 'process.exit(0)'], 20000)).toBe(0)
  })
})
