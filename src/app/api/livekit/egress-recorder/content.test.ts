import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    lesson: { findFirst: vi.fn() },
    libraryResource: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/library-content', () => ({
  buildLibraryResourceContents: vi.fn(() => []),
}))

import { db } from '@/lib/db'
import { getRecorderContent } from './content'
import type { RecorderAuthorization } from './auth'

const authorization: RecorderAuthorization = {
  roomName: 'class-booking-1',
  bookingId: 'booking-1',
  booking: {
    id: 'booking-1',
    teacherId: 'teacher-1',
    studentId: 'student-1',
    enrollmentId: 'enrollment-1',
    enrollment: { courseId: 'course-1', studentId: 'student-1' },
  },
}

describe('getRecorderContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.lesson.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.libraryResource.findFirst).mockResolvedValue(null as never)
  })

  it('follows the classroom picker policy for published module lessons', async () => {
    vi.mocked(db.lesson.findFirst).mockResolvedValue({ id: 'lesson-1' } as never)

    await getRecorderContent(authorization, 'lesson-1', 'lesson')

    expect(db.lesson.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'lesson-1',
        isPublished: true,
        moduleId: { not: null },
      },
    }))
  })

  it('allows the classroom teacher to share published personalized lessons from their picker', async () => {
    await getRecorderContent(authorization, 'lesson-2', 'student_lesson')

    expect(db.lesson.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: { not: null },
        teacherId: 'teacher-1',
      }),
    }))
    expect(vi.mocked(db.lesson.findFirst).mock.calls[0]?.[0]).not.toHaveProperty('where.enrollmentId')
  })

  it('does not query lesson content when the room has no booking', async () => {
    await getRecorderContent({ roomName: 'test-room', bookingId: null, booking: null }, 'lesson-1', 'lesson')

    expect(db.lesson.findFirst).not.toHaveBeenCalled()
  })

  it('removes teacher notes at every content-tree level before recording', async () => {
    vi.mocked(db.lesson.findFirst).mockResolvedValue({
      id: 'lesson-1',
      contents: [
        {
          id: 'shared-root',
          contentType: 'RICH_TEXT',
          data: { type: 'text', content: '<p>Shared</p>' },
          children: [
            {
              id: 'private-child',
              contentType: 'RICH_TEXT',
              data: { type: 'teacher_notes', content: 'Private' },
              children: [],
            },
            {
              id: 'shared-child',
              contentType: 'RICH_TEXT',
              data: { type: 'text', content: '<p>Child</p>' },
              children: [],
            },
          ],
        },
        {
          id: 'private-root',
          contentType: 'RICH_TEXT',
          data: { type: 'teacher_notes', content: 'Private' },
          children: [],
        },
      ],
    } as never)

    const result = await getRecorderContent(authorization, 'lesson-1', 'lesson') as { contents: Array<{ id: string; children?: Array<{ id: string }> }> }

    expect(result.contents.map((content) => content.id)).toEqual(['shared-root'])
    expect(result.contents[0]?.children?.map((content) => content.id)).toEqual(['shared-child'])
  })
})
