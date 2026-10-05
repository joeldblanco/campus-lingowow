import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: {
    data: { user: { id: 'student-1', name: 'ana maria' } } as {
      user?: { id: string; name: string }
    } | null,
  },
  dashboardData: { value: null as unknown },
  loadError: false,
  openClassroomWindow: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => mocks.session,
}))

vi.mock('@/lib/actions/dashboard', () => ({
  getStudentDashboardStats: vi.fn(() =>
    mocks.loadError
      ? Promise.reject(new Error('network'))
      : Promise.resolve(mocks.dashboardData.value)
  ),
}))

vi.mock('@/lib/open-classroom-window', () => ({
  openClassroomWindow: mocks.openClassroomWindow,
}))

vi.mock('@/components/enrollments/pending-schedule-banner', () => ({
  PendingScheduleBanner: () => <div data-testid="pending-schedule-banner" />,
}))

import Dashboard from './student-dashboard'
import type { StudentDashboardData } from '@/types/dashboard'

const baseDashboardData: StudentDashboardData = {
  activeCourses: 1,
  attendanceRate: 90,
  currentLevel: 2,
  totalPoints: 150,
  currentStreak: 4,
  longestStreak: 8,
  upcomingClasses: [],
  enrollments: [
    {
      id: 'enrollment-1',
      courseId: 'course-1',
      title: 'Inglés conversacional',
      image: null,
      progress: 42,
      teacherName: 'Ana Torres',
    },
  ],
}

function setDashboardData(overrides: Partial<StudentDashboardData> = {}) {
  mocks.dashboardData.value = { ...baseDashboardData, ...overrides }
}

describe('Student dashboard', () => {
  beforeEach(() => {
    setDashboardData()
    mocks.loadError = false
    mocks.session.data = { user: { id: 'student-1', name: 'ana maria' } }
    mocks.openClassroomWindow.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 5, 9, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the first name, course progress, real streak, and compact navigation actions', async () => {
    render(<Dashboard />)

    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument()
    expect(screen.getByText('Inglés conversacional')).toBeInTheDocument()
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Empezar curso|Continuar curso/i })).toHaveAttribute(
      'href',
      '/my-courses/course-1'
    )
    expect(screen.getByText('4 días')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Actividades' })).toHaveAttribute('href', '/activities')
    expect(screen.getByRole('link', { name: 'Grabaciones' })).toHaveAttribute('href', '/recordings')
    expect(screen.getByRole('link', { name: 'Biblioteca' })).toHaveAttribute('href', '/library')
    expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/materiales/i)).not.toBeInTheDocument()
  })

  it('shows continuation copy after progress and preserves the pending schedule banner', async () => {
    setDashboardData({ enrollments: [{ ...baseDashboardData.enrollments[0], progress: 0 }] })
    render(<Dashboard />)

    expect(await screen.findByRole('link', { name: 'Empezar curso' })).toBeInTheDocument()
    expect(screen.getByTestId('pending-schedule-banner')).toBeInTheDocument()

    setDashboardData({ enrollments: [{ ...baseDashboardData.enrollments[0], progress: 1 }] })
    render(<Dashboard />)
    expect(await screen.findByRole('link', { name: 'Continuar curso' })).toBeInTheDocument()
  })

  it('shows no shop access and offers scheduling when there are no enrollments or classes', async () => {
    setDashboardData({ enrollments: [], upcomingClasses: [], currentStreak: 0 })
    render(<Dashboard />)

    expect(await screen.findByText('Sin clases agendadas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agendar clase' })).toHaveAttribute('href', '/schedule')
    expect(
      screen.queryByRole('link', { name: /tienda|explorar cursos|inscríbete/i })
    ).not.toBeInTheDocument()
  })

  it('renders every remaining class today and opens the live classroom only when available', async () => {
    setDashboardData({
      upcomingClasses: [
        {
          course: 'Clase finalizada',
          teacher: 'Ana Torres',
          date: '2026-10-05',
          time: '07:00-08:00',
          link: '/classroom?classId=finished',
        },
        {
          course: 'Inglés avanzado',
          teacher: 'Luis Pérez',
          date: '2026-10-05',
          time: '09:00-10:00',
          link: '/classroom?classId=live',
        },
        {
          course: 'Práctica oral',
          teacher: 'Marta Ruiz',
          date: '2026-10-05',
          time: '11:00-12:00',
          link: '/classroom?classId=next',
        },
      ],
    })
    render(<Dashboard />)

    expect(await screen.findByText('Inglés avanzado')).toBeInTheDocument()
    expect(screen.getByText('Práctica oral')).toBeInTheDocument()
    expect(screen.queryByText('Clase finalizada')).not.toBeInTheDocument()
    const nextClassSection = screen
      .getByRole('heading', { name: 'Próxima clase' })
      .closest('section')
    const todayClassesSection = screen
      .getByRole('heading', { name: 'Clases de hoy' })
      .closest('section')
    expect(nextClassSection).not.toBeNull()
    expect(todayClassesSection).not.toBeNull()
    expect(
      within(nextClassSection as HTMLElement).getByRole('heading', { name: 'Inglés avanzado' })
    ).toBeInTheDocument()
    expect(
      within(todayClassesSection as HTMLElement).getByRole('heading', { name: 'Práctica oral' })
    ).toBeInTheDocument()
    const enterButton = screen.getByRole('button', { name: /Entrar a clase/i })
    fireEvent.click(enterButton)
    expect(mocks.openClassroomWindow).toHaveBeenCalledWith('/classroom?classId=live')
    expect(screen.getByText(/Tu clase empieza en 2 horas/i)).toBeInTheDocument()
  })

  it('shows the next future class with date, time, teacher, and schedule action', async () => {
    setDashboardData({
      upcomingClasses: [
        {
          course: 'Francés inicial',
          teacher: 'Sofía Lima',
          date: '2026-10-07',
          time: '18:30-19:30',
          link: '/classroom?classId=future',
        },
      ],
    })
    render(<Dashboard />)

    expect(await screen.findByText('Francés inicial')).toBeInTheDocument()
    expect(screen.getByText(/Sofía Lima/)).toBeInTheDocument()
    expect(screen.getByText(/7 de octubre/i)).toBeInTheDocument()
    expect(screen.getByText('6:30 p.m. - 7:30 p.m.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver horario' })).toHaveAttribute('href', '/schedule')
  })

  it('loads the dashboard data for the signed-in student', async () => {
    const { getStudentDashboardStats } = await import('@/lib/actions/dashboard')
    render(<Dashboard />)

    await waitFor(() => expect(getStudentDashboardStats).toHaveBeenCalledWith('student-1'))
  })

  it('shows an accessible retry state instead of pretending the dashboard is empty when loading fails', async () => {
    mocks.loadError = true
    render(<Dashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu dashboard')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Sin clases agendadas')).not.toBeInTheDocument()
  })
})
