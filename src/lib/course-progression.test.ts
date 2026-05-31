import { describe, it, expect } from 'vitest'
import {
  computeModuleProgress,
  hasPassedExam,
  computeModuleLockState,
  buildModuleProgressView,
  type ProgressModule,
  type GatingExam,
} from './course-progression'

const modules: ProgressModule[] = [
  {
    id: 'm1',
    order: 0,
    title: 'Módulo 1',
    lessons: [
      { id: 'l1', contents: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'l2', contents: [{ id: 'c3' }] },
    ],
  },
  {
    id: 'm2',
    order: 1,
    title: 'Módulo 2',
    lessons: [{ id: 'l3', contents: [{ id: 'c4' }, { id: 'c5' }] }],
  },
  {
    id: 'm3',
    order: 2,
    title: 'Módulo 3',
    lessons: [{ id: 'l4', contents: [] }],
  },
]

describe('computeModuleProgress (#147)', () => {
  it('computes per-module completion from completed content ids', () => {
    const progress = computeModuleProgress(modules, ['c1', 'c2', 'c3', 'c4'])
    expect(progress).toHaveLength(3)

    const m1 = progress.find((p) => p.moduleId === 'm1')!
    expect(m1.totalContents).toBe(3)
    expect(m1.completedContents).toBe(3)
    expect(m1.percentage).toBe(100)
    expect(m1.isCompleted).toBe(true)

    const m2 = progress.find((p) => p.moduleId === 'm2')!
    expect(m2.completedContents).toBe(1)
    expect(m2.percentage).toBe(50)
    expect(m2.isCompleted).toBe(false)
  })

  it('treats an empty module as 0% and not completed', () => {
    const progress = computeModuleProgress(modules, [])
    const m3 = progress.find((p) => p.moduleId === 'm3')!
    expect(m3.totalContents).toBe(0)
    expect(m3.percentage).toBe(0)
    expect(m3.isCompleted).toBe(false)
  })

  it('returns modules sorted by order', () => {
    const shuffled = [modules[2], modules[0], modules[1]]
    const progress = computeModuleProgress(shuffled, [])
    expect(progress.map((p) => p.moduleId)).toEqual(['m1', 'm2', 'm3'])
  })
})

describe('hasPassedExam (#92)', () => {
  const exam: GatingExam = { id: 'e1', moduleId: 'm1', isBlocking: true, passingScore: 70 }

  it('is true when an attempt scores at or above the passing score', () => {
    expect(hasPassedExam(exam, [{ examId: 'e1', score: 70 }])).toBe(true)
    expect(hasPassedExam(exam, [{ examId: 'e1', score: 85 }])).toBe(true)
  })

  it('is false when all attempts are below the passing score', () => {
    expect(hasPassedExam(exam, [{ examId: 'e1', score: 69 }])).toBe(false)
  })

  it('ignores attempts for other exams and null scores', () => {
    expect(hasPassedExam(exam, [{ examId: 'e2', score: 100 }])).toBe(false)
    expect(hasPassedExam(exam, [{ examId: 'e1', score: null }])).toBe(false)
  })
})

describe('computeModuleLockState (#92)', () => {
  const blockingExamOnM1: GatingExam[] = [
    { id: 'e1', moduleId: 'm1', isBlocking: true, passingScore: 70 },
  ]

  it('locks subsequent modules when a blocking exam is not passed', () => {
    const locks = computeModuleLockState(modules, blockingExamOnM1, [{ examId: 'e1', score: 50 }])
    expect(locks.find((l) => l.moduleId === 'm1')!.isLocked).toBe(false) // gating module is reachable
    expect(locks.find((l) => l.moduleId === 'm2')!.isLocked).toBe(true)
    expect(locks.find((l) => l.moduleId === 'm2')!.blockedByModuleId).toBe('m1')
    expect(locks.find((l) => l.moduleId === 'm3')!.isLocked).toBe(true)
  })

  it('unlocks everything once the blocking exam is passed', () => {
    const locks = computeModuleLockState(modules, blockingExamOnM1, [{ examId: 'e1', score: 90 }])
    expect(locks.every((l) => !l.isLocked)).toBe(true)
  })

  it('does not lock anything when there are no blocking exams', () => {
    const nonBlocking: GatingExam[] = [
      { id: 'e1', moduleId: 'm1', isBlocking: false, passingScore: 70 },
    ]
    const locks = computeModuleLockState(modules, nonBlocking, [])
    expect(locks.every((l) => !l.isLocked)).toBe(true)
  })
})

describe('buildModuleProgressView', () => {
  it('merges progress and lock state per module in order', () => {
    const view = buildModuleProgressView(
      modules,
      ['c1', 'c2', 'c3'],
      [{ id: 'e1', moduleId: 'm1', isBlocking: true, passingScore: 70 }],
      [] // no attempts -> not passed
    )
    expect(view.map((m) => m.moduleId)).toEqual(['m1', 'm2', 'm3'])
    const m1 = view[0]
    expect(m1.isCompleted).toBe(true)
    expect(m1.isLocked).toBe(false)
    const m2 = view[1]
    expect(m2.isLocked).toBe(true)
    expect(m2.blockedByModuleId).toBe('m1')
  })
})
