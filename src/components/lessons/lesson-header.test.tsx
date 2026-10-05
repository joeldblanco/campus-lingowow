import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LessonHeader } from './lesson-header'

const lesson = {
  title: 'Saludos',
  courseTitle: 'Inglés',
  moduleTitle: 'Introducción',
  courseId: 'course-1',
}

describe('LessonHeader completion state', () => {
  it('shows the saved completion state when reopening a completed lesson', () => {
    render(<LessonHeader {...lesson} progress={100} />)

    expect(screen.getByRole('status')).toHaveTextContent('Lección completada')
  })

  it.each([0, 40])('does not mark a lesson at %i percent as completed', (progress) => {
    render(<LessonHeader {...lesson} progress={progress} />)

    expect(screen.queryByText('Lección completada')).not.toBeInTheDocument()
  })

  it('removes the completed marker when navigating to a pending lesson', () => {
    const { rerender } = render(<LessonHeader {...lesson} progress={100} />)

    expect(screen.getByRole('status')).toHaveTextContent('Lección completada')

    rerender(<LessonHeader {...lesson} title="Presentaciones" progress={0} />)

    expect(screen.queryByText('Lección completada')).not.toBeInTheDocument()
  })
})
