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
      findMany: vi.fn(),
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
    vi.mocked(db.lesson.findFirst).mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
    } as never)
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

  it('completes visible converted contents from a completed original embed without writing archive rows', async () => {
    const archive = {
      id: 'archive-embed',
      data: {
        type: 'teacher_notes',
        learningRevision: 'course-guided-v1',
        courseId: 'course-1',
        lessonId: 'lesson-1',
        originalSource: { type: 'embed', contentId: 'archive-embed' },
      },
    }
    const teacherNotes = { id: 'teacher-note', data: { type: 'teacher_notes' } }
    const active = [
      { id: 'new-1', data: { type: 'text' } },
      { id: 'new-2', data: { type: 'text' } },
      { id: 'new-3', data: { type: 'text' } },
    ]
    vi.mocked(db.lesson.findMany).mockResolvedValue([
      { id: 'lesson-1', contents: [archive, ...active, teacherNotes] },
    ] as never)
    vi.mocked(db.userContent.findMany).mockResolvedValue([
      { contentId: 'archive-embed', completed: true },
    ] as never)

    await expect(completeCourseLesson('course-1', 'lesson-1')).resolves.toEqual({
      success: true,
      nextLessonId: null,
      courseProgress: 100,
    })

    expect(db.userContent.createMany).toHaveBeenCalledWith({
      data: active.map(({ id }) =>
        expect.objectContaining({
          userId: 'student-1',
          contentId: id,
          completed: true,
          percentage: 100,
        })
      ),
      skipDuplicates: true,
    })
    expect(db.userContent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'student-1', contentId: { in: active.map(({ id }) => id) } },
      data: expect.objectContaining({ completed: true, percentage: 100 }),
    })
    expect(vi.mocked(db.userContent.createMany).mock.calls[0]![0]!.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ contentId: 'archive-embed' })])
    )
    expect(vi.mocked(db.userContent.createMany).mock.calls[0]![0]!.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ contentId: 'teacher-note' })])
    )
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

  it('uses a completed original embed as virtual completion for converted visible contents', async () => {
    vi.mocked(db.lesson.findMany).mockResolvedValue([
      {
        id: 'lesson-1',
        contents: [
          {
            id: 'archive-embed',
            data: {
              type: 'teacher_notes',
              learningRevision: 'course-guided-v1',
              courseId: 'course-1',
              lessonId: 'lesson-1',
              originalSource: { type: 'embed', contentId: 'archive-embed' },
            },
          },
          { id: 'new-1', data: { type: 'text' } },
          { id: 'new-2', data: { type: 'text' } },
          { id: 'new-3', data: { type: 'text' } },
          { id: 'teacher-note', data: { type: 'teacher_notes' } },
        ],
      },
    ] as never)
    vi.mocked(db.userContent.findMany).mockResolvedValue([
      { contentId: 'archive-embed', completed: true },
    ] as never)

    await expect(getCourseLessonNavigation('course-1', 'lesson-1', 'student-1')).resolves.toEqual({
      prevLessonId: null,
      nextLessonId: null,
      isCompleted: true,
    })
    expect(db.userContent.count).not.toHaveBeenCalled()
  })
})
