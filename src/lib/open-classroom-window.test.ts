import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  closeClassroomWindow,
  openClassroomWindow,
  replaceClassroomWithGoogleMeet,
} from './open-classroom-window'

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

describe('classroom window navigation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the Lingowow access check in a browser tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(window)

    openClassroomWindow('/classroom?classId=booking-1')

    expect(open).toHaveBeenCalledWith('/classroom?classId=booking-1', '_blank')
  })

  it('replaces the access-check tab with the Google Meet URL', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(window)

    replaceClassroomWithGoogleMeet('https://meet.google.com/abc-defg-hij')

    expect(open).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij', '_self')
  })
})
