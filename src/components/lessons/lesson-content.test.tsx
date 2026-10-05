import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeCourseLesson } from '@/lib/actions/lessons'
import { LessonContent } from './lesson-content'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/actions/lessons', () => ({
  completeCourseLesson: vi.fn(),
}))

vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: () => <div>Bloque académico</div>,
}))

vi.mock('@/lib/content-mapper', () => ({
  mapContentToBlock: (content: { id: string }) => content,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const lesson = {
  id: 'lesson-1',
  title: 'Lesson 1',
  contents: [{ id: 'content-1' }],
  activities: [],
}

describe('LessonContent progress navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists lesson completion before navigating to the next lesson', async () => {
    vi.mocked(completeCourseLesson).mockResolvedValue({
      success: true,
      nextLessonId: 'lesson-2',
      courseProgress: 50,
    })

    render(
      <LessonContent
        lesson={lesson as never}
        courseId="course-1"
        navigation={{ prevLessonId: null, nextLessonId: 'lesson-2', isCompleted: false }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /completar y continuar/i }))

    await waitFor(() => {
      expect(completeCourseLesson).toHaveBeenCalledWith('course-1', 'lesson-1')
      expect(push).toHaveBeenCalledWith('/my-courses/course-1/lessons/lesson-2')
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('returns to the course after completing the final lesson', async () => {
    vi.mocked(completeCourseLesson).mockResolvedValue({
      success: true,
      nextLessonId: null,
      courseProgress: 100,
    } as never)

    render(
      <LessonContent
        lesson={{ ...lesson, contents: [] } as never}
        courseId="course-1"
        navigation={{ prevLessonId: 'lesson-0', nextLessonId: null, isCompleted: false }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /completar lección/i }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/my-courses/course-1')
    })
  })
})
