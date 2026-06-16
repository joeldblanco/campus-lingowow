import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@prisma/client', () => ({
  AttemptStatus: {
    IN_PROGRESS: 'IN_PROGRESS',
    SUBMITTED: 'SUBMITTED',
    COMPLETED: 'COMPLETED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
  },
  AssignmentStatus: { ASSIGNED: 'ASSIGNED' },
  ExamType: {
    COURSE_EXAM: 'COURSE_EXAM',
    PLACEMENT_TEST: 'PLACEMENT_TEST',
    DIAGNOSTIC: 'DIAGNOSTIC',
    PRACTICE: 'PRACTICE',
  },
  Prisma: {},
  UserRole: { ADMIN: 'ADMIN', TEACHER: 'TEACHER', STUDENT: 'STUDENT' },
}))

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn() }))
vi.mock('@/lib/actions/notifications', () => ({ notifyExamAssigned: vi.fn() }))
vi.mock('@/lib/mail', () => ({ sendPlacementTestResultEmail: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    exam: { findUnique: vi.fn() },
    examAttempt: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    examAttemptGrant: { aggregate: vi.fn() },
    enrollment: { findFirst: vi.fn() },
  },
}))

import { startExamAttempt } from './exams'
import { db } from '@/lib/db'

const EXAM_ID = 'exam-1'
const USER_ID = 'student-1'

// Examen de un solo intento, sin curso (salta la verificación de acceso).
const singleAttemptExam = {
  id: EXAM_ID,
  isPublished: true,
  maxAttempts: 1,
  examType: 'COURSE_EXAM',
  courseId: null,
  course: null,
  assignments: [],
  questions: [],
}

describe('startExamAttempt — effective attempt limit with grants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.exam.findUnique).mockResolvedValue(singleAttemptExam as never)
    vi.mocked(db.examAttempt.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.examAttempt.count).mockResolvedValue(1 as never)
  })

  it('blocks a retake when the single attempt is used and no extra was granted', async () => {
    vi.mocked(db.examAttemptGrant.aggregate).mockResolvedValue({
      _sum: { extraAttempts: null },
    } as never)

    const result = await startExamAttempt(EXAM_ID, USER_ID)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Has alcanzado el número máximo de intentos')
    expect(db.examAttempt.create).not.toHaveBeenCalled()
  })

  it('allows a new attempt beyond maxAttempts when an extra attempt was granted', async () => {
    vi.mocked(db.examAttemptGrant.aggregate).mockResolvedValue({
      _sum: { extraAttempts: 1 },
    } as never)
    vi.mocked(db.examAttempt.create).mockResolvedValue({
      id: 'attempt-2',
      attemptNumber: 2,
      status: 'IN_PROGRESS',
    } as never)

    const result = await startExamAttempt(EXAM_ID, USER_ID)

    expect(result.success).toBe(true)
    expect(db.examAttempt.create).toHaveBeenCalledTimes(1)
    expect(db.examAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptNumber: 2 }),
      })
    )
  })
})
