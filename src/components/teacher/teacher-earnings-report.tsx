'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DollarSign, 
  Clock, 
  CheckCircle2,
  Download,
  Filter,
  TrendingUp
} from 'lucide-react'
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

interface EarningsData {
  success: boolean
  teacherId: string
  teacherName: string
  teacherEmail: string
  rank: string | null
  rateMultiplier: number
  totalClasses: number
  totalDuration: number
  totalEarnings: number
  averagePerClass: number
  classes: ClassDetail[]
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

export function TeacherEarningsReport() {
  const { data: session } = useSession()
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([])
  
  // Filtros
  const [filterType, setFilterType] = useState<'dates' | 'period'>('period')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [initialPeriodSet, setInitialPeriodSet] = useState(false)

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
          
          if (activePeriod && !initialPeriodSet) {
            setSelectedPeriod(activePeriod.id)
            setInitialPeriodSet(true)
          }
        }
      } catch (error) {
        console.error('Error cargando períodos académicos:', error)
      }
    }
    loadAcademicPeriods()
  }, [initialPeriodSet])

  // Cargar reporte inicial cuando se seleccione el período
  useEffect(() => {
    if (session?.user?.id && initialPeriodSet) {
      loadReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, initialPeriodSet])

  async function loadReport() {
    if (!session?.user?.id) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
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
  }

  function handleApplyFilters() {
    loadReport()
  }

  function handleClearFilters() {
    setStartDate('')
    setEndDate('')
    setFilterType('period')
    
    // Restablecer al período actual
    const today = new Date()
    const activePeriod = academicPeriods.find(p => {
      const start = new Date(p.startDate)
      const end = new Date(p.endDate)
      return today >= start && today <= end
    })
    
    setSelectedPeriod(activePeriod?.id || 'all')
    setTimeout(() => loadReport(), 100)
  }

  function exportToCSV() {
    if (!earningsData) return

    const rows: string[] = []
    
    // Encabezado
    rows.push('Fecha,Hora,Estudiante,Curso,Duración (min),Ganancias,Período Académico')
    
    // Datos
    earningsData.classes.forEach((classDetail) => {
      rows.push([
        classDetail.date,
        classDetail.timeSlot,
        classDetail.studentName,
        classDetail.courseName,
        classDetail.duration,
        classDetail.earnings.toFixed(2),
        classDetail.academicPeriod,
      ].join(','))
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
            {/* Radio buttons para tipo de filtro */}
            <div className="space-y-3">
              <Label>Filtrar por</Label>
              <RadioGroup value={filterType} onValueChange={(value: 'dates' | 'period') => setFilterType(value)}>
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
                        {period.name} ({format(new Date(period.startDate), 'dd/MM/yyyy', { locale: es })} - {format(new Date(period.endDate), 'dd/MM/yyyy', { locale: es })})
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
      {earningsData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganancias Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">${earningsData.totalEarnings.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clases Pagables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{earningsData.totalClasses}</span>
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
                  <span className="text-2xl font-bold">{earningsData.totalDuration}</span>
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Promedio por Clase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold">${earningsData.averagePerClass.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Información del profesor */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Profesor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-semibold">{earningsData.teacherName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rango</p>
                  <div className="flex items-center gap-2">
                    {earningsData.rank ? (
                      <Badge variant="secondary">{earningsData.rank}</Badge>
                    ) : (
                      <span className="text-sm">Sin rango asignado</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Multiplicador de Tarifa</p>
                  <p className="font-semibold">{earningsData.rateMultiplier}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de clases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detalle de Clases Pagables</CardTitle>
                  <CardDescription>
                    Clases donde tanto tú como el estudiante asistieron
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {earningsData.classes.length > 0 ? (
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
                    {earningsData.classes.map((classDetail) => (
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron clases pagables con los filtros seleccionados
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
