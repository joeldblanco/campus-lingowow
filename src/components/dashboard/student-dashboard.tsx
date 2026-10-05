'use client'

import { CourseCard } from '@/components/dashboard/course-card'
import { PendingScheduleBanner } from '@/components/enrollments/pending-schedule-banner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getStudentDashboardStats } from '@/lib/actions/dashboard'
import { openClassroomWindow } from '@/lib/open-classroom-window'
import { getClassTimeLabel, isClassFinished, isClassTimeReached } from '@/lib/utils/class-timing'
import { formatFirstName } from '@/lib/utils/name-formatter'
import type { StudentDashboardData } from '@/types/dashboard'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, CalendarDays, Clock3, Library, Play, Shapes, Video } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return ''

  return timeStr
    .split('-')
    .map((part) => {
      const trimmed = part.trim()
      const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
      if (!match) return trimmed

      let hours = Number(match[1])
      const minutes = match[2]
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.'
      hours %= 12
      hours = hours || 12
      return `${hours}:${minutes} ${ampm}`
    })
    .join(' - ')
}

function formatClassDate(date: string): string {
  const value = format(parseISO(date), "d 'de' MMMM", { locale: es })
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getFirstName(name?: string | null): string {
  return formatFirstName(name).trim().split(/\s+/)[0] || 'Estudiante'
}

type DashboardClass = StudentDashboardData['upcomingClasses'][number]

function ClassDetails({ classItem }: { classItem: DashboardClass }) {
  return (
    <div className="min-w-0">
      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
        {classItem.course}
      </h3>
      <p className="truncate text-sm text-slate-600 dark:text-slate-300">Con {classItem.teacher}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <time dateTime={`${classItem.date}T${classItem.time.split('-')[0].trim()}`}>
            {formatClassDate(classItem.date)}
          </time>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <span>{formatTimeTo12Hour(classItem.time)}</span>
        </span>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Shapes
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-card-dark dark:text-slate-200"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <ArrowRight
        className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}

export default function Dashboard() {
  const { data: session } = useSession()
  const sessionResolved = session !== undefined
  const userId = session?.user?.id
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true

    if (!sessionResolved) {
      return () => {
        active = false
      }
    }

    if (!userId) {
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)
    setError(false)
    getStudentDashboardStats(userId)
      .then((data) => {
        if (active) {
          setDashboardData(data)
          setError(false)
        }
      })
      .catch((error) => {
        console.error('Error loading dashboard data:', error)
        if (active) {
          setDashboardData(null)
          setError(true)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [retryCount, userId, sessionResolved])

  if (loading) {
    return (
      <div
        className="flex min-h-[320px] items-center justify-center bg-slate-50 dark:bg-slate-950"
        role="status"
        aria-label="Cargando dashboard"
      >
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <span className="sr-only">Cargando dashboard</span>
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-full bg-slate-50 dark:bg-slate-950" data-tour="dashboard">
        <div className="mx-auto flex min-h-[320px] w-full max-w-2xl items-center justify-center p-4 md:p-6">
          <div
            role="alert"
            className="w-full rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm"
          >
            <h1 className="text-lg font-semibold text-slate-950 dark:text-white">
              No pudimos cargar tu dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Inténtalo de nuevo.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const user = session?.user
  const enrollments = dashboardData?.enrollments ?? []
  const currentEnrollment = enrollments[0]
  const upcomingClasses = dashboardData?.upcomingClasses ?? []
  const today = format(now, 'yyyy-MM-dd')
  const todayClasses = upcomingClasses.filter(
    (classItem) => classItem.date === today && !isClassFinished(classItem.date, classItem.time, now)
  )
  const futureClasses = upcomingClasses.filter(
    (classItem) => classItem.date !== today && !isClassFinished(classItem.date, classItem.time, now)
  )
  const nextClass = todayClasses[0] ?? futureClasses[0]
  const courseProgress = currentEnrollment
    ? Math.min(100, Math.max(0, currentEnrollment.progress))
    : 0
  const progressLabel = Math.round(courseProgress)

  return (
    <main className="min-h-full bg-slate-50 dark:bg-slate-950" data-tour="dashboard">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-6 md:p-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white md:text-3xl">
            Hola, {getFirstName(user?.name)}
          </h1>
        </header>

        <PendingScheduleBanner />

        <div className="grid gap-5 lg:grid-cols-2">
          <section
            aria-labelledby="current-course-heading"
            data-tour="student-course"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card-dark md:p-6"
          >
            {currentEnrollment ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Curso actual
                    </p>
                    <h2
                      id="current-course-heading"
                      className="text-xl font-bold text-slate-950 dark:text-white md:text-2xl"
                    >
                      {currentEnrollment.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Profesor: {currentEnrollment.teacherName || 'Sin profesor asignado'}
                    </p>
                  </div>
                  <Button asChild className="w-full shrink-0 md:w-auto">
                    <Link href={`/my-courses/${currentEnrollment.courseId}`}>
                      {courseProgress > 0 ? 'Continuar curso' : 'Empezar curso'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>Progreso</span>
                    <span>{progressLabel}%</span>
                  </div>
                  <Progress
                    value={courseProgress}
                    aria-label={`Progreso del curso: ${progressLabel}%`}
                    className="h-2"
                  />
                </div>
              </>
            ) : (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mis cursos
                </p>
                <h2
                  id="current-course-heading"
                  className="text-xl font-bold text-slate-950 dark:text-white"
                >
                  No tienes cursos activos
                </h2>
              </div>
            )}
          </section>

          <section
            aria-labelledby="next-class-heading"
            className="order-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card-dark md:p-6 lg:order-2"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="next-class-heading"
                className="text-lg font-bold text-slate-950 dark:text-white"
              >
                Próxima clase
              </h2>
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            {nextClass ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <ClassDetails classItem={nextClass} />
                <div className="shrink-0 sm:pt-1">
                  {todayClasses[0] === nextClass &&
                  isClassTimeReached(nextClass.date, nextClass.time, now) ? (
                    <Button
                      onClick={() => openClassroomWindow(nextClass.link)}
                      className="w-full sm:w-auto"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      Entrar a clase
                    </Button>
                  ) : todayClasses[0] === nextClass ? (
                    <span className="inline-flex min-h-9 items-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
                      {getClassTimeLabel(nextClass.date, nextClass.time, now)}
                    </span>
                  ) : (
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/schedule">Ver horario</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Sin clases agendadas
                </p>
                <Button asChild variant="outline">
                  <Link href="/schedule">Agendar clase</Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <section
            aria-labelledby="streak-heading"
            className="order-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card-dark md:p-6 lg:order-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Racha
            </p>
            <h2
              id="streak-heading"
              className="mt-2 text-3xl font-bold text-slate-950 dark:text-white"
            >
              {dashboardData?.currentStreak ?? 0}{' '}
              {dashboardData?.currentStreak === 1 ? 'día' : 'días'}
            </h2>
          </section>

          <section
            aria-labelledby="quick-actions-heading"
            className="order-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card-dark md:p-6 lg:order-1"
          >
            <h2
              id="quick-actions-heading"
              className="text-lg font-bold text-slate-950 dark:text-white"
            >
              Actividades
            </h2>
            <Link
              href="/activities"
              aria-label="Actividades"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Ir a actividades <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>

        {todayClasses.length > 1 && (
          <section
            aria-labelledby="today-classes-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-card-dark md:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="today-classes-heading"
                className="text-lg font-bold text-slate-950 dark:text-white"
              >
                Clases de hoy
              </h2>
              <Link href="/schedule" className="text-sm font-medium text-primary hover:underline">
                Ver horario
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {todayClasses.slice(1).map((classItem, index) => {
                const canJoin = isClassTimeReached(classItem.date, classItem.time, now)
                return (
                  <li
                    key={`${classItem.date}-${classItem.time}-${classItem.course}-${index}`}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <ClassDetails classItem={classItem} />
                    {canJoin ? (
                      <Button
                        onClick={() => openClassroomWindow(classItem.link)}
                        size="sm"
                        className="w-full shrink-0 sm:w-auto"
                      >
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                        Entrar a clase
                      </Button>
                    ) : (
                      <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-right">
                        {getClassTimeLabel(classItem.date, classItem.time, now)}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <nav aria-label="Recursos" className="grid gap-3 sm:grid-cols-2">
          <QuickAction href="/recordings" label="Grabaciones" icon={Video} />
          <QuickAction href="/library" label="Biblioteca" icon={Library} />
        </nav>

        {enrollments.length > 1 && (
          <section aria-labelledby="other-courses-heading" data-tour="my-courses">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="other-courses-heading" className="text-lg font-bold text-slate-950">
                Mis cursos
              </h2>
              <Link href="/my-courses" className="text-sm font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.slice(0, 4).map((enrollment) => (
                <CourseCard
                  key={enrollment.id}
                  id={enrollment.courseId}
                  title={enrollment.title}
                  image={enrollment.image}
                  progress={enrollment.progress}
                  role="student"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
