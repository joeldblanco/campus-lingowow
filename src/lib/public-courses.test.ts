import { describe, it, expect } from 'vitest'
import { getLanguageLabel, toPublicCourseCards } from './public-courses'

describe('getLanguageLabel', () => {
  it('maps known language codes to Spanish labels', () => {
    expect(getLanguageLabel('en')).toBe('Inglés')
    expect(getLanguageLabel('es')).toBe('Español')
  })

  it('falls back to the raw code for unknown languages', () => {
    expect(getLanguageLabel('xx')).toBe('xx')
  })

  it('returns empty string for null/undefined', () => {
    expect(getLanguageLabel(null)).toBe('')
    expect(getLanguageLabel(undefined)).toBe('')
  })
})

describe('toPublicCourseCards', () => {
  it('maps real courses to display cards with language labels', () => {
    const cards = toPublicCourseCards([
      { id: 'c1', title: 'Inglés A1', description: 'Curso básico', language: 'en', level: 'A1' },
    ])
    expect(cards).toEqual([
      {
        id: 'c1',
        title: 'Inglés A1',
        description: 'Curso básico',
        languageLabel: 'Inglés',
        level: 'A1',
      },
    ])
  })

  it('normalizes null description and level to empty strings', () => {
    const cards = toPublicCourseCards([
      { id: 'c2', title: 'Curso', description: null, language: 'es', level: null },
    ])
    expect(cards[0].description).toBe('')
    expect(cards[0].level).toBe('')
  })

  it('does not invent ratings or student counts', () => {
    const cards = toPublicCourseCards([
      { id: 'c3', title: 'X', description: 'Y', language: 'es', level: 'B1' },
    ])
    expect(cards[0]).not.toHaveProperty('rating')
    expect(cards[0]).not.toHaveProperty('students')
  })
})
