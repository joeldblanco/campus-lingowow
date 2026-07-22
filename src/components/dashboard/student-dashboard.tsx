'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFirstName } from '@/lib/utils/name-formatter'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Download,
  Hand,
  Play,
  Puzzle,
  Video,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getStudentDashboardStats } from '@/lib/actions/dashboard'
import { openClassroomWindow } from '@/lib/open-classroom-window'
import type { StudentDashboardData } from '@/types/dashboard'
import { PendingScheduleBanner } from '@/components/enrollments/pending-schedule-banner'
import { CourseCard } from '@/components/dashboard/course-card'

import {
  isClassTimeReached,
  isClassFinished,
  getClassTimeLabel,
} from '@/lib/utils/class-timing'

function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return ''
  const parts = timeStr.split('-')
  const formattedParts = parts.map((part) => {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return trimmed
    let hours = Number(match[1])
    const minutes = match[2]
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`
  })
  return formattedParts.join(' - ')
}

export default function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Update current time every 30 seconds so the button appears automatically
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user?.id) {
        try {
          const data = await getStudentDashboardStats(session.user.id)
          setDashboardData(data)
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadDashboardData()
  }, [session])

  // Get the first enrollment for "Resume Learning" section
  const currentEnrollment = dashboardData?.enrollments?.[0]
  const todayStr = format(now, 'yyyy-MM-dd')
  const upcomingClasses = dashboardData?.upcomingClasses || []
  const todayClasses = upcomingClasses.filter(
    (c) => c.date === todayStr && !isClassFinished(c.date, c.time, now)
  )
  const hasClassToday = todayClasses.length > 0
  const classToday = todayClasses[0]
  const canJoinClass = classToday
    ? isClassTimeReached(classToday.date, classToday.time, now)
    : false
  const futureClasses = upcomingClasses.filter((c) => c.date !== todayStr && !isClassFinished(c.date, c.time, now))

  // Compute live class countdown label
  const timeLabel = classToday ? getClassTimeLabel(classToday.date, classToday.time, now) : ''

  // Compute Paso 3 roadmap metadata
  let paso3Title = 'Agenda tu próxima clase'
  let paso3Description = 'Reserva una sesión en vivo con tu profesor/a para seguir practicando.'
  let paso3ActionText = 'Ir a mi Horario'

  if (futureClasses.length > 0) {
    const futureClass = futureClasses[0]
    const rawDay = format(parseISO(futureClass.date), 'EEEE d', { locale: es })
    const capitalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1)
    paso3Title = `Clase del ${capitalizedDay}`
    paso3Description = `Sesión en vivo con ${futureClass.teacher} programada a las ${formatTimeTo12Hour(futureClass.time)}.`
    paso3ActionText = 'Ver detalles de clase'
  }

  // Construct dynamic roadmap steps array
  const steps: {
    type: 'class' | 'quiz' | 'next-class'
    title: string
    description: string
    actionText: string
    actionUrl: string
    tag: string
  }[] = []

  // 1. If hasClassToday, add all remaining classes today (index 1 to N-1)
  if (hasClassToday && todayClasses.length > 1) {
    for (let i = 1; i < todayClasses.length; i++) {
      const c = todayClasses[i]
      steps.push({
        type: 'class',
        title: c.course,
        description: `Sesión en vivo con ${c.teacher} programada a las ${formatTimeTo12Hour(c.time)}.`,
        actionText: 'Ver detalles de clase',
        actionUrl: '/schedule',
        tag: 'Luego',
      })
    }
  }

  // 2. Add Quiz de comprensión (Activities)
  steps.push({
    type: 'quiz',
    title: 'Quiz de comprensión',
    description: 'Refuerza vocabulario y gramática con actividades interactivas en tu panel.',
    actionText: 'Practicar Actividades',
    actionUrl: currentEnrollment ? `/my-courses/${currentEnrollment.courseId}` : '',
    tag: steps.length === 0 ? 'Luego' : 'Después',
  })

  // 3. Add Siguiente clase (other days / Booking reminder)
  steps.push({
    type: 'next-class',
    title: paso3Title,
    description: paso3Description,
    actionText: paso3ActionText,
    actionUrl: '/schedule',
    tag: 'Después',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto" data-tour="dashboard">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-3xl md:text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            ¡Hola, {formatFirstName(user?.name) || 'Estudiante'}!
            <Hand className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 rotate-45 shrink-0" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            ¿Listo para continuar tu aprendizaje hoy?
          </p>
        </div>
      </div>

      {/* Notification for students with no active enrollments */}
      {dashboardData?.enrollments && dashboardData.enrollments.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-yellow-600 dark:text-yellow-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                No tienes cursos activos
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Para empezar a aprender,{' '}
                <Link href="/shop" className="underline font-medium">
                  inscríbete en un curso
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de horarios pendientes */}
      <PendingScheduleBanner />

      {/* Left-aligned Roadmap Flow Layout */}
      <div className="max-w-5xl w-full flex flex-col gap-8">
        {/* Roadmap Vertical Container */}
        <div className="relative pl-6 md:pl-10 space-y-8 mt-6">
          {/* The past connector line */}
          <div className="absolute left-[9px] md:left-[21px] top-[-24px] h-[34px] w-0.5 bg-gradient-to-b from-transparent to-emerald-500" />

          {/* Completed Past Step Indicator */}
          <div className="absolute left-[-2px] md:left-[10px] top-[-36px] flex items-center justify-center size-6 rounded-full border border-emerald-500 bg-emerald-500/10 text-emerald-500 opacity-60">
            <Check className="w-3.5 h-3.5" />
          </div>

          {/* Paso 1: Focus Card */}
          <div className="relative pl-4">
            {/* Connector line segment inside Paso 1 */}
            <div className="absolute left-[-15px] md:left-[-19px] top-6 bottom-[-32px] w-0.5 bg-gradient-to-b from-emerald-500 via-[#137fec] to-slate-200 dark:to-slate-800" />

            {/* Circle node dot */}
            <div className="absolute left-[-29px] md:left-[-33px] top-4 z-10 flex items-center justify-center size-8 rounded-full border-2 border-primary bg-white dark:bg-slate-900 shadow-md">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
              </span>
            </div>

            {hasClassToday && classToday ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#137fec] via-indigo-600 to-violet-600 p-1 shadow-lg shadow-[#137fec]/25">
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 rounded-xl bg-gradient-to-r from-[#137fec] via-indigo-600 to-violet-600 p-6 md:p-8">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                  <div className="relative flex items-center gap-4 md:gap-6">
                    <div className="flex-shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm p-4">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-white">
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white mb-3">
                        {canJoinClass ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {(() => {
                          const start = classToday.time.includes('-')
                            ? classToday.time.split('-')[0].trim()
                            : classToday.time.trim()
                          const [hours, minutes] = start.split(':').map(Number)
                          const [year, month, day] = classToday.date.split('-').map(Number)
                          const classDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
                          const diffMinutes = Math.round(
                            (classDateTime.getTime() - now.getTime()) / 60000
                          )
                          if (canJoinClass) return 'Ahora: ¡Tu clase está lista! Entra ahora'
                          if (diffMinutes > 0 && diffMinutes <= 60)
                            return `Ahora: Entra a tu clase en ${diffMinutes} min`
                          return 'Ahora: Prepárate para tu clase de hoy'
                        })()}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black mb-1 tracking-tight">
                        {classToday.course}
                      </h2>
                      <p className="text-white/80 font-medium mb-3">con {classToday.teacher}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/90 bg-black/10 backdrop-blur-sm px-3 py-2 rounded-lg w-fit">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Calendar className="w-4 h-4 text-emerald-300" />
                          {format(parseISO(classToday.date), "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold border-l border-white/20 pl-4">
                          <Clock className="w-4 h-4 text-emerald-300" />
                          {formatTimeTo12Hour(classToday.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canJoinClass ? (
                    <Button
                      size="lg"
                      className="relative w-full md:w-auto bg-white text-indigo-700 hover:bg-white/95 hover:text-indigo-800 font-extrabold text-base md:text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-[0_0_25px_rgba(255,255,255,0.7)] transition-all hover:scale-105"
                      onClick={() => openClassroomWindow(classToday.link)}
                    >
                      <Play className="w-5 h-5 mr-2 fill-current text-indigo-600 animate-pulse" />
                      ¡Entrar a Clase ahora!
                    </Button>
                  ) : (
                    <div className="relative w-full md:w-auto flex items-center gap-2 bg-white/25 backdrop-blur-sm text-white font-semibold text-sm md:text-base px-6 py-4 rounded-xl border border-white/10 shadow-inner">
                      <Clock className="w-5 h-5 text-emerald-300 animate-pulse" />
                      <span>{timeLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-[#137fec]/20 p-6 md:p-8 shadow-xl shadow-slate-900/10">
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-[#137fec]/20 border border-[#137fec]/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-primary">
                      <BookOpen className="w-3.5 h-3.5" />
                      {(() => {
                        const teacherName =
                          currentEnrollment?.teacherName ||
                          (nextClass?.teacher ? nextClass.teacher : null)
                        return `Ahora: Practica lo aprendido ${teacherName ? `con ${teacherName}` : ''}`
                      })()}
                    </div>

                    {currentEnrollment ? (
                      <>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                            Sigue avanzando en {currentEnrollment.title}
                          </h2>
                          <p className="text-slate-400 text-sm mt-1">
                            {currentEnrollment.teacherName
                              ? `Tu profesor asignado es ${currentEnrollment.teacherName}`
                              : 'Continúa con tus lecciones personalizadas.'}
                          </p>
                        </div>

                        <div className="space-y-2 max-w-md">
                          <div className="flex justify-between text-sm font-semibold text-slate-300">
                            <span>Progreso del curso</span>
                            <span>{Math.round(currentEnrollment.progress)}%</span>
                          </div>
                          <Progress
                            value={currentEnrollment.progress}
                            className="h-2.5 bg-slate-800"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                          Comienza tu camino de aprendizaje
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                          Inscríbete en un curso y comienza a aprender un nuevo idioma con los
                          mejores profesores.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-auto flex-shrink-0">
                    {currentEnrollment ? (
                      <div className="flex items-center gap-3 w-full">
                        <Button
                          asChild
                          size="lg"
                          className="w-full md:w-auto bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg transition-all hover:scale-105"
                        >
                          <Link href={`/my-courses/${currentEnrollment.courseId}`}>
                            {currentEnrollment.progress > 0 ? 'Continuar Lección' : 'Empezar Curso'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Descargar Materiales"
                          className="border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white h-12 w-12 rounded-xl"
                        >
                          <Download className="w-5 h-5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        asChild
                        size="lg"
                        className="w-full md:w-auto bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg transition-all hover:scale-105"
                      >
                        <Link href="/shop">
                          Explorar Cursos
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Roadmap Steps */}
          {steps.map((step, index) => {
            const stepNum = index + 2
            const isLast = index === steps.length - 1

            return (
              <div key={index} className="relative pl-4">
                {/* Connector line segment */}
                <div
                  className={`absolute left-[-15px] md:left-[-19px] top-0 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-700 ${
                    isLast ? 'h-10' : 'bottom-[-32px]'
                  }`}
                />

                {/* Circle node dot */}
                <div className="absolute left-[-27px] md:left-[-31px] top-5 z-10 flex items-center justify-center size-7 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 font-bold text-xs">
                  {stepNum}
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-4 items-start">
                    <div
                      className={`rounded-xl p-3 h-fit flex-shrink-0 ${
                        step.type === 'class'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                          : step.type === 'quiz'
                            ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-primary'
                      }`}
                    >
                      {step.type === 'class' ? (
                        <Video className="w-5 h-5" />
                      ) : step.type === 'quiz' ? (
                        <Puzzle className="w-5 h-5" />
                      ) : (
                        <Calendar className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          step.type === 'class'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : step.type === 'quiz'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-primary'
                        }`}
                      >
                        {step.tag}
                      </span>
                      <h5 className="text-slate-900 dark:text-white font-bold text-base mt-0.5">
                        {step.title}
                      </h5>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {step.actionUrl && (
                    <Button
                      asChild
                      variant="outline"
                      className={`w-full md:w-auto rounded-xl ${
                        step.type === 'class'
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
                          : step.type === 'quiz'
                            ? 'border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-950/20'
                            : 'border-blue-200 text-primary hover:bg-blue-50 dark:border-blue-900/30 dark:text-primary dark:hover:bg-blue-950/20'
                      }`}
                    >
                      <Link
                        href={step.actionUrl}
                        className="font-semibold inline-flex items-center gap-1"
                      >
                        {step.actionText} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mis Cursos (Condicionado a > 1 activo) */}
        {dashboardData?.enrollments && dashboardData.enrollments.length > 1 && (
          <div className="flex flex-col gap-6 mt-8">
            <div className="flex items-center justify-between" data-tour="my-courses">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold">Mis Cursos</h3>
              <Link
                href="/my-courses"
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
              >
                Ver Todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.enrollments.slice(0, 4).map((enrollment) => (
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
          </div>
        )}
      </div>
    </div>
  )
}
