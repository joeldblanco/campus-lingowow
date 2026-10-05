import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { completeCourseLesson, getCourseLessonNavigation } from './lessons'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    enrollment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    module: { findMany: vi.fn() },
    exam: { findMany: vi.fn() },
    examAttempt: { findMany: vi.fn() },
    lesson: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userContent: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('completeCourseLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'student-1' } } as never)
    vi.mocked(db.enrollment.findFirst).mockResolvedValue({ id: 'enrollment-1' } as never)
    vi.mocked(db.lesson.findFirst).mockResolvedValue({ id: 'lesson-1', moduleId: 'module-1' } as never)
    vi.mocked(db.module.findMany).mockResolvedValue([{ id: 'module-1', order: 1 }] as never)
    vi.mocked(db.exam.findMany).mockResolvedValue([])
    vi.mocked(db.examAttempt.findMany).mockResolvedValue([])
    vi.mocked(db.lesson.findMany).mockResolvedValue([
      { id: 'lesson-1', contents: [{ id: 'content-1' }, { id: 'content-2' }] },
      { id: 'lesson-2', contents: [{ id: 'content-3' }] },
    ] as never)
    vi.mocked(db.userContent.createMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(db.userContent.updateMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(db.$transaction).mockResolvedValue([] as never)
    vi.mocked(db.userContent.count).mockResolvedValue(2)
    vi.mocked(db.enrollment.update).mockResolvedValue({} as never)
  })

  it('completes every content, updates course progress, and advances to the next lesson', async () => {
    const result = await completeCourseLesson('course-1', 'lesson-1')

    expect(result).toEqual({
      success: true,
      nextLessonId: 'lesson-2',
      courseProgress: 67,
    })
    expect(db.userContent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'student-1',
          contentId: 'content-1',
          completed: true,
          percentage: 100,
        }),
        expect.objectContaining({
          userId: 'student-1',
          contentId: 'content-2',
          completed: true,
          percentage: 100,
        }),
      ],
      skipDuplicates: true,
    })
    expect(db.userContent.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'student-1',
        contentId: { in: ['content-1', 'content-2'] },
      },
      data: expect.objectContaining({ completed: true, percentage: 100 }),
    })
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: expect.objectContaining({ progress: 67 }),
    })
  })

  it('rejects completion in a module locked by an unpassed blocking exam', async () => {
    vi.mocked(db.module.findMany).mockResolvedValue([
      { id: 'module-0', order: 0 },
      { id: 'module-1', order: 1 },
    ] as never)
    vi.mocked(db.exam.findMany).mockResolvedValue([
      { id: 'exam-1', moduleId: 'module-0', isBlocking: true, passingScore: 70 },
    ] as never)
    vi.mocked(db.examAttempt.findMany).mockResolvedValue([])

    await expect(completeCourseLesson('course-1', 'lesson-1')).resolves.toEqual({
      success: false,
      error: 'Debes aprobar la evaluaci\u00f3n anterior para acceder a esta lecci\u00f3n',
    })
    expect(db.userContent.createMany).not.toHaveBeenCalled()
    expect(db.enrollment.update).not.toHaveBeenCalled()
  })

  it('returns to the course after completing the final lesson', async () => {
    vi.mocked(db.lesson.findMany).mockResolvedValue([
      { id: 'lesson-1', contents: [{ id: 'content-1' }] },
    ] as never)
    vi.mocked(db.userContent.count).mockResolvedValue(1)

    await expect(completeCourseLesson('course-1', 'lesson-1')).resolves.toEqual({
      success: true,
      nextLessonId: null,
      courseProgress: 100,
    })
  })

  it('does not write progress without an authenticated enrollment', async () => {
    vi.mocked(db.enrollment.findFirst).mockResolvedValue(null)

    await expect(completeCourseLesson('course-1', 'lesson-1')).resolves.toEqual({
      success: false,
      error: 'No tienes acceso a este curso',
    })
    expect(db.userContent.createMany).not.toHaveBeenCalled()
    expect(db.enrollment.update).not.toHaveBeenCalled()
  })
})

describe('getCourseLessonNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.lesson.findMany).mockResolvedValue([
      { id: 'lesson-1', contents: [{ id: 'content-1' }] },
      { id: 'lesson-2', contents: [{ id: 'content-2' }, { id: 'content-3' }] },
      { id: 'lesson-3', contents: [{ id: 'content-4' }] },
    ] as never)
  })

  it('returns previous and next lessons and the current completion state', async () => {
    vi.mocked(db.userContent.count).mockResolvedValue(1)

    await expect(getCourseLessonNavigation('course-1', 'lesson-2', 'student-1')).resolves.toEqual({
      prevLessonId: 'lesson-1',
      nextLessonId: 'lesson-3',
      isCompleted: false,
    })
    expect(db.userContent.count).toHaveBeenCalledWith({
      where: {
        userId: 'student-1',
        contentId: { in: ['content-2', 'content-3'] },
        completed: true,
      },
    })
  })
})
