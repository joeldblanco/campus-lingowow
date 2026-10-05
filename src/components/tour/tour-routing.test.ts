import { describe, expect, it } from 'vitest'
import { canAutoStartTour } from './tour-routing'

describe('canAutoStartTour', () => {
  it('starts the student onboarding only where all student targets are mounted', () => {
    expect(canAutoStartTour('student', '/dashboard')).toBe(true)
    expect(canAutoStartTour('student', '/library')).toBe(false)
    expect(canAutoStartTour('student', '/my-courses/course-1')).toBe(false)
  })

  it('preserves the existing routes for the other role tours', () => {
    expect(canAutoStartTour('teacher', '/dashboard')).toBe(true)
    expect(canAutoStartTour('guest', '/')).toBe(true)
  })
})
