'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TeacherDashboardData } from '@/types/dashboard'
import {
  Activity,
  Calendar as CalendarIcon,
  DollarSign,
  Edit,
  MoreVertical,
  Plus,
  Users,
  Video,
  BookOpen,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo } from 'react'

// Helper to check if class is within 10 minutes of starting
function isWithin10MinutesOfStart(classDate: string, classTime: string): boolean {
  const now = new Date()
  const [hours, minutes] = classTime.split(':').map(Number)
  const [year, month, day] = classDate.split('-').map(Number)
  const classDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  const diffMs = classDateTime.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  // Can join if within 10 minutes before or up to 60 minutes after start
  return diffMinutes <= 10 && diffMinutes >= -60
}

// Helper to check if class is today
function isToday(classDate: string): boolean {
  const today = new Date()
  const [year, month, day] = classDate.split('-').map(Number)
  return (
    today.getFullYear() === year &&
    today.getMonth() === month - 1 &&
    today.getDate() === day
  )
}

const TeacherDashboard = ({ dashboardData }: { dashboardData: TeacherDashboardData | null }) => {
  const { data: session } = useSession()
  const router = useRouter()
  const userName = session?.user?.name || 'Profesor'

  // Filter classes to only show today's classes
  const todaysClasses = useMemo(() => {
    if (!dashboardData) return []
    return dashboardData.upcomingClasses.filter(c => isToday(c.date))
  }, [dashboardData])

  if (!dashboardData) return <div>Cargando datos...</div>

  // Funciones de navegación
  const handleStartClass = (classId: string) => router.push(`/classroom?classId=${classId}`)
  const handlePrepareClass = (courseId: string) => router.push(`/admin/courses/${courseId}/edit`)
  const handleNewActivity = () => router.push('/activities')
  const handleEditSchedule = () => router.push('/schedule')
  const handleViewAllSchedule = () => router.push('/schedule')
  
  // Obtener la próxima clase para el botón de acción rápida (only if within 10 minutes)
  const nextClass = todaysClasses.find(c => isWithin10MinutesOfStart(c.date, c.time))

  // Obtener fecha actual
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Estilos de tarjetas
  const cardStyle =
    'bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5'

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Buenos días, {userName}.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Tienes {todaysClasses.length} {todaysClasses.length === 1 ? 'clase' : 'clases'} hoy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hidden md:flex gap-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </Button>
          <Button onClick={handleViewAllSchedule} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border-0 font-medium px-4">
            Ver Horario Completo
          </Button>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Asistencia Semanal */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Asistencia Semanal
            </span>
            <CalendarIcon className="w-5 h-5 text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-1 rounded-md box-content" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {dashboardData.weeklyAttendance.percentage}%
            </span>
            <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-none px-1.5 py-0.5 mb-1 text-[10px] font-bold">
              +{dashboardData.weeklyAttendance.trend}%
            </Badge>
          </div>
        </div>

        {/* Ganancias del Período */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Ganancias del Mes
            </span>
            <DollarSign className="w-5 h-5 text-green-500 bg-green-50 dark:bg-green-900/20 p-1 rounded-md box-content" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              ${dashboardData.periodEarnings.amount.toFixed(2)}
            </span>
            {dashboardData.periodEarnings.trend !== 0 && (
              <Badge className={`${dashboardData.periodEarnings.trend >= 0 ? 'bg-green-100 hover:bg-green-100 text-green-700' : 'bg-red-100 hover:bg-red-100 text-red-700'} border-none px-1.5 py-0.5 mb-1 text-[10px] font-bold`}>
                {dashboardData.periodEarnings.trend >= 0 ? '+' : ''}{dashboardData.periodEarnings.trend}%
              </Badge>
            )}
          </div>
        </div>

        {/* Estudiantes Activos */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Estudiantes Activos
            </span>
            <Users className="w-5 h-5 text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-1 rounded-md box-content" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {dashboardData.activeStudents.count}
            </span>
            {/* Assuming trending up generally */}
            <span className="text-xs text-slate-400 mb-1 font-medium">Estudiantes totales</span>
          </div>
        </div>

        {/* Mensajes sin leer */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Mensajes sin leer
            </span>
            <Activity className="w-5 h-5 text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-1 rounded-md box-content" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {dashboardData.unreadMessages.count}
            </span>
            <button className="text-xs text-blue-500 hover:text-blue-600 font-bold mb-1 ml-auto">
              Ver todos
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Schedule */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Horario de Hoy</h3>
              <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg capitalize">
                {today}
              </span>
            </div>
            <div className="p-6 space-y-8 relative">
              {/* Timeline Line */}
              <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>

              {todaysClasses.length > 0 ? (
                todaysClasses.map((item) => {
                  const canJoin = isWithin10MinutesOfStart(item.date, item.time)
                  return (
                    <div key={item.id} className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 z-10">

                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 border-4 border-white dark:border-card-dark">
                        <Video className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-white w-20">{item.time}</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-white">- {item.course}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 ml-20 md:ml-0 lg:ml-22 xl:ml-0 pl-0 sm:pl-22 md:pl-0">
                            <span className="hidden sm:inline">•</span>
                            <span>{item.studentName}</span>
                            <span>•</span>
                            <span>{item.room || 'Aula Virtual'}</span>
                          </div>
                          <div className="mt-2 flex -space-x-2 overflow-hidden ml-0 sm:ml-22 md:ml-0">
                            {/* Student Avatar + Counter if group */}
                            <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-card-dark">
                              <AvatarImage src={item.studentImage || ''} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">{item.studentName.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="ml-10 sm:ml-0">
                          {canJoin ? (
                            <Button onClick={() => handleStartClass(item.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6">
                              Iniciar Clase
                            </Button>
                          ) : (
                            <Button variant="outline" onClick={() => handlePrepareClass(item.courseId)} className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800">
                              Preparar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-10 text-slate-500">
                  No tienes clases programadas para hoy.
                </div>
              )}
            </div>
          </div>

          {/* Active Courses */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Cursos Activos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.activeCourses.map((course) => (
                <div key={course.id} className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${course.title.includes('Español') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {course.title.substring(0, 2).toUpperCase()}
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors">{course.title}</h4>
                  <p className="text-xs text-slate-500 mb-4">{course.level}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Progreso</span>
                      <span className="text-slate-900 dark:text-white">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{course.studentCount} Estudiantes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="bg-blue-500 dark:bg-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-500/20">
            <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button onClick={handleNewActivity} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <div className="bg-white/20 p-1.5 rounded">
                  <Plus className="w-4 h-4" />
                </div>
                Nueva Actividad
              </button>
              {nextClass ? (
                <button 
                  onClick={() => handleStartClass(nextClass.id)} 
                  className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10"
                >
                  <div className="bg-white/20 p-1.5 rounded">
                    <Video className="w-4 h-4" />
                  </div>
                  Entrar a la Próxima Clase
                </button>
              ) : (
                <Link 
                  href="/teacher/earnings" 
                  className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10"
                >
                  <div className="bg-white/20 p-1.5 rounded">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  Ver Mis Ganancias
                </Link>
              )}
              <button onClick={handleEditSchedule} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <div className="bg-white/20 p-1.5 rounded">
                  <Edit className="w-4 h-4" />
                </div>
                Editar Horario
              </button>
              <Link 
                href="/teacher/students" 
                className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10"
              >
                <div className="bg-white/20 p-1.5 rounded">
                  <BookOpen className="w-4 h-4" />
                </div>
                Lecciones Personalizadas
              </Link>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Atención Requerida</h3>
              <button className="text-xs font-bold text-blue-500 hover:text-blue-600">Ver Todo</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboardData.needsAttention.length > 0 ? (
                dashboardData.needsAttention.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-700">
                      <AvatarImage src={item.studentImage} />
                      <AvatarFallback className="bg-orange-50 text-orange-600 font-bold text-xs">{item.studentName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.studentName}</h4>
                      <p className="text-xs text-slate-500 truncate">{item.courseName} • <span className="text-red-500 font-medium">{item.issue}</span></p>
                    </div>
                    <button className="text-slate-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Activity className="w-4 h-4" /> {/* Using Mail icon equivalent */}
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-slate-500">
                  Todo está en orden. ¡Buen trabajo!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
