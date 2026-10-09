import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LessonContent } from './lesson-content'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/actions/lessons', () => ({ completeCourseLesson: vi.fn() }))
vi.mock('@/lib/content-mapper', () => ({ mapContentToBlock: (content: unknown) => content }))
vi.mock('@/components/admin/course-builder/lesson-builder/block-preview', () => ({
  BlockPreview: () => <div>Classic content</div>,
}))
vi.mock('./guided-lesson-viewer', () => ({
  GuidedLessonViewer: ({ isTeacher, unitOneAuthored }: { isTeacher?: boolean; unitOneAuthored?: boolean }) =>
    <div data-testid="course-viewer" data-teacher={Boolean(isTeacher)} data-unit-one={Boolean(unitOneAuthored)} />,
}))

describe('reviewed course guided teaching', () => {
  it('opens the authored curriculum revision from the actual teacher lesson entry point', () => {
    render(<LessonContent lesson={{ id: 'cmkpx0d310001gy04zr4lq99y', title: 'Behaving properly', activities: [],
      module: { course: { id: 'cmjnr0g5x0001jp04fsw2fejs' } },
      contents: [{ id: 'pilot-row', data: { type: 'text', data: { learningRevision: 'curriculum-pilot-v1' } } }],
    } as never} isTeacher />)
    expect(screen.getByTestId('course-viewer')).toHaveAttribute('data-teacher', 'true')
    expect(screen.queryByText('Classic content')).not.toBeInTheDocument()
  })
  const reviewed = {
    id: 'unit-two', title: 'I come from', activities: [],
    module: { course: { id: 'cmjnr0g5x0001jp04fsw2fejs' } },
    contents: [{ id: 'native-row', data: { type: 'text', data: { learningRevision: 'course-guided-v1' } } }],
  }

  it('uses the reviewed composition for the teacher without Unit 1 character assumptions', () => {
    render(<LessonContent lesson={reviewed as never} isTeacher />)
    expect(screen.getByTestId('course-viewer')).toHaveAttribute('data-teacher', 'true')
    expect(screen.getByTestId('course-viewer')).toHaveAttribute('data-unit-one', 'false')
  })

  it('leaves an unconverted presentation in its existing viewer', () => {
    render(<LessonContent lesson={{ ...reviewed, contents: [{ id: 'embed', data: { type: 'embed' } }] } as never} isTeacher />)
    expect(screen.queryByTestId('course-viewer')).not.toBeInTheDocument()
    expect(screen.getByText('Classic content')).toBeInTheDocument()
  })
})
