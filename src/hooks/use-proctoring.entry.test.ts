import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProctoring } from './use-proctoring'
import { recordProctorEvent } from '@/lib/actions/proctoring'

vi.mock('@/lib/actions/proctoring', () => ({ recordProctorEvent: vi.fn().mockResolvedValue({ success: true }), getViolationCount: vi.fn().mockResolvedValue({ success: true, count: 0 }) }))
beforeEach(() => vi.clearAllMocks())

describe('proctoring after accepted fullscreen entry', () => {
  it('recognizes existing fullscreen without requesting it again or recording a false exit', async () => {
    const request = vi.fn()
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement })
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request })
    const { result } = renderHook(() => useProctoring({ attemptId: 'attempt', enabled: true }))
    await waitFor(() => expect(result.current.isFullscreen).toBe(true))
    expect(request).not.toHaveBeenCalled()
    expect(recordProctorEvent).toHaveBeenCalledWith('attempt', 'exam_start', expect.any(Object))
    expect(recordProctorEvent).not.toHaveBeenCalledWith('attempt', 'fullscreen_exit', expect.any(Object))
  })
})
