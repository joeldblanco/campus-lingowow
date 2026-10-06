import { describe, expect, it } from 'vitest'
import { isGuidedLessonPilot, guidedLessonStorageKey } from './lesson-pilot'

describe('guided lesson pilot eligibility', () => {
  it('opts in only the audited lesson and course, never an editable title', () => {
    expect(isGuidedLessonPilot('cmk4otvgp0001w1p4ijdkv6i2', 'cmjnr0g5x0001jp04fsw2fejs')).toBe(true)
    expect(isGuidedLessonPilot('another-lesson', 'cmjnr0g5x0001jp04fsw2fejs')).toBe(false)
    expect(isGuidedLessonPilot('cmk4otvgp0001w1p4ijdkv6i2', 'another-course')).toBe(false)
  })

  it('isolates resume state by student, course and lesson', () => {
    const key = guidedLessonStorageKey('student-a', 'course', 'lesson')
    expect(key).not.toBe(guidedLessonStorageKey('student-b', 'course', 'lesson'))
    expect(key).not.toBe(guidedLessonStorageKey('student-a', 'other-course', 'lesson'))
    expect(key).not.toBe(guidedLessonStorageKey('student-a', 'course', 'other-lesson'))
    expect(key).toContain('v1')
  })
})
