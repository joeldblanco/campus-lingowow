import { describe, expect, it } from 'vitest'
import { buildLingoFlowReadModel, lingoFlowActiveStudentsWhere } from './read-model'

describe('buildLingoFlowReadModel', () => {
  it('counts distinct qualifying students and calculates the 4 to 30 baseline', () => {
    expect(buildLingoFlowReadModel(['student-1', 'student-2', 'student-2', 'student-3', 'student-4'])).toEqual({
      activeStudents: 4,
      targetStudents: 30,
      gap: 26,
      progressPercent: 13.3,
    })
  })

  it('does not report a negative gap when the target is exceeded', () => {
    expect(buildLingoFlowReadModel(Array.from({ length: 31 }, (_, index) => `student-${index}`)).gap).toBe(0)
  })

  it('defines active students as ACTIVE enrollments for ACTIVE STUDENT users only', () => {
    expect(lingoFlowActiveStudentsWhere).toEqual({
      status: 'ACTIVE',
      student: { status: 'ACTIVE', roles: { has: 'STUDENT' } },
    })
  })
})
