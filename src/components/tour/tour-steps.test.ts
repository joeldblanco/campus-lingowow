import { describe, expect, it } from 'vitest'
import { studentTourSteps } from './tour-steps'

describe('studentTourSteps', () => {
  it('uses a short tour with targets available to every enrolled student', () => {
    expect(studentTourSteps.map((step) => step.target)).toEqual([
      '[data-tour="sidebar"]',
      '[data-tour="student-course"]',
      '[data-tour="nav-actividades"]',
      '[data-tour="nav-biblioteca"]',
      '[data-tour="tour-help"]',
    ])
  })

  it('explains lessons, completion, progress, activities, resources, and reopening the tour', () => {
    const copy = studentTourSteps.map((step) => String(step.content)).join(' ').toLowerCase()

    expect(copy).toContain('lecciones')
    expect(copy).toContain('complet')
    expect(copy).toContain('progreso')
    expect(copy).toContain('actividades')
    expect(copy).toContain('recursos')
    expect(copy).toContain('volver a abrir')
    expect(copy).toContain('completar y continuar')
    expect(copy).toContain('lección completada')
    expect(copy).not.toContain('usa “completar lección” y luego')
    expect(copy).toContain('siguiente lección')
  })
})
