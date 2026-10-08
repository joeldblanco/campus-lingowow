import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { getCourseModuleProgress, getCourseProgress } from './courses'

vi.mock('@/lib/db', () => ({
  db: {
    enrollment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    module: { findMany: vi.fn() },
    exam: { findMany: vi.fn() },
    examAttempt: { findMany: vi.fn() },
    userContent: { findMany: vi.fn() },
  },
}))

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const archive = {
  id: 'archive-embed',
  data: {
    type: 'teacher_notes',
    learningRevision: 'course-guided-v1',
    courseId: 'course-1',
    lessonId: 'lesson-1',
    originalSource: { type: 'embed', contentId: 'archive-embed' },
    answerKeys: ['private-answer'],
  },
}
const learnerContents = [
  { id: 'new-1', data: { type: 'text' } },
  { id: 'new-2', data: { type: 'text' } },
  { id: 'new-3', data: { type: 'text' } },
  { id: 'teacher-note', data: { type: 'teacher_notes' } },
  { id: 'hidden-note', data: { type: 'text', hiddenFromLearners: true } },
]
const migratedModules = [
  {
    id: 'module-1',
    order: 1,
    title: 'Module 1',
    lessons: [{ id: 'lesson-1', contents: [archive, ...learnerContents] }],
  },
]

describe('course progress actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.exam.findMany).mockResolvedValue([] as never)
    vi.mocked(db.examAttempt.findMany).mockResolvedValue([] as never)
  })

  it('keeps converted lessons completed in the course summary', async () => {
    vi.mocked(db.enrollment.findFirst).mockResolvedValue({ id: 'enrollment-1' } as never)
    vi.mocked(db.enrollment.findUnique).mockResolvedValue({
      id: 'enrollment-1',
      student: {
        completedContents: [
          { contentId: 'archive-embed', completed: true, percentage: 100, lastAccessed: null },
        ],
        activities: [],
      },
      course: { modules: migratedModules },
    } as never)

    const result = await getCourseProgress('course-1', 'student-1')

    expect(result).toMatchObject({
      totalContents: 3,
      completedContents: 3,
      progressPercentage: 100,
      completedContentIds: ['new-1', 'new-2', 'new-3'],
    })
    expect(JSON.stringify(result?.enrollment)).not.toContain('originalSource')
    expect(JSON.stringify(result?.enrollment)).not.toContain('private-answer')
    expect(result?.enrollment?.course.modules[0].lessons[0].contents).toEqual([
      { id: 'new-1' },
      { id: 'new-2' },
      { id: 'new-3' },
    ])
  })

  it('uses converted legacy completion for module progress and ignores notes', async () => {
    vi.mocked(db.module.findMany).mockResolvedValue(migratedModules as never)
    vi.mocked(db.userContent.findMany).mockResolvedValue([
      { contentId: 'archive-embed' },
      { contentId: 'unrelated-content' },
    ] as never)

    const result = await getCourseModuleProgress('course-1', 'student-1')

    expect(result).toEqual([
      expect.objectContaining({
        moduleId: 'module-1',
        totalContents: 3,
        completedContents: 3,
        percentage: 100,
        isCompleted: true,
      }),
    ])
  })
})
