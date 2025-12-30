'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Download,
  Flame,
  GraduationCap,
  Play,
  Puzzle,
  Trophy,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getStudentDashboardStats } from '@/lib/actions/dashboard'
import type { StudentDashboardData } from '@/types/dashboard'
import { PendingScheduleBanner } from '@/components/enrollments/pending-schedule-banner'

const levelColors: Record<string, string> = {
  'A1': 'bg-yellow-100 text-yellow-800',
  'A2': 'bg-orange-100 text-orange-800',
  'B1': 'bg-blue-100 text-blue-800',
  'B2': 'bg-indigo-100 text-indigo-800',
  'C1': 'bg-purple-100 text-purple-800',
  'C2': 'bg-pink-100 text-pink-800',
  'default': 'bg-slate-100 text-slate-800',
}

const getLevelColor = (level: string) => {
  const upperLevel = level?.toUpperCase() || ''
  for (const key of Object.keys(levelColors)) {
    if (upperLevel.includes(key)) return levelColors[key]
  }
  return levelColors['default']
}

export default function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

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
  const nextClass = dashboardData?.upcomingClasses?.[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            ¡Hola, {user?.name ?? 'Estudiante'}! 👋
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">No tienes cursos activos</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Para empezar a aprender, <Link href="/shop" className="underline font-medium">inscríbete en un curso</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de horarios pendientes */}
      <PendingScheduleBanner />

      {/* Hero Section: Resume Learning */}
      {currentEnrollment && (
        <div className="w-full">
          <div className="flex flex-col items-stretch justify-start rounded-xl overflow-hidden md:flex-row md:items-center shadow-md bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 group transition-all hover:shadow-lg">
            <div 
              className="w-full md:w-1/3 h-48 md:h-auto md:aspect-[4/3] bg-cover bg-center relative"
              style={{ backgroundImage: currentEnrollment.image ? `url("${currentEnrollment.image}")` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                Lección Actual
              </div>
            </div>
            <div className="flex w-full md:w-2/3 flex-col justify-center gap-3 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-primary text-sm font-bold uppercase tracking-wider mb-1">Continuar Aprendiendo</p>
                  <h2 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold leading-tight">
                    {currentEnrollment.title}
                  </h2>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
                  <span>Progreso</span>
                  <span>{Math.round(currentEnrollment.progress)}%</span>
                </div>
                <Progress value={currentEnrollment.progress} className="h-2.5" />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <Button asChild className="flex-1 md:flex-none md:w-48">
                  <Link href={`/my-courses/${currentEnrollment.courseId}`}>
                    {currentEnrollment.progress > 0 ? 'Continuar Lección' : 'Empezar Curso'}
                  </Link>
                </Button>
                <Button variant="outline" size="icon" title="Descargar Materiales">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div>
        <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/my-courses" className="flex flex-col items-center gap-3 bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/30 p-3 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-slate-900 dark:text-white text-sm font-medium">Mis Cursos</span>
          </Link>
          <Link href="/activities" className="flex flex-col items-center gap-3 bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="rounded-full bg-orange-50 dark:bg-orange-900/30 p-3 text-orange-600 dark:text-orange-400">
              <Puzzle className="w-5 h-5" />
            </div>
            <span className="text-slate-900 dark:text-white text-sm font-medium">Actividades</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center gap-3 bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="rounded-full bg-green-50 dark:bg-green-900/30 p-3 text-green-600 dark:text-green-400">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-slate-900 dark:text-white text-sm font-medium">Mi Horario</span>
          </Link>
          <Link href="/achievements" className="flex flex-col items-center gap-3 bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="rounded-full bg-purple-50 dark:bg-purple-900/30 p-3 text-purple-600 dark:text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-slate-900 dark:text-white text-sm font-medium">Logros</span>
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Courses (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 dark:text-white text-xl font-bold">Mis Cursos</h3>
            <Link href="/my-courses" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Ver Todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {dashboardData?.enrollments && dashboardData.enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.enrollments.slice(0, 4).map((enrollment) => (
                <div 
                  key={enrollment.id} 
                  className="flex flex-col bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div 
                    className="h-32 w-full bg-cover bg-center"
                    style={{ backgroundImage: enrollment.image ? `url("${enrollment.image}")` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getLevelColor('')}`}>
                        {enrollment.progress > 80 ? 'Avanzado' : enrollment.progress > 40 ? 'Intermedio' : 'Principiante'}
                      </span>
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-1 line-clamp-1">{enrollment.title}</h4>
                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400">{Math.round(enrollment.progress)}% Completado</span>
                      </div>
                      <Progress 
                        value={enrollment.progress} 
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">No estás inscrito en ningún curso.</p>
              <Button asChild>
                <Link href="/shop">Explorar Cursos</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Goals & Schedule (1/3 width) */}
        <div className="flex flex-col gap-6">
          {/* Daily Goals Widget */}
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Meta Diaria</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative size-16 flex-shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="text-primary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${Math.min((dashboardData?.totalPoints || 0) % 100, 100)}, 100`}
                    strokeWidth="4"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xs font-bold text-primary">{(dashboardData?.totalPoints || 0) % 100}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Nivel {dashboardData?.currentLevel || 1}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {dashboardData?.currentStreak || 0} días de racha <Flame className="w-3 h-3 text-orange-500" />
                </p>
              </div>
            </div>
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 mb-3">
              {dashboardData?.totalPoints || 0} XP totales
            </div>
            <Button variant="outline" className="w-full">
              Ver Estadísticas
            </Button>
          </div>

          {/* Upcoming Schedule Widget */}
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 dark:text-white text-lg font-bold">Próximas Clases</h3>
              <Link href="/calendar" className="text-slate-500 dark:text-slate-400 hover:text-primary">
                <Calendar className="w-5 h-5" />
              </Link>
            </div>
            
            {dashboardData?.upcomingClasses && dashboardData.upcomingClasses.length > 0 ? (
              <div className="flex flex-col gap-4">
                {dashboardData.upcomingClasses.slice(0, 2).map((classItem, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex flex-col items-center bg-white dark:bg-slate-700 rounded p-1.5 min-w-[50px] shadow-sm">
                      <span className="text-xs font-bold text-red-500 uppercase">
                        {format(new Date(classItem.date), 'EEE', { locale: es })}
                      </span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {format(new Date(classItem.date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {classItem.course}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {classItem.time} • {classItem.teacher}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No tienes clases próximas.
                </p>
              </div>
            )}

            {nextClass && (
              <Button className="w-full mt-4" asChild>
                <Link href={nextClass.link}>
                  <Play className="w-4 h-4 mr-2" />
                  Unirse a Clase
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
