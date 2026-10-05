import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CourseView } from './course-view'

describe('CourseView published lesson counts', () => {
  it('counts the four visible lessons rather than the 32 including drafts', () => {
    const lessons = [5, 4, 4, 4].map((contentCount, index) => ({
      id: `lesson-${index}`,
      title: `Lección ${index + 1}`,
      description: null,
      order: index,
      contents: Array.from({ length: contentCount }, (_, contentIndex) => ({
        id: `content-${index}-${contentIndex}`,
        title: 'Contenido',
        description: null,
        contentType: 'TEXT',
        order: contentIndex,
      })),
    }))

    render(
      <CourseView
        course={{
          id: 'course-1',
          title: 'Curso',
          description: null,
          language: 'english',
          level: 'A1',
          createdBy: { name: 'Profesor' },
          isEnrolled: true,
          modules: [{
            id: 'module-1',
            title: 'Módulo 1',
            level: 'A1',
            order: 1,
            isPublished: true,
            lessons,
            _count: { lessons: 32 },
          }],
          _count: { modules: 1, enrollments: 1 },
        }}
      />
    )

    expect(screen.getByText('0 de 17 contenidos • 4 lecciones')).toBeInTheDocument()
    expect(screen.queryByText(/32 lecciones/)).not.toBeInTheDocument()
  })
})
