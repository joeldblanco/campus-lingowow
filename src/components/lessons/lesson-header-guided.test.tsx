import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LessonHeader } from './lesson-header'

const lesson = { title: 'This is me!', courseTitle: 'English', moduleTitle: 'Module 1', courseId: 'course-1', progress: 100 }

describe('guided lesson context header', () => {
  it('omits course and module breadcrumbs in the guided view while retaining unit context and exit', () => {
    render(<LessonHeader {...lesson} guidedAppearance />)
    expect(screen.queryByRole('navigation', { name: 'Ubicación de la lección' })).not.toBeInTheDocument()
    expect(screen.queryByText('English')).not.toBeInTheDocument()
    expect(screen.queryByText('Module 1')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This is me!')
    expect(screen.getByRole('link', { name: 'Volver al curso' })).toHaveAttribute('href', '/my-courses/course-1')
  })

  it('keeps the unit as small context without duplicating its title in a summary', () => {
    render(<LessonHeader {...lesson} guidedAppearance subtitle="Course summary" />)
    expect(screen.getAllByText('This is me!')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-sm')
    expect(screen.queryByText('Course summary')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lección completada')
    expect(screen.getByRole('link', { name: 'Volver al curso' })).toHaveAttribute('href', '/my-courses/course-1')
  })

  it('retains course and module breadcrumbs for classic lessons', () => {
    render(<LessonHeader {...lesson} />)
    expect(screen.getByRole('navigation', { name: 'Ubicación de la lección' })).toHaveTextContent('English')
    expect(screen.getByRole('navigation', { name: 'Ubicación de la lección' })).toHaveTextContent('Module 1')
  })

  it('retains the existing summary presentation for classic lessons', () => {
    render(<LessonHeader {...lesson} subtitle="Course summary" />)
    expect(screen.getByText('Course summary')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-lg')
  })
})
