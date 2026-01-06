'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, AlertCircle, Calendar, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { WeeklyView } from '@/components/calendar/weekly-view'
import { AvailabilityRange } from '@/lib/utils/calendar'
import { UserRole } from '@prisma/client'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ProrationResult {
  planId: string
  planName: string
  originalPrice: number
  proratedPrice: number
  classesFromNow: number
  totalClassesInFullPeriod: number
  classesPerWeek: number
  periodStart: string
  periodEnd: string
  enrollmentStart: string
  daysRemaining: number
  weeksRemaining: number
  allowProration: boolean
  schedule: ScheduleSlot[]
}

interface Teacher {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  rank: {
    name: string
    level: number
  } | null
  availability: Record<string, Array<{ startTime: string; endTime: string }>>
  bookedSlots?: Record<string, Array<{ startTime: string; endTime: string }>>
}

interface ScheduleCalendarSelectorProps {
  planId: string
  courseId: string
  classesPerWeek: number // Cantidad de clases que permite el plan
  classDuration: number // Duración de cada clase en minutos (40 o 90)
  onScheduleSelected: (schedule: ScheduleSlot[], proration: ProrationResult) => void
}

const DAYS_OF_WEEK_MAP: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
}

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function ScheduleCalendarSelector({
  planId,
  courseId,
  classesPerWeek,
  classDuration,
  onScheduleSelected,
}: ScheduleCalendarSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [proration, setProration] = useState<ProrationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  
  // Usar ref para la callback para evitar re-renders
  const onScheduleSelectedRef = useRef(onScheduleSelected)
  useEffect(() => {
    onScheduleSelectedRef.current = onScheduleSelected
  }, [onScheduleSelected])

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teachers/availability?courseId=${courseId}`)
      if (!response.ok) throw new Error('Error al cargar profesores')
      const data = await response.json()
      setTeachers(data)
      if (data.length > 0) {
        setSelectedTeacher(data[0])
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      toast.error('Error al cargar la disponibilidad de profesores')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const calculateProration = useCallback(async () => {
    if (!selectedTeacher || selectedSlots.size === 0) return

    try {
      setCalculating(true)

      // Convertir slots seleccionados a formato de schedule
      const schedule: ScheduleSlot[] = Array.from(selectedSlots).map((slotKey) => {
        const [day, time] = slotKey.split('_')
        const dayOfWeek = DAYS_OF_WEEK_MAP[day]
        const [hours, minutes] = time.split(':').map(Number)

        // Calcular hora de fin correctamente
        const totalMinutes = hours * 60 + minutes + classDuration
        const endHours = Math.floor(totalMinutes / 60)
        const endMinutes = totalMinutes % 60
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

        return {
          teacherId: selectedTeacher.id,
          dayOfWeek,
          startTime: time,
          endTime,
        }
      })

      const response = await fetch('/api/plans/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          schedule,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Proration API error:', errorText)
        throw new Error('Error al calcular prorrateo')
      }

      const data = await response.json()
      console.log('Sending proration request:', { planId, schedule })
      setProration(data)
      onScheduleSelectedRef.current(schedule, data)
    } catch (error) {
      console.error('Error calculating proration:', error)
      toast.error('Error al calcular el prorrateo')
    } finally {
      setCalculating(false)
    }
  }, [selectedTeacher, selectedSlots, classDuration, planId])

  // Calcular prorrateo cuando cambian los slots seleccionados
  useEffect(() => {
    if (selectedSlots.size === classesPerWeek && selectedTeacher) {
      calculateProration()
    } else {
      setProration(null)
    }
  }, [selectedSlots, selectedTeacher, classesPerWeek, calculateProration])

  const handleSlotClick = (day: string, time: string) => {
    // Limpiar el formato del time - solo tomar la hora de inicio si viene con rango
    const cleanTime = time.includes('-') ? time.split('-')[0].trim() : time
    
    // Verificar que el slot comienza en hora puntual (XX:00)
    const [, minutes] = cleanTime.split(':').map(Number)
    if (minutes !== 0) {
      toast.error('Solo puedes seleccionar clases que comiencen en horas puntuales (XX:00)')
      return
    }
    
    const slotKey = `${day}_${cleanTime}`

    const newSelectedSlots = new Set(selectedSlots)

    if (newSelectedSlots.has(slotKey)) {
      newSelectedSlots.delete(slotKey)
    } else {
      if (newSelectedSlots.size >= classesPerWeek) {
        toast.error(
          `Solo puedes seleccionar ${classesPerWeek} ${classesPerWeek === 1 ? 'clase' : 'clases'} por semana`
        )
        return
      }
      newSelectedSlots.add(slotKey)
    }

    setSelectedSlots(newSelectedSlots)
  }

  // Convertir disponibilidad del profesor al formato esperado por WeeklyView
  const teacherAvailability: Record<string, AvailabilityRange[]> = selectedTeacher
    ? Object.entries(selectedTeacher.availability).reduce(
        (acc, [day, slots]) => {
          acc[day] = slots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          }))
          return acc
        },
        {} as Record<string, AvailabilityRange[]>
      )
    : {}

  // Convertir slots seleccionados al formato de bookedSlots
  // También incluir los slots ya ocupados del profesor para que se muestren como no disponibles
  const bookedSlots: Record<string, string[]> = {}
  
  // Primero agregar los slots ocupados del profesor
  if (selectedTeacher?.bookedSlots) {
    Object.entries(selectedTeacher.bookedSlots).forEach(([day, slots]) => {
      if (!bookedSlots[day]) {
        bookedSlots[day] = []
      }
      slots.forEach((slot) => {
        // Agregar el rango completo HH:MM-HH:MM para que isSlotOverlappingWithBookings funcione correctamente
        bookedSlots[day].push(`${slot.startTime}-${slot.endTime}`)
      })
    })
  }
  
  // Luego agregar los slots seleccionados por el usuario
  selectedSlots.forEach((slotKey) => {
    const [day, time] = slotKey.split('_')
    // Validar que day y time existan
    if (day && time) {
      if (!bookedSlots[day]) {
        bookedSlots[day] = []
      }
      bookedSlots[day].push(time)
    }
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando disponibilidad de profesores...</p>
        </CardContent>
      </Card>
    )
  }

  if (teachers.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay profesores disponibles para este curso en este momento.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selección de Profesor */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona tu Profesor</CardTitle>
          <CardDescription>Elige el profesor con el que deseas tomar tus clases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <Card
                key={teacher.id}
                className={`cursor-pointer transition-all ${
                  selectedTeacher?.id === teacher.id
                    ? 'border-primary shadow-md'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => {
                  setSelectedTeacher(teacher)
                  setSelectedSlots(new Set()) // Reset selections when changing teacher
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={teacher.image || undefined} />
                      <AvatarFallback>{teacher.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{teacher.name}</h4>
                        {selectedTeacher?.id === teacher.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      {teacher.rank && (
                        <Badge variant="secondary" className="mt-1">
                          {teacher.rank.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Botón para abrir calendario */}
      {selectedTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona tu Horario</CardTitle>
            <CardDescription>
              Selecciona {classesPerWeek} {classesPerWeek === 1 ? 'horario' : 'horarios'} por
              semana. Cada clase tiene una duración de {classDuration} minutos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCalendarOpen(true)} className="w-full" size="lg">
              <Calendar className="h-5 w-5 mr-2" />
              {selectedSlots.size === 0
                ? 'Abrir Calendario de Horarios'
                : `Ver Calendario (${selectedSlots.size}/${classesPerWeek} seleccionados)`}
            </Button>

            {selectedSlots.size > 0 && (
              <Alert className="mt-4">
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Has seleccionado {selectedSlots.size} de {classesPerWeek} horarios. Haz clic en el
                  botón para modificar tu selección.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal del Calendario */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-none w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecciona tu Horario de Clases</DialogTitle>
            <DialogDescription>
              Haz clic en los bloques disponibles para seleccionar tus horarios. Necesitas
              seleccionar {classesPerWeek} {classesPerWeek === 1 ? 'clase' : 'clases'} por semana.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  Seleccionados: {selectedSlots.size} / {classesPerWeek}
                </span>
              </div>
              {selectedSlots.size > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedSlots(new Set())}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar Todo
                </Button>
              )}
            </div>

            <WeeklyView
              userRole={UserRole.STUDENT}
              teacherAvailability={teacherAvailability}
              bookedSlots={bookedSlots}
              onSlotAction={handleSlotClick}
              slotDuration={classDuration}
              startHour={8}
              endHour={22}
              isDragging={false}
              onStartDrag={() => {}}
              onDrag={() => {}}
              onEndDrag={() => {}}
              bookingMode={`${classDuration}min`}
              is12HourFormat={false}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCalendarOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedSlots.size === classesPerWeek) {
                    setIsCalendarOpen(false)
                    toast.success('Horarios seleccionados correctamente')
                  } else {
                    toast.error(
                      `Debes seleccionar exactamente ${classesPerWeek} ${
                        classesPerWeek === 1 ? 'horario' : 'horarios'
                      }`
                    )
                  }
                }}
                disabled={selectedSlots.size !== classesPerWeek}
              >
                Confirmar Selección ({selectedSlots.size}/{classesPerWeek})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resumen de Selección */}
      {selectedSlots.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de tu Horario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(selectedSlots)
                .sort()
                .map((slotKey) => {
                  const [day, time] = slotKey.split('_')
                  const dayOfWeek = DAYS_OF_WEEK_MAP[day]
                  const dayName = DAY_NAMES_ES[dayOfWeek]

                  // Limpiar el formato del time - solo tomar la hora de inicio
                  const cleanTime = time.includes('-') ? time.split('-')[0].trim() : time

                  // Parsear hora de inicio
                  const timeParts = cleanTime.split(':')
                  const hours = parseInt(timeParts[0], 10)
                  const minutes = parseInt(timeParts[1], 10)

                  // Calcular hora de fin correctamente
                  const totalMinutes = hours * 60 + minutes + classDuration
                  const endHours = Math.floor(totalMinutes / 60)
                  const endMinutes = totalMinutes % 60
                  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

                  return (
                    <div
                      key={slotKey}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{dayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {cleanTime} - {endTime}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSlotClick(day, cleanTime)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
            </div>

            {calculating && (
              <div className="mt-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Calculando precio...</p>
              </div>
            )}

            {proration && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Precio original:</span>
                  <span className="text-sm line-through">
                    ${proration.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Clases restantes:</span>
                  <span className="text-sm">
                    {proration.classesFromNow} de {proration.totalClassesInFullPeriod}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Precio prorrateado:</span>
                  <span className="text-primary">${proration.proratedPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ahorro: ${(proration.originalPrice - proration.proratedPrice).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
