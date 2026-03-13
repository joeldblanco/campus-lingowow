import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assignLanguageCoursesToTeacher } from './teacher-courses'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    course: {
      findMany: vi.fn(),
    },
    teacherCourse: {
      createMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('assignLanguageCoursesToTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should optimize upsert queries by using createMany with skipDuplicates', async () => {
    const mockCourses = [
      { id: 'course1' },
      { id: 'course2' },
      { id: 'course3' },
    ]

    vi.mocked(db.course.findMany).mockResolvedValue(mockCourses as any)
    vi.mocked(db.teacherCourse.createMany).mockResolvedValue({ count: 3 } as any)

    const result = await assignLanguageCoursesToTeacher('teacher1', 'EN')

    expect(result.success).toBe(true)
    expect(db.course.findMany).toHaveBeenCalledWith({
      where: {
        language: 'EN',
        isPublished: true,
      },
      select: {
        id: true,
      },
    })

    // We expect upsert NOT to be called, and createMany to be called instead.
    expect(db.teacherCourse.upsert).not.toHaveBeenCalled()
    expect(db.teacherCourse.createMany).toHaveBeenCalledWith({
      data: [
        { teacherId: 'teacher1', courseId: 'course1' },
        { teacherId: 'teacher1', courseId: 'course2' },
        { teacherId: 'teacher1', courseId: 'course3' },
      ],
      skipDuplicates: true,
    })
  })
})
