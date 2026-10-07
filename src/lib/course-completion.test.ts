import { describe, expect, it } from 'vitest'
import {
  buildCourseCompletionUrl,
  findCourseLesson,
  getCompletedLessonMarker,
  isLessonCompletedFromProgress,
} from './course-completion'

describe('course completion helpers', () => {
  it('builds a course return URL containing only the completed lesson marker', () => {
    expect(buildCourseCompletionUrl('course-1', 'lesson-1')).toBe(
      '/my-courses/course-1?completedLesson=lesson-1'
    )
  })

  it('reads and validates the marker without accepting an empty value', () => {
    expect(getCompletedLessonMarker('?completedLesson=lesson-1')).toBe('lesson-1')
    expect(getCompletedLessonMarker('?completedLesson=')).toBeNull()
    expect(getCompletedLessonMarker('')).toBeNull()
  })

  it('finds a lesson only in the published module list supplied by the server', () => {
    const modules = [{ id: 'module-1', lessons: [{ id: 'lesson-1', contents: [] }] }]

    expect(findCourseLesson(modules, 'lesson-1')).toEqual({
      module: modules[0],
      lesson: modules[0].lessons[0],
    })
    expect(findCourseLesson(modules, 'missing')).toBeNull()
  })

  it('requires every server progress content id before declaring a lesson complete', () => {
    const lesson = { id: 'lesson-1', contents: [{ id: 'content-1' }, { id: 'content-2' }] }

    expect(isLessonCompletedFromProgress(lesson, ['content-1'])).toBe(false)
    expect(isLessonCompletedFromProgress(lesson, ['content-1', 'content-2'])).toBe(true)
    expect(isLessonCompletedFromProgress({ ...lesson, contents: [] }, [])).toBe(false)
  })
})
