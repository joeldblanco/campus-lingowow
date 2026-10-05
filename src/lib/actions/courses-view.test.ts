import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    course: { findUnique: vi.fn() },
    exam: { findMany: vi.fn() },
    examAttempt: { findMany: vi.fn() },
    lesson: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { getCourseForPublicView } from './courses'

type ExamFixture = {
  id: string
  title?: string
  moduleId?: string | null
  isBlocking?: boolean
  passingScore?: number
}

function makeExam({
  id,
  title = id,
  moduleId = null,
  isBlocking = false,
  passingScore = 70,
}: ExamFixture) {
  return {
    id,
    title,
    description: 'Exam description',
    timeLimit: 30,
    passingScore,
    maxAttempts: 3,
    isPublished: true,
    moduleId,
    isBlocking,
    questions: [{ points: 10 }],
  }
}

function makeCourse({
  isPersonalized = false,
  exams = [],
}: {
  isPersonalized?: boolean
  exams?: ReturnType<typeof makeExam>[]
}) {
  return {
    id: 'course-1',
    isPublished: true,
    isPersonalized,
    createdBy: { name: 'Teacher', bio: 'Teacher bio' },
    modules: [],
    enrollments: [],
    exams,
    _count: { modules: 0, enrollments: 0 },
  }
}

describe('getCourseForPublicView exam progress metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.lesson.findMany).mockResolvedValue([] as never)
  })

  it('maps module and blocking metadata and passes when any user attempt reaches the threshold', async () => {
    const exam = makeExam({ id: 'exam-1', moduleId: 'module-1', isBlocking: true })
    vi.mocked(db.course.findUnique).mockResolvedValue(makeCourse({ exams: [exam] }) as never)
    vi.mocked(db.examAttempt.findMany).mockResolvedValue([
      { examId: exam.id, score: 69 },
      { examId: exam.id, score: 70 },
      { examId: exam.id, score: null },
    ] as never)

    const result = await getCourseForPublicView('course-1', 'student-1')

    expect(result?.exams[0]).toMatchObject({
      id: exam.id,
      moduleId: 'module-1',
      isBlocking: true,
      hasPassed: true,
    })
    expect(db.examAttempt.findMany).toHaveBeenCalledWith({
      where: { userId: 'student-1', examId: { in: [exam.id] } },
      select: { examId: true, score: true },
    })
    expect(db.course.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          exams: expect.objectContaining({
            select: expect.objectContaining({ moduleId: true, isBlocking: true }),
          }),
        }),
      })
    )
  })

  it('uses only assigned personalized exams and scopes their attempts to the supplied user', async () => {
    const assignedExam = makeExam({ id: 'assigned-exam', moduleId: 'module-2', passingScore: 80 })
    const courseExam = makeExam({ id: 'course-exam' })
    vi.mocked(db.course.findUnique).mockResolvedValue(
      makeCourse({ isPersonalized: true, exams: [courseExam] }) as never
    )
    vi.mocked(db.exam.findMany).mockResolvedValue([assignedExam] as never)
    vi.mocked(db.examAttempt.findMany).mockResolvedValue([
      { examId: assignedExam.id, score: 80 },
    ] as never)

    const result = await getCourseForPublicView('course-1', 'student-2')

    expect(result?.exams).toHaveLength(1)
    expect(result?.exams[0]).toMatchObject({
      id: assignedExam.id,
      moduleId: 'module-2',
      isBlocking: false,
      hasPassed: true,
    })
    expect(db.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId: 'course-1',
          isPublished: true,
          assignments: { some: { userId: 'student-2' } },
        },
        select: expect.objectContaining({ moduleId: true, isBlocking: true }),
      })
    )
    expect(db.examAttempt.findMany).toHaveBeenCalledWith({
      where: { userId: 'student-2', examId: { in: [assignedExam.id] } },
      select: { examId: true, score: true },
    })
  })

  it('sets hasPassed false and skips attempt reads when no user is supplied', async () => {
    const exam = makeExam({ id: 'guest-exam', moduleId: null, isBlocking: false })
    vi.mocked(db.course.findUnique).mockResolvedValue(makeCourse({ exams: [exam] }) as never)

    const result = await getCourseForPublicView('course-1')

    expect(result?.exams[0]).toMatchObject({
      id: exam.id,
      moduleId: null,
      isBlocking: false,
      hasPassed: false,
    })
    expect(db.examAttempt.findMany).not.toHaveBeenCalled()
  })
})
