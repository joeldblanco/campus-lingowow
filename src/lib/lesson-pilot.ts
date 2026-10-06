// Audited published lesson in Lingowow Esencial. Titles are not stable identifiers.
export function isGuidedLessonPilot(lessonId: string, courseId: string): boolean {
  return lessonId === 'cmk4otvgp0001w1p4ijdkv6i2' && courseId === 'cmjnr0g5x0001jp04fsw2fejs'
}

export function guidedLessonStorageKey(userId: string, courseId: string, lessonId: string): string {
  return `lingowow:guided-lesson:v1:${userId}:${courseId}:${lessonId}`
}
