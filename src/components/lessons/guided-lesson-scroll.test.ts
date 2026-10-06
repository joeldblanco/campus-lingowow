import { beforeEach, describe, expect, it, vi } from 'vitest'
import { focusGuidedLessonHeading, resetGuidedLessonViewport } from './guided-lesson-scroll'

describe('guided lesson viewport helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the lesson to the top without requiring browser scroll APIs', () => {
    const viewer = document.createElement('section')
    const scrollIntoView = vi.fn()
    Object.defineProperty(viewer, 'scrollIntoView', { value: scrollIntoView })

    resetGuidedLessonViewport(viewer)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('falls back safely when the host has no element scroll API', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      throw new Error('not implemented')
    })

    expect(() => resetGuidedLessonViewport(null)).not.toThrow()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('focuses the heading without throwing when FocusOptions are rejected', () => {
    const heading = document.createElement('h2')
    const focus = vi
      .spyOn(heading, 'focus')
      .mockImplementationOnce(() => {
        throw new Error('unsupported options')
      })
      .mockImplementationOnce(() => undefined)

    focusGuidedLessonHeading(heading)

    expect(focus).toHaveBeenNthCalledWith(1, { preventScroll: true })
    expect(focus).toHaveBeenNthCalledWith(2)
  })
})
