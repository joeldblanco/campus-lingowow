'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Calendar, Check, User, ChevronLeft, ChevronRight, X, GripVertical, Ban, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { format, isBefore, parseISO, eachDayOfInterval, getDay, addDays, startOfWeek, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useTimezone } from '@/hooks/use-timezone'

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

interface ScheduledClass {
  date: string // YYYY-MM-DD
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string
}

interface ScheduleSelectorStepProps {
  courseId: string
  courseName: string
  classDuration: number
  academicPeriodId: string
  periodStartDate: Date
  periodEndDate: Date
  onScheduleConfirmed: (
    teacherId: string,
    scheduledClasses: ScheduledClass[],
    isRecurring: boolean,
    weeklySchedule: ScheduleSlot[]
  ) => void
  onBack: () => void
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

// Generate time slots for 24 hours (00:00 to 23:00)
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

type SlotKey = `${string}-${string}`

export function ScheduleSelectorStep({
  courseId,
  courseName,
  classDuration,
  periodStartDate,
  periodEndDate,
  onScheduleConfirmed,
  onBack,
}: ScheduleSelectorStepProps) {
  const { timezone: userTimezone } = useTimezone()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecurring, setIsRecurring] = useState(true)
  
  // Drag selection state (like AvailabilityEditView)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ dayIndex: number; timeIndex: number } | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())
  const [tempSelectedSlots, setTempSelectedSlots] = useState<Set<SlotKey>>(new Set())
  
  // Popover state for multi-selection
  const [showMultiEditPopover, setShowMultiEditPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Para modo no recurrente, permitir navegación de semanas
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const periodStart = new Date(periodStartDate)
    const startDate = isBefore(today, periodStart) ? periodStart : today
    return startOfWeek(startDate, { weekStartsOn: 1 })
  })

  const weekStart = isRecurring ? startOfWeek(new Date(), { weekStartsOn: 1 }) : currentWeekStart

  // Cargar profesores disponibles para el curso
  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
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
  }, [courseId, userTimezone])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  // Check if a time slot is within teacher's availability
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

  // Calculate selected slots based on drag start and end
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
        
        // Only include available slots
        if (isSlotAvailable(dayKey, time)) {
          slots.add(`${dayKey}-${time}` as SlotKey)
        }
      }
    }
    
    return slots
  }, [isSlotAvailable])

  // Handle mouse down on a slot
  const handleMouseDown = (dayIndex: number, timeIndex: number) => {
    const dayKey = WEEKDAYS[dayIndex].key
    const time = TIME_SLOTS[timeIndex]
    
    // Don't start drag on unavailable slots
    if (!isSlotAvailable(dayKey, time)) return
    
    setIsDragging(true)
    setDragStart({ dayIndex, timeIndex })
    setTempSelectedSlots(new Set([`${dayKey}-${time}` as SlotKey]))
    setShowMultiEditPopover(false)
  }

  // Handle mouse enter during drag
  const handleMouseEnter = (dayIndex: number, timeIndex: number) => {
    if (!isDragging || !dragStart) return
    
    setTempSelectedSlots(calculateSelectedSlots(dragStart, { dayIndex, timeIndex }))
  }

  // Handle mouse up - end drag and show popover or toggle
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (tempSelectedSlots.size > 0) {
      if (tempSelectedSlots.size === 1) {
        // Single slot - toggle directly
        const slotKey = Array.from(tempSelectedSlots)[0]
        setSelectedSlots(prev => {
          const newSet = new Set(prev)
          if (newSet.has(slotKey)) {
            newSet.delete(slotKey)
          } else {
            newSet.add(slotKey)
          }
          return newSet
        })
        setTempSelectedSlots(new Set())
      } else {
        // Multiple slots - show popover
        setPopoverPosition({ top: e.clientY, left: e.clientX })
        setShowMultiEditPopover(true)
      }
    }
    
    setDragStart(null)
  }, [isDragging, tempSelectedSlots])

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleMouseUp])

  // Apply multi-selection (add all)
  const applyMultiAdd = () => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      tempSelectedSlots.forEach(slot => newSet.add(slot))
      return newSet
    })
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
  }

  // Remove multi-selection
  const applyMultiRemove = () => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      tempSelectedSlots.forEach(slot => newSet.delete(slot))
      return newSet
    })
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
  }

  // Cancel multi-selection
  const cancelMultiEdit = () => {
    setShowMultiEditPopover(false)
    setTempSelectedSlots(new Set())
    setDragStart(null)
  }

  // Convertir slots seleccionados a ScheduleSlot[]
  const getWeeklySchedule = (): ScheduleSlot[] => {
    if (!selectedTeacher) return []
    
    return Array.from(selectedSlots).map((slotKey) => {
      const [day, time] = slotKey.split('-')
      const dayOfWeek = DAYS_OF_WEEK_MAP[day]
      const [hours, minutes] = time.split(':').map(Number)

      // Calcular hora de fin
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
  }

  // Calcular clases programadas basándose en el horario semanal y el período
  const calculateScheduledClasses = (): ScheduledClass[] => {
    if (!selectedTeacher || selectedSlots.size === 0) return []

    const weeklySchedule = getWeeklySchedule()

    if (!isRecurring) {
      // Para clases no recurrentes, usar las fechas específicas de la semana actual
      return weeklySchedule.map((slot) => {
        // Encontrar la fecha específica para este día de la semana en la semana actual
        const dayDate = addDays(currentWeekStart, WEEKDAYS.findIndex(w => DAYS_OF_WEEK_MAP[w.key] === slot.dayOfWeek))
        return {
          date: format(dayDate, 'yyyy-MM-dd'),
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: slot.teacherId,
        }
      }).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.startTime.localeCompare(b.startTime)
      })
    }

    // Generar todas las clases desde hoy (o inicio del período) hasta el fin del período
    const today = new Date()
    const startDate = isBefore(today, periodStartDate) ? periodStartDate : today
    const allDays = eachDayOfInterval({ start: startDate, end: periodEndDate })

    const classes: ScheduledClass[] = []

    allDays.forEach((date) => {
      const dayOfWeek = getDay(date)
      const matchingSlots = weeklySchedule.filter((s) => s.dayOfWeek === dayOfWeek)

      matchingSlots.forEach((slot) => {
        classes.push({
          date: format(date, 'yyyy-MM-dd'),
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: selectedTeacher.id,
        })
      })
    })

    return classes.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.startTime.localeCompare(b.startTime)
    })
  }

  const scheduledClasses = calculateScheduledClasses()

  // Confirmar selección
  const handleConfirm = () => {
    if (!selectedTeacher) {
      toast.error('Debes seleccionar un profesor')
      return
    }

    if (selectedSlots.size === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }

    onScheduleConfirmed(
      selectedTeacher.id,
      scheduledClasses,
      isRecurring,
      getWeeklySchedule()
    )
  }

  // Get slot content for the grid
  const getSlotContent = (dayKey: string, time: string, dayIndex: number, timeIndex: number, isDisabledDate: boolean = false) => {
    const isAvailable = isSlotAvailable(dayKey, time)
    const slotKey = `${dayKey}-${time}` as SlotKey
    const isSelected = selectedSlots.has(slotKey)
    const isInTempSelection = tempSelectedSlots.has(slotKey)

    // Para modo no recurrente, deshabilitar fechas pasadas o fuera del período
    if (isDisabledDate || !isAvailable) {
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

  // Get selection summary for popover
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
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay profesores disponibles para el curso &quot;{courseName}&quot;. 
            Por favor, asigna profesores al curso antes de crear inscripciones.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
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
            Elige el profesor que impartirá las clases
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
                  <p className="text-sm text-muted-foreground truncate">{teacher.email}</p>
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
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Seleccionar Horario
            </CardTitle>
            <CardDescription>
              Arrastra para seleccionar múltiples bloques. Cada clase dura {classDuration} minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setIsRecurring(checked === true)
                }}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                <span className="font-medium">Horario recurrente</span>
                <p className="text-sm text-muted-foreground">
                  Las clases se agendarán automáticamente cada semana hasta el fin del período
                </p>
              </Label>
            </div>

            {/* Legend and Navigation */}
            <div className="flex items-center justify-between gap-4 px-2 py-2 border-b bg-muted/30 rounded-t-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span>Arrastra para seleccionar múltiples bloques</span>
              </div>
              
              {/* Week Navigation - only for non-recurring */}
              {!isRecurring && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      const newStart = addDays(currentWeekStart, -7)
                      setCurrentWeekStart(newStart)
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium min-w-[180px] text-center">
                    {format(weekStart, "d MMM", { locale: es })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      const newStart = addDays(currentWeekStart, 7)
                      setCurrentWeekStart(newStart)
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
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
            <div className="overflow-auto rounded-lg border" style={{ maxHeight: '400px' }}>
              <table className="w-full min-w-[700px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/80 backdrop-blur">
                    <th className="w-16 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r">
                      Hora
                    </th>
                    {WEEKDAYS.map(({ key, label, index }) => {
                      const dayDate = addDays(weekStart, index)
                      const isCurrentDay = isToday(dayDate)
                      const isPastDate = isBefore(dayDate, new Date()) && !isToday(dayDate)
                      const isOutOfPeriod = !isRecurring && (isBefore(dayDate, periodStartDate) || isBefore(periodEndDate, dayDate))
                      
                      return (
                        <th
                          key={key}
                          className={cn(
                            "min-w-[80px] px-2 py-2 text-center",
                            !isRecurring && isCurrentDay && "bg-primary/10",
                            !isRecurring && (isPastDate || isOutOfPeriod) && "opacity-50"
                          )}
                        >
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-xs font-medium uppercase",
                              !isRecurring && isCurrentDay ? "text-primary font-bold" : "text-muted-foreground"
                            )}>
                              {label}
                            </span>
                            {!isRecurring && (
                              <span className={cn(
                                "text-lg font-bold",
                                isCurrentDay ? "text-primary" : "text-foreground"
                              )}>
                                {format(dayDate, 'd')}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {TIME_SLOTS.map((time, timeIndex) => (
                    <tr key={time}>
                      <td className="w-16 px-2 py-1 text-center align-middle text-xs font-medium text-muted-foreground border-r bg-card h-10">
                        {time}
                      </td>
                      {WEEKDAYS.map(({ key, index }) => {
                        const dayDate = addDays(weekStart, index)
                        const isCurrentDay = isToday(dayDate)
                        const isPastDate = !isRecurring && isBefore(dayDate, new Date()) && !isToday(dayDate)
                        const isOutOfPeriod = !isRecurring && (isBefore(dayDate, periodStartDate) || isBefore(periodEndDate, dayDate))
                        const isDisabledDate = !isRecurring && (isPastDate || isOutOfPeriod)

                        return (
                          <td
                            key={`${key}-${time}`}
                            className={cn(
                              "p-1 align-top h-10 border-r min-w-[80px]",
                              !isRecurring && isCurrentDay && "bg-primary/5",
                              isDisabledDate && "opacity-40"
                            )}
                          >
                            {getSlotContent(key, time, index, timeIndex, isDisabledDate)}
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
                    {selectedSlots.size} horarios seleccionados
                    {isRecurring && ` • ${scheduledClasses.length} clases totales`}
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
            <CardTitle className="text-base">Resumen del Horario Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from(selectedSlots)
                .sort()
                .map((slotKey) => {
                  const [day, time] = slotKey.split('-')
                  const dayOfWeek = DAYS_OF_WEEK_MAP[day]
                  const dayName = DAY_NAMES_ES[dayOfWeek]

                  // Calcular hora de fin
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

            {isRecurring && scheduledClasses.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {scheduledClasses.length} clases a programar
                </p>
                <p className="text-xs text-muted-foreground">
                  Hasta {format(periodEndDate, "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Previa de Clases */}
      {selectedTeacher && scheduledClasses.length > 0 && isRecurring && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vista Previa de Clases</CardTitle>
            <CardDescription>
              Primeras 10 clases de {scheduledClasses.length} totales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {scheduledClasses.slice(0, 10).map((cls) => (
                <div
                  key={`${cls.date}-${cls.startTime}`}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">
                      {format(parseISO(cls.date), "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {cls.startTime} - {cls.endTime}
                  </Badge>
                </div>
              ))}
              {scheduledClasses.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ... y {scheduledClasses.length - 10} clases más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedTeacher || selectedSlots.size === 0}
        >
          Confirmar y Crear Inscripción
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Overlay when dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-crosshair" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  )
}
