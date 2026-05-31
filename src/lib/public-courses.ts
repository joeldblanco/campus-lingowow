/**
 * Helpers for the public /courses page (card #139). The page must reflect the
 * real, published courses we actually offer instead of a hardcoded list with
 * invented student counts and ratings.
 */

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  ja: 'Japonés',
  it: 'Italiano',
  pt: 'Portugués',
}

export function getLanguageLabel(code: string | null | undefined): string {
  if (!code) return ''
  return LANGUAGE_LABELS[code] ?? code
}

export interface RawPublicCourse {
  id: string
  title: string
  description: string | null
  language: string
  level: string | null
}

export interface PublicCourseCard {
  id: string
  title: string
  description: string
  languageLabel: string
  level: string
}

export function toPublicCourseCards(courses: RawPublicCourse[]): PublicCourseCard[] {
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description ?? '',
    languageLabel: getLanguageLabel(course.language),
    level: course.level ?? '',
  }))
}
