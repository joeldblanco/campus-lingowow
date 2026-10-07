export interface CourseCompletionLesson {
  id: string
  contents: Array<{ id: string }>
}

export interface CourseCompletionModule {
  id: string
  lessons: CourseCompletionLesson[]
}

export function buildCourseCompletionUrl(courseId: string, lessonId: string) {
  return `/my-courses/${encodeURIComponent(courseId)}?completedLesson=${encodeURIComponent(lessonId)}`
}

export function getCompletedLessonMarker(search: string) {
  const marker = new URLSearchParams(search).get('completedLesson')
  return marker?.trim() ? marker : null
}

export function findCourseLesson(
  modules: readonly CourseCompletionModule[],
  lessonId: string
) {
  for (const courseModule of modules) {
    const lesson = courseModule.lessons.find((candidate) => candidate.id === lessonId)
    if (lesson) return { module: courseModule, lesson }
  }

  return null
}

export function isLessonCompletedFromProgress(
  lesson: CourseCompletionLesson,
  completedContentIds: Iterable<string>
) {
  const completed = new Set(completedContentIds)
  const contentIds = lesson.contents.map((content) => content.id)

  return contentIds.length > 0 && contentIds.every((contentId) => completed.has(contentId))
}

export function clearCompletedLessonMarker(lessonId: string) {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  if (url.searchParams.get('completedLesson') !== lessonId) return false

  url.searchParams.delete('completedLesson')
  const search = url.searchParams.toString()
  const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
  window.history.replaceState(window.history.state, '', nextUrl)
  return true
}
