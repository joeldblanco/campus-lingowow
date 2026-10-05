import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { getCourseForPublicView, getCoursesForPublicView } from './courses'

vi.mock('@/lib/db', () => ({
  db: { course: { findMany: vi.fn(), findUnique: vi.fn() } },
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('Public course lesson counts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes unpublished lessons from course card counts', async () => {
    vi.mocked(db.course.findMany).mockResolvedValue([])

    await getCoursesForPublicView()

    expect(db.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        modules: expect.objectContaining({
          where: { isPublished: true },
          select: expect.objectContaining({
            _count: { select: { lessons: { where: { isPublished: true } } } },
          }),
        }),
      }),
    }))
  })

  it('counts only published lessons in course details and previews', async () => {
    vi.mocked(db.course.findUnique).mockResolvedValue(null)

    await getCourseForPublicView('course-1')

    expect(db.course.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        modules: expect.objectContaining({
          select: expect.objectContaining({
            lessons: expect.objectContaining({ where: { isPublished: true } }),
            _count: { select: { lessons: { where: { isPublished: true } } } },
          }),
        }),
      }),
    }))
  })
})
