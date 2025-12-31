'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Wallet,
  Check,
  Lightbulb,
  DollarSign,
  GraduationCap,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface ClassDetail {
  bookingId: string
  date: string
  timeSlot: string
  studentName: string
  studentImage: string | null
  courseName: string
  duration: number
  earnings: number
  teacherAttendanceTime: string
  studentAttendanceTime: string
  academicPeriod: string
}

interface WeeklyEarning {
  week: number
  earnings: number
  label: string
}

interface RecentPayout {
  id: string
  amount: number
  date: string
  periodName: string
  type: string
}

interface EarningsData {
  success: boolean
  teacherId: string
  teacherName: string
  teacherEmail: string
  teacherImage: string | null
  rank: string | null
  rateMultiplier: number
  totalClasses: number
  totalDuration: number
  totalEarnings: number
  averagePerClass: number
  classes: ClassDetail[]
  bonuses: {
    total: number
    paid: number
    pending: number
  }
  trends: {
    earningsChange: number
    classIncomeChange: number
    bonusChange: number
  }
  weeklyEarnings: WeeklyEarning[]
  recentPayouts: RecentPayout[]
  nextPayout: {
    amount: number
    estimatedDate: string
  }
  filters: {
    startDate: string | null
    endDate: string | null
    periodId: string | null
  }
}

interface AcademicPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
}

type FilterType = 'thisMonth' | 'lastQuarter' | 'custom'

export function TeacherEarningsOverview() {
  const { data: session } = useSession()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [filterType, setFilterType] = useState<FilterType>('thisMonth')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('classes')
  const itemsPerPage = 4

  // Cargar períodos académicos
  useEffect(() => {
    async function loadAcademicPeriods() {
      try {
        const response = await fetch('/api/academic-periods')
        if (response.ok) {
          const data = await response.json()
          const periods = data.periods || []
          setAcademicPeriods(periods)

          // Buscar el período académico actual
          const today = new Date()
          const activePeriod = periods.find((p: AcademicPeriod) => {
            const start = new Date(p.startDate)
            const end = new Date(p.endDate)
            return today >= start && today <= end
          })

          if (activePeriod) {
            setSelectedPeriod(activePeriod.id)
          }
        }
      } catch (error) {
        console.error('Error cargando períodos académicos:', error)
      }
    }
    loadAcademicPeriods()
  }, [])

  const loadReport = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (filterType === 'thisMonth') {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        params.append('startDate', startOfMonth.toISOString().split('T')[0])
        params.append('endDate', endOfMonth.toISOString().split('T')[0])
      } else if (filterType === 'lastQuarter') {
        const now = new Date()
        const startOfQuarter = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        params.append('startDate', startOfQuarter.toISOString().split('T')[0])
        params.append('endDate', now.toISOString().split('T')[0])
      } else if (selectedPeriod !== 'all') {
        params.append('periodId', selectedPeriod)
      }

      const response = await fetch(`/api/teacher/earnings?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar el reporte de ganancias')
      }

      const data = await response.json()
      setEarningsData(data)
    } catch (error) {
      console.error('Error cargando reporte:', error)
      toast.error('Error al cargar el reporte de ganancias')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, filterType, selectedPeriod])

  useEffect(() => {
    if (session?.user?.id) {
      loadReport()
    }
  }, [session?.user?.id, loadReport])

  function exportToCSV() {
    if (!earningsData) return

    const rows: string[] = []
    rows.push('Fecha,Hora,Estudiante,Curso,Duración (min),Ganancias,Período Académico')

    earningsData.classes.forEach((classDetail) => {
      rows.push(
        [
          classDetail.date,
          classDetail.timeSlot,
          classDetail.studentName,
          classDetail.courseName,
          classDetail.duration,
          classDetail.earnings.toFixed(2),
          classDetail.academicPeriod,
        ].join(',')
      )
    })

    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `mis-ganancias-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Reporte exportado exitosamente')
  }

  // Paginación
  const totalPages = earningsData ? Math.ceil(earningsData.classes.length / itemsPerPage) : 0
  const paginatedClasses = earningsData
    ? earningsData.classes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : []

  // Calcular altura máxima del gráfico
  const maxWeeklyEarning = earningsData
    ? Math.max(...earningsData.weeklyEarnings.map((w) => w.earnings), 1)
    : 1

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  function TrendBadge({ value, className }: { value: number; className?: string }) {
    const isPositive = value >= 0
    return (
      <div
        className={cn(
          'flex items-center gap-1 w-fit px-2 py-0.5 rounded text-sm font-medium',
          isPositive
            ? 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
            : 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
          className
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {isPositive ? '+' : ''}
        {value}% vs mes anterior
      </div>
    )
  }

  if (loading && !earningsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-[1200px] w-full gap-8 mx-auto">
      {/* Encabezado de página */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Resumen de Ganancias
          </h1>
          <p className="text-muted-foreground text-base font-normal">
            Revisa tus ingresos por clases, bonificaciones e historial de pagos.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-background border border-border text-foreground text-sm font-bold shadow-sm hover:bg-accent transition-colors"
          >
            <Download className="h-5 w-5" />
            <span className="truncate">Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card rounded-xl border shadow-sm">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilterType('thisMonth')}
            className={cn(
              'flex h-9 items-center justify-center gap-x-2 rounded-lg pl-4 pr-3 transition-colors',
              filterType === 'thisMonth'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span className="text-sm font-bold">Este Mes</span>
          </button>
          <button
            onClick={() => setFilterType('lastQuarter')}
            className={cn(
              'flex h-9 items-center justify-center gap-x-2 rounded-lg pl-4 pr-3 transition-colors',
              filterType === 'lastQuarter'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span className="text-sm font-medium">Último Trimestre</span>
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={cn(
              'flex h-9 items-center justify-center gap-x-2 rounded-lg pl-4 pr-3 transition-colors',
              filterType === 'custom'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span className="text-sm font-medium">Período Académico</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {filterType === 'custom' && (
          <div className="flex items-center gap-2 pl-4 border-l border-border">
            <span className="text-sm text-muted-foreground font-medium">Período:</span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                {academicPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {earningsData && (
        <>
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ganancias Totales */}
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="h-16 w-16 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Ganancias Totales
              </p>
              <p className="text-foreground tracking-tight text-3xl font-bold">
                ${earningsData.totalEarnings.toFixed(2)}
              </p>
              <TrendBadge value={earningsData.trends.earningsChange} />
            </div>

            {/* Ingresos por Clases */}
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <GraduationCap className="h-16 w-16 text-purple-500" />
              </div>
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Ingresos por Clases
              </p>
              <p className="text-foreground tracking-tight text-3xl font-bold">
                ${(earningsData.totalEarnings - earningsData.bonuses.pending).toFixed(2)}
              </p>
              <TrendBadge value={earningsData.trends.classIncomeChange} />
            </div>

            {/* Bonificaciones */}
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-card border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star className="h-16 w-16 text-orange-500" />
              </div>
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Bonificaciones
              </p>
              <p className="text-foreground tracking-tight text-3xl font-bold">
                ${earningsData.bonuses.pending.toFixed(2)}
              </p>
              <TrendBadge value={earningsData.trends.bonusChange} />
            </div>
          </div>

          {/* Área de contenido principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna izquierda: Gráfico y Tabla */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Sección del gráfico */}
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold">Tendencia de Ingresos</h3>
                    <p className="text-sm text-muted-foreground">
                      Desglose semanal del mes actual
                    </p>
                  </div>
                  <Select defaultValue="weekly">
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gráfico de barras CSS */}
                <div className="grid grid-cols-4 gap-4 items-end h-48 px-2">
                  {earningsData.weeklyEarnings.map((week) => {
                    const heightPercent = maxWeeklyEarning > 0 
                      ? (week.earnings / maxWeeklyEarning) * 100 
                      : 0
                    return (
                      <div
                        key={week.week}
                        className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                      >
                        <div
                          className="relative w-full max-w-[60px] bg-primary/20 rounded-t-lg group-hover:bg-primary/30 transition-all overflow-hidden"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 w-full bg-primary transition-all duration-500"
                            style={{ height: '100%' }}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {week.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tabla de detalles */}
              <div className="flex flex-col gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="border-b border-border bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="classes"
                      className={cn(
                        'px-6 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-primary'
                      )}
                    >
                      Ganancias por Clase
                    </TabsTrigger>
                    <TabsTrigger
                      value="bonuses"
                      className={cn(
                        'px-6 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-primary'
                      )}
                    >
                      Historial de Bonos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="classes" className="mt-0">
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Fecha
                              </th>
                              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Estudiante y Curso
                              </th>
                              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                                Duración
                              </th>
                              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                                Monto
                              </th>
                              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedClasses.length > 0 ? (
                              paginatedClasses.map((classDetail) => (
                                <tr
                                  key={classDetail.bookingId}
                                  className="hover:bg-muted/50 transition-colors group"
                                >
                                  <td className="py-4 px-6 text-sm font-medium whitespace-nowrap">
                                    {format(new Date(classDetail.date), 'dd MMM, yyyy', {
                                      locale: es,
                                    })}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={classDetail.studentImage || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                          {getInitials(classDetail.studentName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-bold">
                                          {classDetail.studentName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {classDetail.courseName}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-sm text-muted-foreground text-center">
                                    {classDetail.duration} min
                                  </td>
                                  <td className="py-4 px-6 text-sm font-bold text-right">
                                    ${classDetail.earnings.toFixed(2)}
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                      <Info className="h-5 w-5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                  No se encontraron clases en este período
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginación */}
                      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                          Mostrando {paginatedClasses.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                          {Math.min(currentPage * itemsPerPage, earningsData.classes.length)} de{' '}
                          {earningsData.classes.length} clases
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded hover:bg-muted disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="bonuses" className="mt-0">
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                      <p className="text-center text-muted-foreground py-8">
                        El historial de bonificaciones se muestra en la sección de pagos recientes.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Columna derecha: Widget de pago */}
            <div className="flex flex-col gap-6">
              {/* Tarjeta de próximo pago */}
              <div className="flex flex-col rounded-xl overflow-hidden bg-primary text-primary-foreground shadow-lg relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 opacity-90" />
                <div className="p-6 relative z-10 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-primary-foreground/80 text-sm font-medium">
                        Próximo Pago Programado
                      </p>
                      <h2 className="text-3xl font-bold mt-1">
                        ${earningsData.nextPayout.amount.toFixed(2)}
                      </h2>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
                    <Calendar className="h-4 w-4" />
                    Estimado:{' '}
                    {format(new Date(earningsData.nextPayout.estimatedDate), 'dd MMM, yyyy', {
                      locale: es,
                    })}
                  </div>
                </div>
                <div className="bg-black/10 p-4 relative z-10">
                  <button className="w-full flex items-center justify-center gap-2 text-sm font-bold hover:text-primary-foreground/80 transition-colors">
                    Configuración de Pagos
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Historial de pagos */}
              <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Pagos Recientes</h3>
                  <button className="text-sm font-medium text-primary hover:underline">
                    Ver Todo
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {earningsData.recentPayouts.length > 0 ? (
                    earningsData.recentPayouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex gap-3 items-center">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <Check className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">${payout.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payout.date), 'dd MMM, yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                          Pagado
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No hay pagos recientes
                    </p>
                  )}
                </div>
              </div>

              {/* Tarjeta de consejo */}
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 flex gap-3 items-start">
                <Lightbulb className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Consejo Pro</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Los profesores con calificaciones de 5 estrellas ganan 15% más en bonificaciones.
                    Revisa los comentarios de tus estudiantes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
