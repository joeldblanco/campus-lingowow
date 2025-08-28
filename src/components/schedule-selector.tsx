'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle } from 'lucide-react'
import { format, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface TimeSlot {
  id: string
  date: Date
  isBooked: boolean
}

interface ScheduleSelectorProps {
  productId: string
  duration: number // en minutos
  maxSlots: number
  onSlotSelect: (slotId: string) => void
  selectedSlots: string[]
}

export function ScheduleSelector({ 
  productId, 
  duration, 
  maxSlots, 
  onSlotSelect, 
  selectedSlots 
}: ScheduleSelectorProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(false)

  const loadAvailableSlots = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      // Implementar la lógica real de carga de slots aquí
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error loading available slots:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);
  
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeek(prev => addDays(prev, -7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeek(prev => addDays(prev, 7));
  }, []);

  useEffect(() => {
    loadAvailableSlots();
  }, [loadAvailableSlots, currentWeek]);

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isBooked) return;
    
    if (selectedSlots.includes(slot.id)) {
      // Deseleccionar
      onSlotSelect(slot.id);
    } else if (selectedSlots.length < maxSlots) {
      // Seleccionar si no se ha alcanzado el máximo
      onSlotSelect(slot.id);
    }
  }

  const groupSlotsByDay = () => {
    const grouped: { [key: string]: TimeSlot[] } = {}
    
    availableSlots.forEach(slot => {
      const dayKey = format(slot.date, 'yyyy-MM-dd')
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(slot)
    })
    
    return grouped
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar Horario
          </CardTitle>
          <CardDescription>
            Cargando horarios disponibles...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const groupedSlots = groupSlotsByDay()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Seleccionar Horario
        </CardTitle>
        <CardDescription>
          Selecciona {maxSlots === 1 ? 'un horario' : `hasta ${maxSlots} horarios`} para tu clase.
          Duración: {duration} minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Navegación de semana */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goToPreviousWeek}>
            ← Semana anterior
          </Button>
          <div className="text-center">
            <h3 className="font-semibold">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd MMM', { locale: es })} - {' '}
              {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'dd MMM yyyy', { locale: es })}
            </h3>
          </div>
          <Button variant="outline" onClick={goToNextWeek}>
            Semana siguiente →
          </Button>
        </div>

        {/* Contador de selecciones */}
        <div className="text-center">
          <Badge variant={selectedSlots.length === maxSlots ? "default" : "secondary"}>
            {selectedSlots.length} / {maxSlots} horarios seleccionados
          </Badge>
        </div>

        {/* Grid de días y horarios */}
        <div className="grid gap-4">
          {Object.entries(groupedSlots).map(([dayKey, slots]) => {
            const dayDate = new Date(dayKey)
            return (
              <div key={dayKey} className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">
                  {format(dayDate, 'EEEE, dd MMMM', { locale: es })}
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {slots.map(slot => {
                    const isSelected = selectedSlots.includes(slot.id)
                    const isDisabled = slot.isBooked || (selectedSlots.length >= maxSlots && !isSelected)
                    
                    return (
                      <Button
                        key={slot.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={isDisabled}
                        onClick={() => handleSlotClick(slot)}
                        className={`relative ${isSelected ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {format(slot.date, 'HH:mm')}
                          </span>
                          {isSelected && (
                            <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-200" />
                          )}
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {availableSlots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay horarios disponibles para esta semana.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
