import { describe, expect, it } from 'vitest'
import { isGuidedLessonPilot, guidedLessonStorageKey } from './lesson-pilot'

describe('guided lesson pilot eligibility', () => {
  it('opts the six new A1 pilot lessons into guided presentation only with reviewed metadata in their own course', () => {
    const contents = [{ data: { type: 'text', data: { learningRevision: 'course-guided-v1' } } }]
    for (const lesson of ['a1-general-start', 'a1-general-u1', 'a1-general-u2', 'a1-general-u3', 'a1-general-u4', 'a1-general-mission']) {
      expect(isGuidedLessonPilot(lesson, 'a1-general-module1-pilot', contents)).toBe(true)
      expect(isGuidedLessonPilot(lesson, 'another-course', contents)).toBe(false)
      expect(isGuidedLessonPilot(lesson, 'a1-general-module1-pilot')).toBe(false)
    }
    expect(isGuidedLessonPilot('unreviewed', 'a1-general-module1-pilot', contents)).toBe(false)
    expect(isGuidedLessonPilot('a1-general-u1', 'a1-general-module1-pilot', [{ data: { type: 'embed' } }])).toBe(false)
  })
  it('recognizes only the three reviewed curriculum pilots in their own course', () => {
    const contents = [{ data: { type: 'text', data: { learningRevision: 'curriculum-pilot-v1' } } }]
    for (const lessonId of ['cmk0vhjh80001jm04epgai2ay', 'cmkpx0d310001gy04zr4lq99y', 'cmnmm9tei0028w1qkri0q23eb']) {
      expect(isGuidedLessonPilot(lessonId, 'cmjnr0g5x0001jp04fsw2fejs', contents)).toBe(true)
      expect(isGuidedLessonPilot(lessonId, 'other-course', contents)).toBe(false)
      expect(isGuidedLessonPilot(lessonId, 'cmjnr0g5x0001jp04fsw2fejs')).toBe(false)
    }
    expect(isGuidedLessonPilot('unreviewed-lesson', 'cmjnr0g5x0001jp04fsw2fejs', contents)).toBe(false)
  })
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

  it('enables reviewed native course content while preserving embeds and other courses', () => {
    const contents = [{ data: { type: 'text', data: { learningRevision: 'course-guided-v1' } } }]
    expect(isGuidedLessonPilot('unit-two', 'cmjnr0g5x0001jp04fsw2fejs', contents)).toBe(true)
    expect(isGuidedLessonPilot('unit-two', 'other-course', contents)).toBe(false)
    expect(isGuidedLessonPilot('unit-two', 'cmjnr0g5x0001jp04fsw2fejs', [{ data: { type: 'embed' } }])).toBe(false)
    expect(isGuidedLessonPilot('unit-two', 'cmjnr0g5x0001jp04fsw2fejs', [{ data: null }])).toBe(false)
  })
})
