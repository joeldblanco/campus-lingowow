'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, AlertCircle, Calendar, Check, User, X, GripVertical, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { addDays, startOfWeek, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { convertRecurringScheduleToUTC } from '@/lib/utils/date'

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
}

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

interface CheckoutScheduleSelectorProps {
  planId: string
  courseId: string
  classDuration?: number
  maxClassesPerWeek?: number
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

const WEEKDAYS = [
  { key: 'monday', label: 'LUN', index: 0 },
  { key: 'tuesday', label: 'MAR', index: 1 },
  { key: 'wednesday', label: 'MIÉ', index: 2 },
  { key: 'thursday', label: 'JUE', index: 3 },
  { key: 'friday', label: 'VIE', index: 4 },
  { key: 'saturday', label: 'SÁB', index: 5 },
  { key: 'sunday', label: 'DOM', index: 6 },
]

const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 6; hour < 23; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

type SlotKey = `${string}-${string}`

export function CheckoutScheduleSelector({
  planId,
  courseId,
  classDuration = 40,
  maxClassesPerWeek,
  onScheduleSelected,
}: CheckoutScheduleSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ dayIndex: number; timeIndex: number } | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())
  const [tempSelectedSlots, setTempSelectedSlots] = useState<Set<SlotKey>>(new Set())
  
  const [showMultiEditPopover, setShowMultiEditPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch(`/api/teachers/availability?courseId=${courseId}&timezone=${encodeURIComponent(userTimezone)}`)
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

  const isSlotAvailable = useCallback((dayKey: string, time: string): boolean => {
    if (!selectedTeacher) return false
    const dayAvailability = selectedTeacher.availability[dayKey] || []
    
    const [slotHour] = time.split(':').map(Number)
    const slotEndHour = slotHour + Math.ceil(classDuration / 60)
    
    return dayAvailability.some((range) => {
      const [startHour] = range.startTime.split(':').map(Number)
      const [endHour] = range.endTime.split(':').map(Number)
      return slotHour >= startHour && slotEndHour <= endHour
    })
  }, [selectedTeacher, classDuration])

  const calculateSelectedSlots = useCallback((start: { dayIndex: number; timeIndex: number }, end: { dayIndex: number; timeIndex: number }) => {
    const minDay = Math.min(start.dayIndex, end.dayIndex)
    const maxDay = Math.max(start.dayIndex, end.dayIndex)
    const minTime = Math.min(start.timeIndex, end.timeIndex)
    const maxTime = Math.max(start.timeIndex, end.timeIndex)
    
    const slots = new Set<SlotKey>()
    
    for (let d = minDay; d <= maxDay; d++) {
      for (let t = minTime; t <= maxTime; t++) {
        const dayKey = WEEKDAYS[d].key
        const time = TIME_SLOTS[t]
        
        if (isSlotAvailable(dayKey, time)) {
          slots.add(`${dayKey}-${time}` as SlotKey)
        }
      }
    }
    
    return slots
  }, [isSlotAvailable])

  const handleMouseDown = (dayIndex: number, timeIndex: number) => {
    const dayKey = WEEKDAYS[dayIndex].key
    const time = TIME_SLOTS[timeIndex]
    
    if (!isSlotAvailable(dayKey, time)) return
    
    setIsDragging(true)
    setDragStart({ dayIndex, timeIndex })
    setTempSelectedSlots(new Set([`${dayKey}-${time}` as SlotKey]))
    setShowMultiEditPopover(false)
  }

  const handleMouseEnter = (dayIndex: number, timeIndex: number) => {
    if (!isDragging || !dragStart) return
    setTempSelectedSlots(calculateSelectedSlots(dragStart, { dayIndex, timeIndex }))
  }

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (tempSelectedSlots.size > 0) {
      if (tempSelectedSlots.size === 1) {
        const slotKey = Array.from(tempSelectedSlots)[0]
        setSelectedSlots(prev => {
          const newSet = new Set(prev)
          if (newSet.has(slotKey)) {
            newSet.delete(slotKey)
          } else {
            // Check max classes limit before adding
            const maxSlots = maxClassesPerWeek || Infinity
            if (newSet.size >= maxSlots) {
              toast.error(`Máximo ${maxSlots} clases por semana permitidas`)
              return prev
            }
            newSet.add(slotKey)
          }
          return newSet
        })
        setTempSelectedSlots(new Set())
      } else {
        setPopoverPosition({ top: e.clientY, left: e.clientX })
        setShowMultiEditPopover(true)
      }
    }
    
    setDragStart(null)
  }, [isDragging, tempSelectedSlots, maxClassesPerWeek])

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleMouseUp])

  const applyMultiAdd = () => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      const maxSlots = maxClassesPerWeek || Infinity
      
      for (const slot of tempSelectedSlots) {
        if (newSet.size >= maxSlots) {
          toast.error(`Máximo ${maxSlots} clases por semana permitidas`)
          break
        }
        if (!newSet.has(slot)) {
          newSet.add(slot)
        }
      }
      
      return newSet
    })
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
  }

  const applyMultiRemove = () => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      tempSelectedSlots.forEach(slot => newSet.delete(slot))
      return newSet
    })
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
  }

  const cancelMultiEdit = () => {
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
    setDragStart(null)
  }

  const getWeeklySchedule = (): ScheduleSlot[] => {
    if (!selectedTeacher) return []
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    return Array.from(selectedSlots).map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const dayOfWeek = DAYS_OF_WEEK_MAP[day]
      const [hours, minutes] = time.split(':').map(Number)

      const totalMinutes = hours * 60 + minutes + classDuration
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

      // Convert local time to UTC before sending to server
      const utcSchedule = convertRecurringScheduleToUTC(
        dayOfWeek,
        time,
        endTime,
        userTimezone
      )

      return {
        teacherId: selectedTeacher.id,
        dayOfWeek: utcSchedule.dayOfWeek,
        startTime: utcSchedule.startTime,
        endTime: utcSchedule.endTime,
      }
    })
  }

  const handleConfirmSchedule = async () => {
    if (!selectedTeacher || selectedSlots.size === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }

    // Validar que se seleccione exactamente el número de clases requerido
    if (maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek) {
      toast.error(`Debes seleccionar exactamente ${maxClassesPerWeek} clases por semana`)
      return
    }

    try {
      setCalculating(true)
      const schedule = getWeeklySchedule()
      
      const response = await fetch('/api/plans/calculate-proration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          schedule,
        }),
      })

      if (!response.ok) throw new Error('Error al calcular prorrateo')

      const proration: ProrationResult = await response.json()
      onScheduleSelected(schedule, proration)
      toast.success('Horario seleccionado correctamente')
    } catch (error) {
      console.error('Error calculating proration:', error)
      toast.error('Error al calcular el prorrateo')
    } finally {
      setCalculating(false)
    }
  }

  const getSlotContent = (dayKey: string, time: string, dayIndex: number, timeIndex: number) => {
    const isAvailable = isSlotAvailable(dayKey, time)
    const slotKey = `${dayKey}-${time}` as SlotKey
    const isSelected = selectedSlots.has(slotKey)
    const isInTempSelection = tempSelectedSlots.has(slotKey)

    if (!isAvailable) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
          <Ban className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        </div>
      )
    }

    const slotClasses = cn(
      "w-full h-full flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer select-none",
      isInTempSelection && "ring-2 ring-primary ring-offset-1 scale-95",
      isSelected && "bg-primary/20 border-primary",
      !isSelected && "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
    )

    return (
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleMouseDown(dayIndex, timeIndex)
        }}
        onMouseEnter={() => handleMouseEnter(dayIndex, timeIndex)}
        className={slotClasses}
      >
        {isSelected ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <span className="text-xs text-green-600 dark:text-green-400">Disponible</span>
        )}
      </div>
    )
  }

  const getSelectionSummary = () => {
    if (tempSelectedSlots.size === 0) return ''
    
    const days = new Set<string>()
    const times = new Set<string>()
    
    tempSelectedSlots.forEach((slotKey) => {
      const [day, time] = slotKey.split('-') as [string, string]
      days.add(WEEKDAYS.find(w => w.key === day)?.label || day)
      times.add(time)
    })
    
    const sortedTimes = Array.from(times).sort()
    const minTime = sortedTimes[0]
    const maxTime = sortedTimes[sortedTimes.length - 1]
    const maxTimeHour = parseInt(maxTime.split(':')[0]) + 1
    const maxTimeFormatted = `${String(maxTimeHour).padStart(2, '0')}:00`
    
    return `${Array.from(days).join(', ')} • ${minTime} - ${maxTimeFormatted}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Cargando disponibilidad de profesores...</p>
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <Alert variant="destructive">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Seleccionar Profesor
          </CardTitle>
          <CardDescription>
            Elige el profesor que impartirá tus clases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedTeacher?.id === teacher.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => {
                  setSelectedTeacher(teacher)
                  setSelectedSlots(new Set())
                  setTempSelectedSlots(new Set())
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={teacher.image || undefined} />
                  <AvatarFallback>{teacher.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{teacher.name}</span>
                    {selectedTeacher?.id === teacher.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {teacher.bio && (
                    <p className="text-sm text-muted-foreground truncate">{teacher.bio}</p>
                  )}
                </div>
                {teacher.rank && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    {teacher.rank.name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selección de Horario con Grid */}
      {selectedTeacher && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Seleccionar Horario
              </div>
              {maxClassesPerWeek && (
                <Badge variant={selectedSlots.size >= maxClassesPerWeek ? "default" : "secondary"}>
                  {selectedSlots.size} / {maxClassesPerWeek} clases
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Arrastra para seleccionar múltiples bloques. Cada clase dura {classDuration} minutos.
              {maxClassesPerWeek && ` Máximo ${maxClassesPerWeek} clases por semana.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between gap-4 px-2 py-2 border-b bg-muted/30 rounded-t-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span>Arrastra para seleccionar múltiples bloques</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
                  <span className="text-xs text-muted-foreground">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-primary/20 border-2 border-primary" />
                  <span className="text-xs text-muted-foreground">Seleccionado</span>
                </div>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="overflow-y-auto rounded-lg border" style={{ maxHeight: '400px' }}>
              <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/80 backdrop-blur">
                    <th className="w-[60px] px-1 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                      Hora
                    </th>
                    {WEEKDAYS.map(({ key, label, index }) => {
                      const dayDate = addDays(weekStart, index)
                      const isCurrentDay = isToday(dayDate)
                      
                      return (
                        <th
                          key={key}
                          className={cn(
                            "px-1 py-2 text-center",
                            isCurrentDay && "bg-primary/10"
                          )}
                        >
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-xs font-medium uppercase",
                              isCurrentDay ? "text-primary font-bold" : "text-muted-foreground"
                            )}>
                              {label}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {TIME_SLOTS.map((time, timeIndex) => (
                    <tr key={time}>
                      <td className="w-[60px] px-1 py-1 text-center align-middle text-xs font-medium text-muted-foreground border-r bg-card h-10">
                        {time}
                      </td>
                      {WEEKDAYS.map(({ key, index }) => {
                        const dayDate = addDays(weekStart, index)
                        const isCurrentDay = isToday(dayDate)

                        return (
                          <td
                            key={`${key}-${time}`}
                            className={cn(
                              "p-1 align-top h-10 border-r",
                              isCurrentDay && "bg-primary/5"
                            )}
                          >
                            {getSlotContent(key, time, index, timeIndex)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSlots.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedSlots.size} horario(s) seleccionado(s) por semana
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedSlots(new Set())}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-selection popover */}
      {showMultiEditPopover && popoverPosition && (
        <div 
          ref={popoverRef}
          className="fixed z-50 bg-popover border rounded-lg shadow-lg p-4 w-72"
          style={{ 
            top: Math.min(popoverPosition.top, window.innerHeight - 200),
            left: Math.min(popoverPosition.left, window.innerWidth - 300)
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Selección múltiple</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelMultiEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              {getSelectionSummary()} ({tempSelectedSlots.size} bloques)
            </p>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={applyMultiAdd}>
                <Check className="h-4 w-4 mr-1" />
                Agregar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={applyMultiRemove}>
                <X className="h-4 w-4 mr-1" />
                Quitar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de Selección */}
      {selectedSlots.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tu Horario Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from(selectedSlots)
                .sort()
                .map((slotKey) => {
                  const [day, time] = slotKey.split('-')
                  const dayOfWeek = DAYS_OF_WEEK_MAP[day]
                  const dayName = DAY_NAMES_ES[dayOfWeek]

                  const [hours, minutes] = time.split(':').map(Number)
                  const totalMinutes = hours * 60 + minutes + classDuration
                  const endHours = Math.floor(totalMinutes / 60)
                  const endMinutes = totalMinutes % 60
                  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

                  return (
                    <div
                      key={slotKey}
                      className="flex items-center justify-between p-2 border rounded-lg text-sm"
                    >
                      <div>
                        <p className="font-medium">{dayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {time} - {endTime}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedSlots(prev => {
                            const newSet = new Set(prev)
                            newSet.delete(slotKey)
                            return newSet
                          })
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón Confirmar */}
      {selectedSlots.size > 0 && (
        <div className="space-y-2">
          {maxClassesPerWeek && selectedSlots.size !== maxClassesPerWeek && (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
              Debes seleccionar exactamente {maxClassesPerWeek} clases ({selectedSlots.size} seleccionadas)
            </p>
          )}
          <Button
            onClick={handleConfirmSchedule}
            disabled={calculating || (maxClassesPerWeek ? selectedSlots.size !== maxClassesPerWeek : false)}
            className="w-full"
            size="lg"
          >
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando precio...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirmar Horario
              </>
            )}
          </Button>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-crosshair" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  )
}
