const CURRICULUM_PILOT_LESSONS = new Set([
  'cmk0vhjh80001jm04epgai2ay',
  'cmkpx0d310001gy04zr4lq99y',
  'cmnmm9tei0028w1qkri0q23eb',
])

// Audited published lesson in Lingowow Esencial. Titles are not stable identifiers.
export function isGuidedLessonPilot(lessonId: string, courseId: string, contents: readonly { data: unknown }[] = []): boolean {
  if (courseId !== 'cmjnr0g5x0001jp04fsw2fejs') return false
  if (lessonId === 'cmk4otvgp0001w1p4ijdkv6i2') return true
  // The transactional importer marks reviewed native rows. Unconverted embeds
  // and lessons in other courses must retain their existing presentation.
  return contents.some(({ data }) => {
    if (!data || typeof data !== 'object' || !('data' in data)) return false
    const metadata = data.data
    return Boolean(metadata && typeof metadata === 'object' &&
      'learningRevision' in metadata && (metadata.learningRevision === 'course-guided-v1' ||
        metadata.learningRevision === 'curriculum-pilot-v1' && CURRICULUM_PILOT_LESSONS.has(lessonId)))
  })
}

export function guidedLessonStorageKey(userId: string, courseId: string, lessonId: string): string {
  return `lingowow:guided-lesson:v1:${userId}:${courseId}:${lessonId}`
}
