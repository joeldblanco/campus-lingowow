import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LessonPage from '@/app/(private)/my-courses/[courseId]/lessons/[lessonId]/page'
import { auth } from '@/auth'
import { getLessonForStudent, getCourseLessonNavigation } from '@/lib/actions/lessons'
import { getCourseModuleProgress } from '@/lib/actions/courses'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/actions/lessons', () => ({ getLessonForStudent: vi.fn(), getCourseLessonNavigation: vi.fn() }))
vi.mock('@/lib/actions/courses', () => ({ getCourseModuleProgress: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`) }, notFound: () => { throw new Error('not-found') } }))
vi.mock('./lesson-header', () => ({ LessonHeader: () => null }))
vi.mock('./lesson-loading-skeleton', () => ({ LessonLoadingSkeleton: () => null }))
vi.mock('./lesson-content', () => ({ LessonContent: ({ guidedStorageKey }: { guidedStorageKey?: string }) => <div data-testid="viewer">{guidedStorageKey || 'classic'}</div> }))

const courseId = 'cmjnr0g5x0001jp04fsw2fejs'
const lessonId = 'cmk4otvgp0001w1p4ijdkv6i2'
const lesson = { id: lessonId, title: 'This is me!', module: { id: 'module', title: 'Module', course: { title: 'Course' } } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: 'student-a' } } as never)
  vi.mocked(getLessonForStudent).mockResolvedValue(lesson as never)
  vi.mocked(getCourseLessonNavigation).mockResolvedValue({ prevLessonId: null, nextLessonId: null, isCompleted: false } as never)
  vi.mocked(getCourseModuleProgress).mockResolvedValue([])
})

describe('guided pilot page access and identity', () => {
  it('uses the authenticated student identity only after the course access query', async () => {
    render(await LessonPage({ params: Promise.resolve({ courseId, lessonId }) }))
    expect(getLessonForStudent).toHaveBeenCalledWith(lessonId, courseId, 'student-a')
    expect(screen.getByTestId('viewer')).toHaveTextContent(`lingowow:guided-lesson:v1:student-a:${courseId}:${lessonId}`)
  })

  it('keeps a different lesson classic even when its title matches', async () => {
    render(await LessonPage({ params: Promise.resolve({ courseId, lessonId: 'other-lesson' }) }))
    expect(screen.getByTestId('viewer')).toHaveTextContent('classic')
  })

  it('does not enable the pilot through a locked module', async () => {
    vi.mocked(getCourseModuleProgress).mockResolvedValue([{ moduleId: 'module', isLocked: true }] as never)
    await expect(LessonPage({ params: Promise.resolve({ courseId, lessonId }) })).rejects.toThrow(`redirect:/my-courses/${courseId}`)
  })

  it('does not render a lesson the student cannot access', async () => {
    vi.mocked(getLessonForStudent).mockResolvedValue(null)
    await expect(LessonPage({ params: Promise.resolve({ courseId, lessonId }) })).rejects.toThrow('not-found')
  })
})
