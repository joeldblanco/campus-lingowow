'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface AcademicPeriodOption {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface PaymentFiltersProps {
  teachers: Array<{ id: string; name: string; email: string; rankName: string | null }>
  periods: AcademicPeriodOption[]
  onFilterChange: (filters: {
    teacherId?: string
    startDate?: Date
    endDate?: Date
    periodId?: string
  }) => void
  onExport?: () => void
}

export function PaymentFilters({
  teachers,
  periods,
  onFilterChange,
  onExport,
}: PaymentFiltersProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [filterType, setFilterType] = useState<'period' | 'dates'>('period')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

  // Auto-seleccionar el período activo al cargar
  useEffect(() => {
    if (periods.length > 0 && selectedPeriod === 'all') {
      const active = periods.find((p) => p.isActive)
      if (active) {
        setSelectedPeriod(active.id)
      }
    }
  }, [periods, selectedPeriod])

  const handleApplyFilters = () => {
    const filters: Parameters<typeof onFilterChange>[0] = {
      teacherId: selectedTeacher === 'all' ? undefined : selectedTeacher,
    }

    if (filterType === 'period' && selectedPeriod !== 'all') {
      filters.periodId = selectedPeriod
    } else if (filterType === 'dates') {
      filters.startDate = startDate
      filters.endDate = endDate
    }

    onFilterChange(filters)
  }

  const handleReset = () => {
    setSelectedTeacher('all')
    setStartDate(undefined)
    setEndDate(undefined)
    const active = periods.find((p) => p.isActive)
    setSelectedPeriod(active?.id || 'all')
    setFilterType('period')
    onFilterChange({
      periodId: active?.id,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Fila 1: Profesor + tipo de filtro */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacher">Profesor</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesores</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                      {teacher.rankName && ` (${teacher.rankName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por</Label>
              <RadioGroup
                value={filterType}
                onValueChange={(v) => setFilterType(v as 'period' | 'dates')}
                className="flex gap-4 h-10 items-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="period" id="filter-period" />
                  <Label htmlFor="filter-period" className="font-normal cursor-pointer">
                    Período Académico
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dates" id="filter-dates" />
                  <Label htmlFor="filter-dates" className="font-normal cursor-pointer">
                    Rango de Fechas
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Fila 2: Filtros de fecha o período + acciones */}
          <div className="grid gap-4 md:grid-cols-4">
            {filterType === 'period' ? (
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="period">Período Académico</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los períodos</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                        {period.isActive && ' (Actual)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Spacer to align with period layout */}
                <div className="hidden md:block" />
              </>
            )}

            <div className="space-y-2">
              <Label className="invisible">Acciones</Label>
              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} className="flex-1">
                  Aplicar
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {onExport && (
          <div className="mt-4 pt-4 border-t">
            <Button onClick={onExport} variant="outline" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
