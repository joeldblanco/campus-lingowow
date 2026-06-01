import { describe, it, expect } from 'vitest'
import { buildExamResultRows, type ExamAttemptForExport } from './exam-result-rows'

const baseAttempt: ExamAttemptForExport = {
  attemptNumber: 1,
  status: 'COMPLETED',
  score: 85,
  totalPoints: 17,
  maxPoints: 20,
  timeSpent: 12,
  submittedAt: new Date('2026-05-30T10:00:00.000Z'),
  recommendedLevel: null,
  user: { name: 'Ana', lastName: 'Pérez', email: 'ana@example.com' },
}

describe('buildExamResultRows', () => {
  it('maps an attempt to a flat export row with localized status', () => {
    const [row] = buildExamResultRows([baseAttempt])
    expect(row).toEqual({
      Estudiante: 'Ana Pérez',
      Email: 'ana@example.com',
      Intento: 1,
      Estado: 'Completado',
      'Puntaje (%)': 85,
      Puntos: 17,
      'Puntos máximos': 20,
      'Tiempo (min)': 12,
      'Fecha de envío': '2026-05-30',
      'Nivel recomendado': '',
    })
  })

  it('uses a dash for a missing student and empty cells for null metrics/dates', () => {
    const [row] = buildExamResultRows([
      {
        ...baseAttempt,
        score: null,
        totalPoints: null,
        maxPoints: null,
        timeSpent: null,
        submittedAt: null,
        user: null,
      },
    ])
    expect(row.Estudiante).toBe('—')
    expect(row.Email).toBe('')
    expect(row['Puntaje (%)']).toBe('')
    expect(row['Fecha de envío']).toBe('')
  })

  it('falls back to the raw status when unknown and emits one row per attempt', () => {
    const rows = buildExamResultRows([
      baseAttempt,
      { ...baseAttempt, attemptNumber: 2, status: 'WEIRD' },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[1].Intento).toBe(2)
    expect(rows[1].Estado).toBe('WEIRD')
  })
})
