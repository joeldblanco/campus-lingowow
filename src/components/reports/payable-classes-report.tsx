'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Clock, CheckCircle2, XCircle, Download, Filter, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ClassDetail {
  bookingId: string
  date: string
  timeSlot: string
  studentName: string
  courseName: string
  duration: number
  earnings: number
  teacherAttendanceTime: string
  studentAttendanceTime: string
  academicPeriod: string
}

interface TeacherReport {
  teacherId: string
  teacherName: string
  teacherEmail: string
  rank: string | null
  rateMultiplier: number
  totalClasses: number
  totalDuration: number
  totalEarnings: number
  classes: ClassDetail[]
}

interface ReportSummary {
  totalPayableClasses: number
  totalTeachers: number
  totalDuration: number
  totalEarnings: number
  totalCompletedClasses: number
  totalNonPayableClasses: number
}

interface ReportData {
  success: boolean
  summary: ReportSummary
  teacherReports: TeacherReport[]
  filters: {
    teacherId: string | null
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

export function PayableClassesReport() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([])
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)

  // Filtros
  const [filterType, setFilterType] = useState<'dates' | 'period'>('period')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [initialPeriodSet, setInitialPeriodSet] = useState(false)

  // Cargar lista de profesores y períodos académicos
  useEffect(() => {
    async function loadTeachers() {
      try {
        const response = await fetch('/api/users?role=TEACHER')
        if (response.ok) {
          const data = await response.json()
          setTeachers(data.users || [])
        }
      } catch (error) {
        console.error('Error cargando profesores:', error)
      }
    }

    async function loadAcademicPeriods() {
      try {
        const response = await fetch('/api/academic-periods')
        if (response.ok) {
          const data = await response.json()
          const periods = data.periods || []
          setAcademicPeriods(periods)

          // Buscar el período académico actual (isActive = true)
          // Si no hay ninguno activo, buscar el más reciente que incluya la fecha actual
          const today = new Date()
          const activePeriod = periods.find((p: AcademicPeriod) => {
            const start = new Date(p.startDate)
            const end = new Date(p.endDate)
            return today >= start && today <= end
          })

          if (activePeriod && !initialPeriodSet) {
            setSelectedPeriod(activePeriod.id)
            setInitialPeriodSet(true)
          }
        }
      } catch (error) {
        console.error('Error cargando períodos académicos:', error)
      }
    }

    loadTeachers()
    loadAcademicPeriods()
  }, [initialPeriodSet])

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (selectedTeacher !== 'all') {
        params.append('teacherId', selectedTeacher)
      }

      if (filterType === 'dates') {
        if (startDate) {
          params.append('startDate', startDate)
        }
        if (endDate) {
          params.append('endDate', endDate)
        }
      } else if (filterType === 'period' && selectedPeriod !== 'all') {
        params.append('periodId', selectedPeriod)
      }

      const response = await fetch(`/api/reports/payable-classes?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar el reporte')
      }

      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error cargando reporte:', error)
      toast.error('Error al cargar el reporte')
    } finally {
      setLoading(false)
    }
  }, [selectedTeacher, filterType, startDate, endDate, selectedPeriod])

  // Cargar reporte inicial cuando se seleccione el período
  useEffect(() => {
    if (initialPeriodSet) {
      loadReport()
    }
  }, [initialPeriodSet, loadReport])

  function handleApplyFilters() {
    loadReport()
  }

  function handleClearFilters() {
    setSelectedTeacher('all')
    setStartDate('')
    setEndDate('')
    setFilterType('period')

    // Restablecer al período actual
    const today = new Date()
    const activePeriod = academicPeriods.find((p) => {
      const start = new Date(p.startDate)
      const end = new Date(p.endDate)
      return today >= start && today <= end
    })

    setSelectedPeriod(activePeriod?.id || 'all')
    setTimeout(() => loadReport(), 100)
  }

  function exportToCSV() {
    if (!reportData) return

    const rows: string[] = []

    // Encabezado
    rows.push(
      'Profesor,Email,Rango,Multiplicador,Fecha,Hora,Estudiante,Curso,Duración (min),Ganancias,Período Académico'
    )

    // Datos
    reportData.teacherReports.forEach((teacher) => {
      teacher.classes.forEach((classDetail) => {
        rows.push(
          [
            teacher.teacherName,
            teacher.teacherEmail,
            teacher.rank || 'N/A',
            teacher.rateMultiplier,
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
    })

    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `clases-pagables-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Reporte exportado exitosamente')
  }

  if (loading && !reportData) {
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
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selector de Profesor */}
            <div className="space-y-2">
              <Label htmlFor="teacher">Profesor</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Todos los profesores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesores</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Radio buttons para tipo de filtro */}
            <div className="space-y-3">
              <Label>Filtrar por</Label>
              <RadioGroup
                value={filterType}
                onValueChange={(value: 'dates' | 'period') => setFilterType(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dates" id="dates" />
                  <Label htmlFor="dates" className="font-normal cursor-pointer">
                    Rango de fechas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="period" id="period" />
                  <Label htmlFor="period" className="font-normal cursor-pointer">
                    Período académico
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Filtros por fechas */}
            {filterType === 'dates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Filtro por período académico */}
            {filterType === 'period' && (
              <div className="space-y-2">
                <Label htmlFor="period">Período Académico</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los períodos</SelectItem>
                    {academicPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} (
                        {format(new Date(period.startDate), 'dd/MM/yyyy', { locale: es })} -{' '}
                        {format(new Date(period.endDate), 'dd/MM/yyyy', { locale: es })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} disabled={loading} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={handleClearFilters} variant="outline" disabled={loading}>
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clases Pagables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">
                    {reportData.summary.totalPayableClasses}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clases No Pagables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold">
                    {reportData.summary.totalNonPayableClasses}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profesores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{reportData.summary.totalTeachers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Duración Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">{reportData.summary.totalDuration}</span>
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganancias Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">
                    ${reportData.summary.totalEarnings.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Acciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={exportToCSV} variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de profesores */}
          <Card>
            <CardHeader>
              <CardTitle>Reporte por Profesor</CardTitle>
              <CardDescription>
                Clases donde tanto el profesor como el estudiante asistieron
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.teacherReports.map((teacher) => (
                  <div key={teacher.teacherId} className="border rounded-lg p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedTeacher(
                          expandedTeacher === teacher.teacherId ? null : teacher.teacherId
                        )
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold">{teacher.teacherName}</h3>
                          <p className="text-sm text-muted-foreground">{teacher.teacherEmail}</p>
                        </div>
                        {teacher.rank && <Badge variant="secondary">{teacher.rank}</Badge>}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Clases</p>
                          <p className="font-semibold">{teacher.totalClasses}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Duración</p>
                          <p className="font-semibold">{teacher.totalDuration} min</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Ganancias</p>
                          <p className="font-semibold text-green-600">
                            ${teacher.totalEarnings.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Multiplicador</p>
                          <p className="font-semibold">{teacher.rateMultiplier}x</p>
                        </div>
                      </div>
                    </div>

                    {expandedTeacher === teacher.teacherId && (
                      <div className="mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Estudiante</TableHead>
                              <TableHead>Curso</TableHead>
                              <TableHead>Duración</TableHead>
                              <TableHead>Ganancias</TableHead>
                              <TableHead>Período</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teacher.classes.map((classDetail) => (
                              <TableRow key={classDetail.bookingId}>
                                <TableCell>
                                  {format(new Date(classDetail.date), 'dd/MM/yyyy', { locale: es })}
                                </TableCell>
                                <TableCell>{classDetail.timeSlot}</TableCell>
                                <TableCell>{classDetail.studentName}</TableCell>
                                <TableCell>{classDetail.courseName}</TableCell>
                                <TableCell>{classDetail.duration} min</TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  ${classDetail.earnings.toFixed(2)}
                                </TableCell>
                                <TableCell>{classDetail.academicPeriod}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}

                {reportData.teacherReports.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron clases pagables con los filtros seleccionados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
