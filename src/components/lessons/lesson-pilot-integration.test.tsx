import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LessonContent } from './lesson-content'
import { completeCourseLesson } from '@/lib/actions/lessons'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('@/lib/actions/lessons', () => ({ completeCourseLesson: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/content-mapper', () => ({ mapContentToBlock: (content: unknown) => content }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: () => <div>Contenido clásico</div>,
}))
vi.mock('./guided-lesson-viewer', () => ({
  GuidedLessonViewer: ({ onComplete }: { onComplete?: () => void }) => (
    <button onClick={onComplete}>Completar piloto</button>
  ),
}))

const lesson = {
  id: 'pilot', title: 'This is me!', contents: [{ id: 'content', type: 'text', content: 'Real' }], activities: [],
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('pilot integration', () => {
  it('uses the existing completion action for the opted-in student viewer', async () => {
    vi.mocked(completeCourseLesson).mockResolvedValue({ success: true, nextLessonId: null, courseProgress: 100 } as never)
    render(<LessonContent lesson={lesson as never} guidedStorageKey="user:course:pilot" courseId="course"
      navigation={{ prevLessonId: null, nextLessonId: null, isCompleted: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Completar piloto' }))
    await waitFor(() => expect(completeCourseLesson).toHaveBeenCalledWith('course', 'pilot'))
    expect(push).toHaveBeenCalledWith('/my-courses/course?completedLesson=pilot')
  })

  it.each([{ isTeacher: true }, { isClassroom: true }, {}])('preserves the classic viewer outside student opt-in: %j', (props) => {
    render(<LessonContent lesson={lesson as never} {...props}
      guidedStorageKey={Object.keys(props).length ? 'user:course:pilot' : undefined} />)
    expect(screen.getByText('Contenido clásico')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar piloto' })).not.toBeInTheDocument()
  })

  it('keeps video lessons in the classic viewer rather than hiding their video', () => {
    render(<LessonContent lesson={{ ...lesson, videoUrl: '/video.mp4' } as never} guidedStorageKey="pilot" />)
    expect(screen.getByText('Video Player: This is me!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar piloto' })).not.toBeInTheDocument()
  })
})
