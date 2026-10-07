import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { CourseView } from './course-view'

const originalMatchMedia = window.matchMedia

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  window.matchMedia = originalMatchMedia
})

type CourseModule = {
  id: string
  title: string
  order: number
  lessons: Array<{
    id: string
    title: string
    description: string | null
    order: number
    contents: Array<{ id: string; title: string; description: string | null; contentType: string; order: number }>
  }>
  _count: { lessons: number }
}

function makeModule(id: string, title: string, order: number, contentId: string): CourseModule {
  return {
    id,
    title,
    order,
    lessons: [
      {
        id: `${id}-lesson`,
        title: `${title} lesson`,
        description: null,
        order: 1,
        contents: [
          {
            id: contentId,
            title: `${title} content`,
            description: null,
            contentType: 'VIDEO',
            order: 1,
          },
        ],
      },
    ],
    _count: { lessons: 1 },
  }
}

function makeCourse(modules: CourseModule[], exams: unknown[] = []) {
  return {
    id: 'course-1',
    title: 'English A1',
    description: 'A long course description that should not be repeated here.',
    language: 'English',
    level: 'A1',
    isPersonalized: false,
    exams,
    createdBy: { name: 'Teacher' },
    modules,
    _count: { modules: modules.length, enrollments: 1 },
    isEnrolled: true,
    enrollment: {
      id: 'enrollment-1',
      status: 'ACTIVE',
      progress: 0,
      enrollmentDate: new Date('2026-01-01'),
      studentLessons: [],
    },
  }
}

function makeProgress(completedContentIds: string[], totalContents: number) {
  return {
    enrollment: {
      id: 'enrollment-1',
      status: 'ACTIVE',
      progress: totalContents ? (completedContentIds.length / totalContents) * 100 : 0,
      enrollmentDate: new Date('2026-01-01'),
    },
    totalContents,
    completedContents: completedContentIds.length,
    progressPercentage: totalContents ? (completedContentIds.length / totalContents) * 100 : 0,
    completedContentIds,
    completedActivities: [],
  }
}

describe('CourseView compact content', () => {
  it('shows the actual progress in a compact header without repeating the course description', () => {
    const moduleItem = makeModule('m1', 'Foundations', 1, 'c1')

    render(
      <CourseView
        course={makeCourse([moduleItem]) as never}
        progress={makeProgress(['c1'], 2)}
        moduleProgress={[
          {
            moduleId: 'm1',
            totalContents: 1,
            completedContents: 1,
            percentage: 100,
            isCompleted: true,
            isLocked: false,
            blockedByModuleId: null,
            order: 1,
          },
        ]}
      />
    )

    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('50% · 1 de 2')).toBeInTheDocument()
    expect(
      screen.queryByText('A long course description that should not be repeated here.')
    ).not.toBeInTheDocument()
  })

  it('uses exact module exam associations for the next step and keeps standalone exams ordered naturally', () => {
    const moduleItem = makeModule('m1', 'Foundations', 1, 'c1')
    const exams = [
      {
        id: 'standalone-10',
        title: 'Examen 10',
        description: null,
        timeLimit: 20,
        passingScore: 70,
        maxAttempts: 2,
        questionCount: 10,
        totalPoints: 10,
        isPublished: true,
        moduleId: null,
        isBlocking: false,
        hasPassed: false,
      },
      {
        id: 'module-exam',
        title: 'Evaluación final',
        description: null,
        timeLimit: 20,
        passingScore: 70,
        maxAttempts: 2,
        questionCount: 10,
        totalPoints: 10,
        isPublished: true,
        moduleId: 'm1',
        isBlocking: true,
        hasPassed: false,
      },
      {
        id: 'standalone-2',
        title: 'Examen 2',
        description: null,
        timeLimit: 20,
        passingScore: 70,
        maxAttempts: 2,
        questionCount: 10,
        totalPoints: 10,
        isPublished: true,
        moduleId: null,
        isBlocking: false,
        hasPassed: false,
      },
      {
        id: 'unrelated-module-exam',
        title: 'No debe aparecer en este módulo',
        description: null,
        timeLimit: 20,
        passingScore: 70,
        maxAttempts: 2,
        questionCount: 10,
        totalPoints: 10,
        isPublished: true,
        moduleId: 'other-module',
        isBlocking: true,
        hasPassed: false,
      },
    ]

    render(
      <CourseView
        course={makeCourse([moduleItem], exams) as never}
        progress={makeProgress(['c1'], 1)}
        moduleProgress={[
          {
            moduleId: 'm1',
            totalContents: 1,
            completedContents: 1,
            percentage: 100,
            isCompleted: true,
            isLocked: false,
            blockedByModuleId: null,
            order: 1,
          },
        ]}
      />
    )

    expect(
      screen.getAllByRole('link', { name: /tomar evaluación/i }).some(
        (link) => link.getAttribute('href') === '/exams/module-exam/take'
      )
    ).toBe(true)
    expect(screen.queryByText('No debe aparecer en este módulo')).not.toBeInTheDocument()

    const examTwo = screen.getByText('Examen 2')
    const examTen = screen.getByText('Examen 10')
    expect(examTwo.compareDocumentPosition(examTen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows module statuses and sends the next-step CTA to the first incomplete unlocked lesson', () => {
    const completed = makeModule('m1', 'Módulo 1', 1, 'c1')
    const available = makeModule('m2', 'Conversation', 2, 'c2')
    const locked = makeModule('m3', 'Módulo 3', 3, 'c3')

    render(
      <CourseView
        course={makeCourse([completed, available, locked]) as never}
        progress={makeProgress(['c1'], 3)}
        moduleProgress={[
          {
            moduleId: 'm1',
            totalContents: 1,
            completedContents: 1,
            percentage: 100,
            isCompleted: true,
            isLocked: false,
            blockedByModuleId: null,
            order: 1,
          },
          {
            moduleId: 'm2',
            totalContents: 1,
            completedContents: 0,
            percentage: 0,
            isCompleted: false,
            isLocked: false,
            blockedByModuleId: null,
            order: 2,
          },
          {
            moduleId: 'm3',
            totalContents: 1,
            completedContents: 0,
            percentage: 0,
            isCompleted: false,
            isLocked: true,
            blockedByModuleId: 'm2',
            order: 3,
          },
        ]}
      />
    )

    expect(
      screen.getAllByRole('link', { name: /comenzar/i }).some(
        (link) => link.getAttribute('href') === '/my-courses/course-1/lessons/m2-lesson'
      )
    ).toBe(true)
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Bloqueado')).toBeInTheDocument()
    expect(screen.getByText('Módulo 1')).toBeInTheDocument()
    expect(screen.queryByText('Módulo 3: Módulo 3')).not.toBeInTheDocument()
  })

  it('keeps the active module visible beyond the initial eight and reveals the rest accessibly', () => {
    const modules = Array.from({ length: 10 }, (_, index) =>
      makeModule(`m${index + 1}`, `Módulo ${index + 1}`, index + 1, `c${index + 1}`)
    )
    const moduleProgress = modules.map((module, index) => ({
      moduleId: module.id,
      totalContents: 1,
      completedContents: index < 8 ? 1 : 0,
      percentage: index < 8 ? 100 : 0,
      isCompleted: index < 8,
      isLocked: false,
      blockedByModuleId: null,
      order: index + 1,
    }))

    render(
      <CourseView
        course={makeCourse(modules) as never}
        progress={makeProgress(modules.slice(0, 8).map((module) => `${module.id.replace('m', 'c')}`), 10)}
        moduleProgress={moduleProgress}
      />
    )

    expect(screen.getAllByText('Módulo 9').length).toBeGreaterThan(0)
    expect(screen.queryByText('Módulo 10')).not.toBeInTheDocument()

    const showAll = screen.getByRole('button', { name: /mostrar todos/i })
    expect(showAll).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(showAll)
    expect(showAll).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Módulo 10')).toBeInTheDocument()
  })

  it('opens a newly active module when refreshed server progress changes the next step', () => {
    const first = makeModule('m1', 'Foundations', 1, 'c1')
    const second = makeModule('m2', 'Conversation', 2, 'c2')
    const course = makeCourse([first, second]) as never
    const progressBefore = makeProgress([], 2)
    const progressAfter = makeProgress(['c1'], 2)
    const moduleProgressBefore = [
      {
        moduleId: 'm1',
        totalContents: 1,
        completedContents: 0,
        percentage: 0,
        isCompleted: false,
        isLocked: false,
        blockedByModuleId: null,
        order: 1,
      },
      {
        moduleId: 'm2',
        totalContents: 1,
        completedContents: 0,
        percentage: 0,
        isCompleted: false,
        isLocked: false,
        blockedByModuleId: null,
        order: 2,
      },
    ]
    const moduleProgressAfter = moduleProgressBefore.map((module) =>
      module.moduleId === 'm1'
        ? { ...module, completedContents: 1, percentage: 100, isCompleted: true }
        : module
    )
    const { rerender } = render(
      <CourseView
        course={course}
        progress={progressBefore}
        moduleProgress={moduleProgressBefore}
      />
    )

    expect(screen.getByText('1. Foundations lesson')).toBeInTheDocument()
    expect(screen.queryByText('1. Conversation lesson')).not.toBeInTheDocument()

    rerender(
      <CourseView course={course} progress={progressAfter} moduleProgress={moduleProgressAfter} />
    )

    expect(screen.getByText('1. Conversation lesson')).toBeInTheDocument()
  })

  it('returns to and celebrates the server-confirmed lesson, including a final module beyond eight', async () => {
    const modules = Array.from({ length: 10 }, (_, index) =>
      makeModule(`m${index + 1}`, `Módulo ${index + 1}`, index + 1, `c${index + 1}`)
    )
    const moduleProgress = modules.map((module) => ({
      moduleId: module.id,
      totalContents: 1,
      completedContents: 1,
      percentage: 100,
      isCompleted: true,
      isLocked: false,
      blockedByModuleId: null,
      order: Number(module.id.slice(1)),
    }))
    window.history.replaceState({}, '', '/my-courses/course-1?completedLesson=m10-lesson')
    const scrollIntoView = vi.fn()
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(
      <CourseView
        course={makeCourse(modules) as never}
        progress={makeProgress(modules.map((module) => `${module.id.replace('m', 'c')}`), 10)}
        moduleProgress={moduleProgress}
      />
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lección completada'))
    expect(screen.getByText('Módulo 10')).toBeInTheDocument()
    expect(screen.getByText('1. Módulo 10 lesson').closest('[data-completion-target]')).toHaveAttribute(
      'data-completion-target',
      'true'
    )
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(focus).toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })

  it('clears invalid or unconfirmed markers without faking completion', async () => {
    const modules = Array.from({ length: 10 }, (_, index) =>
      makeModule(`m${index + 1}`, `Módulo ${index + 1}`, index + 1, `c${index + 1}`)
    )
    window.history.replaceState({}, '', '/my-courses/course-1?completedLesson=missing')

    render(
      <CourseView
        course={makeCourse(modules) as never}
        progress={makeProgress(['c1'], 10)}
        moduleProgress={modules.map((module, index) => ({
          moduleId: module.id,
          totalContents: 1,
          completedContents: index === 0 ? 1 : 0,
          percentage: index === 0 ? 100 : 0,
          isCompleted: index === 0,
          isLocked: false,
          blockedByModuleId: null,
          order: index + 1,
        }))}
      />
    )

    await waitFor(() => expect(window.location.search).toBe(''))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Módulo 10')).not.toBeInTheDocument()
  })

  it('uses automatic scrolling and keeps the completion message with reduced motion', async () => {
    const moduleItem = makeModule('m1', 'Foundations', 1, 'c1')
    window.history.replaceState({}, '', '/my-courses/course-1?completedLesson=m1-lesson')
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(
      <CourseView
        course={makeCourse([moduleItem]) as never}
        progress={makeProgress(['c1'], 1)}
        moduleProgress={[
          {
            moduleId: 'm1',
            totalContents: 1,
            completedContents: 1,
            percentage: 100,
            isCompleted: true,
            isLocked: false,
            blockedByModuleId: null,
            order: 1,
          },
        ]}
      />
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lección completada'))
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
    expect(screen.getByRole('status')).toBeVisible()
  })

  it('does not replay a consumed marker after the course view remounts', async () => {
    const moduleItem = makeModule('m1', 'Foundations', 1, 'c1')
    const props = {
      course: makeCourse([moduleItem]) as never,
      progress: makeProgress(['c1'], 1),
      moduleProgress: [
        {
          moduleId: 'm1',
          totalContents: 1,
          completedContents: 1,
          percentage: 100,
          isCompleted: true,
          isLocked: false,
          blockedByModuleId: null,
          order: 1,
        },
      ],
    }
    window.history.replaceState({}, '', '/my-courses/course-1?completedLesson=m1-lesson')

    render(<CourseView {...props} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lección completada'))
    cleanup()

    render(<CourseView {...props} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('waits for the target to settle in view before starting the success glow', async () => {
    const moduleItem = makeModule('m1', 'Foundations', 1, 'c1')
    window.history.replaceState({}, '', '/my-courses/course-1?completedLesson=m1-lesson')
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    let observeTarget: Element | undefined
    let intersectionCallback: IntersectionObserverCallback | undefined
    const originalIntersectionObserver = window.IntersectionObserver
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback
      }

      observe(target: Element) {
        observeTarget = target
      }

      disconnect() {}
      unobserve() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver

    render(
      <CourseView
        course={makeCourse([moduleItem]) as never}
        progress={makeProgress(['c1'], 1)}
        moduleProgress={[
          {
            moduleId: 'm1',
            totalContents: 1,
            completedContents: 1,
            percentage: 100,
            isCompleted: true,
            isLocked: false,
            blockedByModuleId: null,
            order: 1,
          },
        ]}
      />
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lección completada'))
    const target = screen.getByText('1. Foundations lesson').closest('[data-completion-target]')
    expect(target).toBe(observeTarget)
    expect(target).not.toHaveClass('course-completion-glow')

    await act(async () => {
      intersectionCallback?.(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(target).toHaveClass('course-completion-glow')
    window.IntersectionObserver = originalIntersectionObserver
  })
})
