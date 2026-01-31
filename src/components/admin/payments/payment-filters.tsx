'use client'

import { useState } from 'react'
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

interface PaymentFiltersProps {
  teachers: Array<{ id: string; name: string; email: string; rankName: string | null }>
  onFilterChange: (filters: {
    teacherId?: string
    startDate?: Date
    endDate?: Date
  }) => void
  onExport?: () => void
}

export function PaymentFilters({ teachers, onFilterChange, onExport }: PaymentFiltersProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const handleApplyFilters = () => {
    onFilterChange({
      teacherId: selectedTeacher === 'all' ? undefined : selectedTeacher,
      startDate,
      endDate,
    })
  }

  const handleReset = () => {
    setSelectedTeacher('all')
    setStartDate(undefined)
    setEndDate(undefined)
    onFilterChange({})
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
        <div className="grid gap-4 md:grid-cols-4">
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
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
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
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

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
