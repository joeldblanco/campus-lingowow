'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminDashboardData } from '@/types/dashboard'
import {
  Activity,
  Calendar as CalendarIcon,
  DollarSign,
  Download,
  type LucideIcon,
  MoreVertical,
  School,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { DashboardSkeleton } from './dashboard-skeleton'

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

const AdminDashboard = ({ dashboardData }: { dashboardData: AdminDashboardData | null }) => {
  if (!dashboardData) return <DashboardSkeleton />

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
          <div className="flex gap-2">
            {dashboardData.currentPeriod && (
              <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm font-medium">
                <CalendarIcon className="w-4 h-4" />
                <span>{dashboardData.currentPeriod.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-card-dark px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <CalendarIcon className="w-4 h-4" />
              <span className="capitalize">{today}</span>
            </div>
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

export default AdminDashboard
