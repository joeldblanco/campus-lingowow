import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LessonContent } from './lesson-content'
import { UNIT_ONE_LESSON_ID } from '@/lib/unit-one-learning'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/actions/lessons', () => ({ completeCourseLesson: vi.fn() }))
vi.mock('@/lib/content-mapper', () => ({ mapContentToBlock: (row: unknown) => row }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({ BlockPreview: () => <div>Classic content</div> }))
vi.mock('./guided-lesson-viewer', () => ({ GuidedLessonViewer: ({ isTeacher, isClassroom, onComplete, isCompleted }: { isTeacher?: boolean; isClassroom?: boolean; onComplete?: () => void; isCompleted?: boolean }) => <div>
  <p>Guided {isTeacher ? 'teacher' : 'student'} {isClassroom ? 'classroom' : 'solo'}</p>
  <button onClick={onComplete}>Finish guided</button><span>{isCompleted ? 'Finished' : 'In progress'}</span>
</div> }))
const lesson = { id: UNIT_ONE_LESSON_ID, title: 'This is me!', contents: [{ id: 'content', type: 'text', content: 'Hello' }], activities: [] }
describe('Unit 1 accompanied learning', () => {
  it('uses the same guided scenes for teacher and student during class', () => {
    const view = render(<LessonContent lesson={lesson as never} isTeacher isClassroom />)
    expect(screen.getByText('Guided teacher classroom')).toBeInTheDocument()
    view.rerender(<LessonContent lesson={lesson as never} isClassroom />)
    expect(screen.getByText('Guided student classroom')).toBeInTheDocument()
  })
  it('can finish a classroom presentation without writing teacher student progress', () => {
    render(<LessonContent lesson={lesson as never} isTeacher isClassroom />)
    fireEvent.click(screen.getByRole('button', { name: 'Finish guided' }))
    expect(screen.getByText('Finished')).toBeInTheDocument()
  })
  it('keeps other classroom lessons on their existing rendering', () => {
    render(<LessonContent lesson={{ ...lesson, id: 'other' } as never} isTeacher isClassroom />)
    expect(screen.getByText('Classic content')).toBeInTheDocument()
  })
})
