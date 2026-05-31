import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/teacher/exams/create-exam-dialog', () => ({
  CreateExamDialog: () => null,
}))
vi.mock('@/components/teacher/exams/exam-list', () => ({
  ExamList: () => null,
}))

import { TeacherCourseContentView } from './teacher-course-content-view'

function makeCourse(moduleDescription: string | null) {
  return {
    id: 'c1',
    title: 'Curso de prueba',
    description: 'Descripción del curso',
    language: 'en',
    level: 'A1',
    image: null,
    isPersonalized: false,
    isSynchronous: false,
    createdBy: { id: 'u1', name: 'Profe' },
    studentCount: 0,
    personalizedLessons: [],
    exams: [],
    modules: [
      {
        id: 'm1',
        title: 'Unidad 1',
        description: moduleDescription,
        level: 'A1',
        order: 1,
        lessons: [],
      },
    ],
  }
}

describe('TeacherCourseContentView — module description visibility', () => {
  it('renders the module description for teachers when present', () => {
    render(<TeacherCourseContentView course={makeCourse('Descripción de la unidad') as never} />)
    expect(screen.getByText('Descripción de la unidad')).toBeInTheDocument()
  })

  it('does not render a description node when the module has none', () => {
    render(<TeacherCourseContentView course={makeCourse(null) as never} />)
    expect(screen.queryByText('Descripción de la unidad')).not.toBeInTheDocument()
  })
})
