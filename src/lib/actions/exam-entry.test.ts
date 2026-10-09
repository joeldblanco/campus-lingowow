import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { canUserTakePlacementTest, startExamAttempt } from './exams'
import { getExamEntryDetails, loadExamTakingSession } from './exam-entry'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { exam: { findUnique: vi.fn() }, course: { findUnique: vi.fn() }, enrollment: { findFirst: vi.fn() } } }))
vi.mock('./exams', () => ({ startExamAttempt: vi.fn(), getExamAttemptWithState: vi.fn(), canUserTakePlacementTest: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: 'student' } } as never)
  vi.mocked(db.exam.findUnique).mockResolvedValue({ title: 'Unit quiz', isPublished: true, examType: 'COURSE_EXAM', blockCopyPaste: false, blockRightClick: true, maxWarnings: 5 } as never)
})

describe('exam entry preflight', () => {
  it('loads only notice metadata without creating an attempt or starting its clock', async () => {
    const details = await getExamEntryDetails('exam')
    if ('redirectUrl' in details) throw new Error('Expected an available evaluation')
    expect(details.title).toBe('Unit quiz')
    expect(details.proctoring).toMatchObject({ enabled: true, requireFullscreen: true, blockCopyPaste: false })
    expect(startExamAttempt).not.toHaveBeenCalled()
    expect(details).not.toHaveProperty('questions')
  })

  it('binds the accepted attempt to the authenticated student and returns its original timestamp', async () => {
    const startedAt = new Date('2026-10-07T00:00:00Z')
    vi.mocked(startExamAttempt).mockResolvedValue({ success: true, isResuming: false, attempt: { id: 'attempt', startedAt }, exam: { title: 'Unit quiz', description: '', questions: [], timeLimit: 40, examType: 'COURSE_EXAM', blockCopyPaste: true, blockRightClick: true, maxWarnings: 5 } } as never)
    const session = await loadExamTakingSession('exam')
    if ('redirectUrl' in session) throw new Error('Expected an accepted attempt')
    expect(startExamAttempt).toHaveBeenCalledWith('exam', 'student')
    expect(session.startedAt).toBe(startedAt.toISOString())
    expect(session.proctoring.enabled).toBe(true)
  })

  it('rejects unauthenticated entry before creating or exposing an attempt', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await expect(loadExamTakingSession('exam')).rejects.toThrow('Inicia sesión')
    expect(startExamAttempt).not.toHaveBeenCalled()
    expect(db.exam.findUnique).not.toHaveBeenCalled()
  })

  it('denies course metadata before entry when the student is not enrolled', async () => {
    vi.mocked(db.exam.findUnique).mockResolvedValue({ isPublished: true, examType: 'COURSE_EXAM', courseId: 'course', course: { isPersonalized: false }, assignments: [] } as never)
    vi.mocked(db.enrollment.findFirst).mockResolvedValue(null)
    await expect(getExamEntryDetails('exam')).rejects.toThrow('No tienes acceso')
    expect(startExamAttempt).not.toHaveBeenCalled()
  })

  it('preserves the maximum-attempts destination instead of masking it as a connection error', async () => {
    vi.mocked(startExamAttempt).mockResolvedValue({ success: false, error: 'Has alcanzado el número máximo de intentos' } as never)
    expect(await loadExamTakingSession('exam')).toEqual({ redirectUrl: '/exams/exam?error=max-attempts' })
  })

  it('returns a completed placement evaluation to its results without creating an attempt', async () => {
    vi.mocked(db.exam.findUnique).mockResolvedValue({ isPublished: true, examType: 'PLACEMENT_TEST' } as never)
    vi.mocked(canUserTakePlacementTest).mockResolvedValue({ canTake: false, reason: 'Ya completaste esta evaluación' })
    expect(await getExamEntryDetails('placement')).toEqual({ redirectUrl: '/placement-test/placement/results' })
    expect(startExamAttempt).not.toHaveBeenCalled()
  })
})
