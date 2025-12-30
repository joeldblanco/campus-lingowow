'use client'

import StudentDashboard from '@/components/dashboard/student-dashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAdminDashboardStats, getTeacherDashboardStats } from '@/lib/actions/dashboard'
import type { AdminDashboardData, TeacherDashboardData } from '@/types/dashboard'
import { UserRole } from '@prisma/client'
import {
  Activity,
  BookOpen,
  Calendar,
  Calendar as CalendarIcon,
  DollarSign,
  Download,
  type LucideIcon,
  MoreVertical,
  School,
  Users,
  Video,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const Dashboard = () => {
  const { data: session } = useSession()
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null)
  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null)

  // Cargar datos del dashboard según el rol
  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user) {
        try {
          if (session.user.roles.includes(UserRole.ADMIN)) {
            const data = await getAdminDashboardStats()
            setAdminData(data)
          } else if (session.user.roles.includes(UserRole.TEACHER) && session.user.id) {
            const data = await getTeacherDashboardStats(session.user.id)
            setTeacherData(data)
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
    }

    loadDashboardData()
  }, [session])

  const userRoles = session?.user?.roles

  // Renderizar el dashboard según el rol
  return (
    <div className="p-6">
      {userRoles?.includes(UserRole.ADMIN) && <AdminDashboard dashboardData={adminData} />}
      {userRoles?.includes(UserRole.TEACHER) && <TeacherDashboard dashboardData={teacherData} />}
      {userRoles?.includes(UserRole.STUDENT) && <StudentDashboard />}
      {userRoles?.includes(UserRole.GUEST) && <GuestDashboard />}
    </div>
  )
}

// Componente para el dashboard de administradores
const AdminDashboard = ({ dashboardData }: { dashboardData: AdminDashboardData | null }) => {
  if (!dashboardData) return <div>Cargando datos...</div>

  // Calcular fecha actual formateada
  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
        {/* Page Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-display">
              Resumen del Panel
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Bienvenido de nuevo. Aquí está lo que sucede en tu plataforma hoy.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-card-dark px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <CalendarIcon className="w-4 h-4" />
            <span className="capitalize">{today}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            value={dashboardData.totalStudents}
            icon={Users}
            color="blue"
            label="Total de estudiantes"
          />
          <StatCard
            value={dashboardData.activeCourses}
            icon={School}
            color="purple"
            label="Cursos publicados"
          />
          <StatCard
            value={`$${dashboardData.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            color="amber"
            label="Total facturado"
          />
          <StatCard
            value={dashboardData.activeTeachers}
            icon={Activity}
            color="green"
            label="Instructores verificados"
          />
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Inscripciones de Estudiantes
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Rendimiento de los últimos 30 días
                </p>
              </div>
              <select className="text-sm border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary text-slate-600 dark:text-slate-300 outline-none">
                <option>Últimos 30 Días</option>
              </select>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.enrollmentStats}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#137fec" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="students"
                    stroke="#137fec"
                    fillOpacity={1}
                    fill="url(#colorStudents)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Classes List (Formerly Pending Actions) */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Próximas Clases</h3>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-full">
                {dashboardData.upcomingClasses.length} Nuevas
              </span>
            </div>
            <div className="flex-1 space-y-4">
              {dashboardData.upcomingClasses.length > 0 ? (
                dashboardData.upcomingClasses.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors bg-slate-50/50 dark:bg-slate-800/30 items-center"
                  >
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarImage src={booking.teacherImage || ''} alt={booking.teacherName} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {booking.teacherName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {booking.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {booking.teacherName} • {booking.startTime}
                      </p>
                    </div>
                    {/* <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                      Ver
                    </Button> */}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No hay clases próximas</p>
              )}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white font-medium border-t border-slate-100 dark:border-slate-700 transition-colors rounded-none"
            >
              Ver todas
            </Button>
          </div>
        </div>

        {/* Recent Enrollments Table (Formerly Transactions) */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Inscripciones Recientes
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow className="border-b-slate-200 dark:border-b-slate-700 hover:bg-transparent">
                  <TableHead className="px-6 py-3 font-semibold text-slate-500">
                    Estudiante
                  </TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-slate-500">Curso</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-slate-500">Fecha</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-slate-500">Monto</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-slate-500">Estado</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-700">
                {dashboardData.recentEnrollments.map((enrollment, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-0"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-indigo-100 text-indigo-600">
                          <AvatarImage src={enrollment.studentImage || ''} />
                          <AvatarFallback className="text-xs font-bold">
                            {enrollment.studentName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {enrollment.studentName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {enrollment.courseName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-500">{enrollment.date}</TableCell>
                    <TableCell className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {enrollment.amount}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 border-none font-medium text-xs px-2.5 py-0.5 rounded-full"
                      >
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  value,
  icon: Icon,
  color,
  label,
}: {
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'purple' | 'amber' | 'slate' | 'green'
  label: string
}) {
  const getColors = (c: string) => {
    switch (c) {
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-primary',
        }
      case 'purple':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          text: 'text-purple-600',
        }
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          text: 'text-amber-600',
        }
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          text: 'text-green-600',
        }
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800',
          text: 'text-slate-600 dark:text-slate-300',
        }
    }
  }

  const styles = getColors(color)

  return (
    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon className={`w-6 h-6 ${styles.text}`} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
      </div>
    </div>
  )
}

// Componente para el dashboard de profesores
const TeacherDashboard = ({ dashboardData }: { dashboardData: TeacherDashboardData | null }) => {
  const { data: session } = useSession()
  const router = useRouter()
  const userName = session?.user?.name || 'Profesor'

  if (!dashboardData) return <div>Cargando datos...</div>

  // Funciones de navegación
  const handleStartClass = (classId: string) => router.push(`/classroom?classId=${classId}`)
  const handlePrepareClass = (courseId: string) => router.push(`/admin/courses/${courseId}/edit`) // Asumiendo ruta de edición
  const handleNewAssignment = () => router.push('/admin/assignments/new') // Ruta mock
  const handleMessageClass = () => router.push('/messages')
  const handleUploadMaterial = () => router.push('/admin/materials/upload') // Ruta mock
  const handleViewAllSchedule = () => router.push('/calendar')

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
            Tienes {dashboardData.upcomingClasses.length} clases hoy.
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

        {/* Horas Enseñadas */}
        <div className={cardStyle}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Horas Enseñadas
            </span>
            <School className="w-5 h-5 text-purple-500 bg-purple-50 dark:bg-purple-900/20 p-1 rounded-md box-content" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {dashboardData.totalHoursTaught.hours}h
            </span>
            <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-none px-1.5 py-0.5 mb-1 text-[10px] font-bold">
              +{dashboardData.totalHoursTaught.trend}%
            </Badge>
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

              {dashboardData.upcomingClasses.length > 0 ? (
                dashboardData.upcomingClasses.map((item, index) => (
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
                        {index === 0 ? (
                          <Button onClick={() => handleStartClass(item.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6">
                            Iniciar Clase
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => handlePrepareClass(item.id)} className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800">
                            Preparar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
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
              <button onClick={handleNewAssignment} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <div className="bg-white/20 p-1.5 rounded">
                  <BookOpen className="w-4 h-4" />
                </div>
                Nueva Tarea
              </button>
              <button onClick={handleMessageClass} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <div className="bg-white/20 p-1.5 rounded">
                  <Activity className="w-4 h-4" />
                </div>
                Mensaje a la Clase
              </button>
              <button onClick={handleUploadMaterial} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg text-sm font-medium backdrop-blur-sm border border-white/10">
                <div className="bg-white/20 p-1.5 rounded">
                  <Download className="w-4 h-4 rotate-180" />
                </div>
                Subir Material
              </button>
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

// Componente para el dashboard de estudiantes
// const StudentDashboard = () => {
//   return (
//     <div className="space-y-6">
//       <h2 className="text-3xl font-bold">Mi Aprendizaje</h2>
//       {/* <CalendarApp /> */}
//       <AcademicCalendar />
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
//             <BookOpen className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">2</div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Clases Completadas</CardTitle>
//             <Calendar className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">24</div>
//             <p className="text-xs text-gray-500">En total</p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Grabaciones</CardTitle>
//             <FileText className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">18</div>
//             <p className="text-xs text-gray-500">Disponibles</p>
//           </CardContent>
//         </Card>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Mis Próximas Clases</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Curso</TableHead>
//                 <TableHead>Profesor</TableHead>
//                 <TableHead>Fecha</TableHead>
//                 <TableHead>Hora</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               <TableRow>
//                 <TableCell>Inglés Avanzado</TableCell>
//                 <TableCell>Sarah Johnson</TableCell>
//                 <TableCell>29/03/2025</TableCell>
//                 <TableCell>16:00</TableCell>
//               </TableRow>
//               <TableRow>
//                 <TableCell>Inglés Avanzado</TableCell>
//                 <TableCell>Sarah Johnson</TableCell>
//                 <TableCell>01/04/2025</TableCell>
//                 <TableCell>16:00</TableCell>
//               </TableRow>
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader>
//           <CardTitle>Mis Cursos</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Inglés Avanzado</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p>Progreso: 65%</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
//                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
//                 </div>
//                 <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//                   Continuar
//                 </button>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Francés Básico</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p>Progreso: 30%</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
//                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
//                 </div>
//                 <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//                   Continuar
//                 </button>
//               </CardContent>
//             </Card>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

// Componente para el dashboard de invitados
const GuestDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Bienvenido a Lingowow</h2>

      {/* Prominent registration banner at the top */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">¡Comienza tu Aprendizaje Hoy!</h3>
              <p className="text-blue-100">
                Únete a miles de estudiantes aprendiendo idiomas con los mejores profesores
              </p>
            </div>
            <Link
              href="/shop"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-bold text-lg shadow-lg transform transition hover:scale-105 inline-block"
            >
              Regístrate Ahora
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descubre Nuestros Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Inglés</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Desde nivel básico hasta avanzado</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Ver Más
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Español</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Aprende español con profesores expertos</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Ver Más
                </button>
              </CardContent>
            </Card>

            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>Francés</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Próximamente - Cursos de francés</p>
                <button
                  className="mt-4 px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                  disabled
                >
                  Próximamente
                </button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Por qué elegirnos?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Profesores Expertos</h3>
              <p>Aprende con profesores experimentados</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <Calendar className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Horarios Flexibles</h3>
              <p>Programa tus clases cuando más te convenga</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <BookOpen className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Materiales Exclusivos</h3>
              <p>Accede a contenido desarrollado por expertos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
