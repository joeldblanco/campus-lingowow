import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { closeClassroomWindow } from './open-classroom-window'

describe('closeClassroomWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('attempts to close the window and skips the fallback when the window closed', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {
      Object.defineProperty(window, 'closed', { value: true, configurable: true })
    })
    const fallback = vi.fn()

    closeClassroomWindow(fallback)
    vi.runAllTimers()

    expect(close).toHaveBeenCalled()
    expect(fallback).not.toHaveBeenCalled()
    Object.defineProperty(window, 'closed', { value: false, configurable: true })
  })

  it('falls back to navigation when the browser ignores window.close()', () => {
    vi.spyOn(window, 'close').mockImplementation(() => {
      // Non-script-opened window: browsers ignore close() and window.closed stays false
    })
    const fallback = vi.fn()

    closeClassroomWindow(fallback)
    vi.runAllTimers()

    expect(fallback).toHaveBeenCalledTimes(1)
  })
})
