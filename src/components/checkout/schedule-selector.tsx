'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, Clock, DollarSign, BookOpen, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
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

interface ScheduleSelectorProps {
  planId: string
  courseId: string
  onScheduleSelected: (schedule: ScheduleSlot[], proration: ProrationResult) => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', apiKey: 'sunday' },
  { value: 1, label: 'Lunes', apiKey: 'monday' },
  { value: 2, label: 'Martes', apiKey: 'tuesday' },
  { value: 3, label: 'Miércoles', apiKey: 'wednesday' },
  { value: 4, label: 'Jueves', apiKey: 'thursday' },
  { value: 5, label: 'Viernes', apiKey: 'friday' },
  { value: 6, label: 'Sábado', apiKey: 'saturday' },
]

export function ScheduleSelector({ planId, courseId, onScheduleSelected }: ScheduleSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedSlots, setSelectedSlots] = useState<ScheduleSlot[]>([])
  const [proration, setProration] = useState<ProrationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teachers/availability?courseId=${courseId}`)
      if (!response.ok) throw new Error('Error al cargar profesores')
      const data = await response.json()
      console.log('Teachers data received:', data)
      console.log('First teacher availability:', data[0]?.availability)
      setTeachers(data)
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

  const calculateProration = async () => {
    if (selectedSlots.length === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }

    try {
      setCalculating(true)
      const response = await fetch('/api/plans/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          schedule: selectedSlots,
        }),
      })

      if (!response.ok) throw new Error('Error al calcular prorrateo')

      const data: ProrationResult = await response.json()
      setProration(data)
      onScheduleSelected(selectedSlots, data)
      toast.success('Horario seleccionado correctamente')
    } catch (error) {
      console.error('Error calculating proration:', error)
      toast.error('Error al calcular el prorrateo')
    } finally {
      setCalculating(false)
    }
  }

  const toggleSlot = (teacherId: string, dayOfWeek: number, startTime: string, endTime: string) => {
    const existingIndex = selectedSlots.findIndex(
      (s) => s.teacherId === teacherId && s.dayOfWeek === dayOfWeek && s.startTime === startTime
    )

    if (existingIndex >= 0) {
      setSelectedSlots(selectedSlots.filter((_, i) => i !== existingIndex))
    } else {
      setSelectedSlots([...selectedSlots, { teacherId, dayOfWeek, startTime, endTime }])
    }
    setProration(null) // Reset proration when schedule changes
  }

  const isSlotSelected = (teacherId: string, dayOfWeek: number, startTime: string) => {
    return selectedSlots.some(
      (s) => s.teacherId === teacherId && s.dayOfWeek === dayOfWeek && s.startTime === startTime
    )
  }

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
      <Card>
        <CardHeader>
          <CardTitle>Selecciona tu Horario de Clases</CardTitle>
          <CardDescription>
            Elige los días y horarios que mejor se adapten a tu disponibilidad. Puedes seleccionar
            múltiples horarios por semana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={teacher.image || undefined} />
                    <AvatarFallback>{teacher.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{teacher.name}</h4>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    {teacher.rank && (
                      <Badge variant="secondary" className="mt-1">
                        {teacher.rank.name}
                      </Badge>
                    )}
                    {teacher.bio && (
                      <p className="text-sm text-muted-foreground mt-2">{teacher.bio}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.filter(day => {
                    const slots = teacher.availability[day.apiKey] || []
                    return slots.length > 0
                  }).length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Este profesor no tiene disponibilidad configurada en este momento.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    DAYS_OF_WEEK.map((day) => {
                      const slots = teacher.availability[day.apiKey] || []
                      if (slots.length === 0) return null

                      return (
                        <div key={day.value} className="space-y-2">
                          <div className="font-medium text-sm">
                            {day.label} ({slots.length} {slots.length === 1 ? 'horario' : 'horarios'})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot, idx) => {
                              const selected = isSlotSelected(
                                teacher.id,
                                day.value,
                                slot.startTime
                              )
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                    selected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() =>
                                    toggleSlot(teacher.id, day.value, slot.startTime, slot.endTime)
                                  }
                                >
                                  <Checkbox checked={selected} />
                                  <Clock className="h-3 w-3" />
                                  <span className="text-sm">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedSlots.length > 0 && (
            <div className="mt-6">
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Has seleccionado {selectedSlots.length} horario(s) por semana
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSlots.length > 0 && !proration && (
        <Button
          onClick={calculateProration}
          disabled={calculating}
          className="w-full"
          size="lg"
        >
          {calculating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Calcular Precio y Clases
            </>
          )}
        </Button>
      )}

      {proration && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resumen de tu Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Clases por Semana</div>
                <div className="text-2xl font-bold">{proration.classesPerWeek}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total de Clases</div>
                <div className="text-2xl font-bold">{proration.classesFromNow}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Precio Original</span>
                <span className="line-through">${proration.originalPrice.toFixed(2)}</span>
              </div>
              {proration.allowProration && proration.proratedPrice !== proration.originalPrice && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Descuento por Prorrateo</span>
                    <span className="text-green-600">
                      -${(proration.originalPrice - proration.proratedPrice).toFixed(2)}
                    </span>
                  </div>
                  <Alert className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Solo pagarás por las {proration.classesFromNow} clases restantes hasta el fin
                      del período académico actual ({proration.weeksRemaining} semanas)
                    </AlertDescription>
                  </Alert>
                </>
              )}
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total a Pagar</span>
                <span className="text-primary">${proration.proratedPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
