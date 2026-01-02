'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Clock, X, Check, Ban, GripVertical } from 'lucide-react'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ScheduleLesson } from '@/types/schedule'

interface AvailabilityEditViewProps {
  currentDate: Date
  lessons: ScheduleLesson[]
  initialAvailability: Array<{ day: string; startTime: string; endTime: string }>
  onSave: (slots: Array<{ day: string; startTime: string; endTime: string; available: boolean }>) => Promise<void>
  onDiscard: () => void
  isSaving?: boolean
}

// Generate 24-hour time slots
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

const WEEKDAYS = [
  { key: 'monday', label: 'LUN', index: 0 },
  { key: 'tuesday', label: 'MAR', index: 1 },
  { key: 'wednesday', label: 'MIÉ', index: 2 },
  { key: 'thursday', label: 'JUE', index: 3 },
  { key: 'friday', label: 'VIE', index: 4 },
  { key: 'saturday', label: 'SÁB', index: 5 },
  { key: 'sunday', label: 'DOM', index: 6 },
]

type SlotKey = `${string}-${string}`

export function AvailabilityEditView({
  currentDate,
  lessons,
  initialAvailability,
  onSave,
}: AvailabilityEditViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  
  // Initialize availability state - only 'available' or 'blocked'
  const [availability, setAvailability] = useState<Record<string, Record<string, 'available' | 'blocked'>>>(() => {
    const initial: Record<string, Record<string, 'available' | 'blocked'>> = {}
    
    WEEKDAYS.forEach(({ key }) => {
      initial[key] = {}
      TIME_SLOTS.forEach((time) => {
        initial[key][time] = 'blocked'
      })
    })

    initialAvailability.forEach((slot) => {
      const day = slot.day.toLowerCase()
      if (initial[day]) {
        initial[day][slot.startTime] = 'available'
      }
    })

    return initial
  })

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ dayIndex: number; timeIndex: number } | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set())
  
  // Popover state for multi-selection
  const [showMultiEditPopover, setShowMultiEditPopover] = useState(false)
  const [multiEditStatus, setMultiEditStatus] = useState<'available' | 'blocked'>('available')
  const popoverAnchorRef = useRef<HTMLDivElement>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)

  // Single slot selection (for click)
  const [selectedSingleSlot, setSelectedSingleSlot] = useState<{ day: string; time: string; dayDate: Date } | null>(null)
  const [singleEditStatus, setSingleEditStatus] = useState<'available' | 'blocked'>('available')

  // Check if a slot has a booked lesson
  const getBookedLesson = useCallback((dayDate: Date, time: string): ScheduleLesson | undefined => {
    return lessons.find((lesson) => {
      const lessonDate = new Date(lesson.date)
      return (
        lessonDate.toDateString() === dayDate.toDateString() &&
        lesson.startTime === time &&
        lesson.status !== 'cancelled'
      )
    })
  }, [lessons])

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
        const dayDate = addDays(weekStart, d)
        
        // Don't include booked slots
        if (!getBookedLesson(dayDate, time)) {
          slots.add(`${dayKey}-${time}` as SlotKey)
        }
      }
    }
    
    return slots
  }, [weekStart, getBookedLesson])

  // Handle mouse down on a slot
  const handleMouseDown = (dayIndex: number, timeIndex: number, dayDate: Date) => {
    const dayKey = WEEKDAYS[dayIndex].key
    const time = TIME_SLOTS[timeIndex]
    
    // Don't start drag on booked slots
    if (getBookedLesson(dayDate, time)) return
    
    setIsDragging(true)
    setDragStart({ dayIndex, timeIndex })
    setSelectedSlots(new Set([`${dayKey}-${time}` as SlotKey]))
    setSelectedSingleSlot(null)
    setShowMultiEditPopover(false)
  }

  // Handle mouse enter during drag
  const handleMouseEnter = (dayIndex: number, timeIndex: number) => {
    if (!isDragging || !dragStart) return
    
    setSelectedSlots(calculateSelectedSlots(dragStart, { dayIndex, timeIndex }))
  }

  // Handle mouse up - end drag and show popover
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (selectedSlots.size > 0) {
      // Determine the most common status in selected slots
      let availableCount = 0
      let blockedCount = 0
      
      selectedSlots.forEach((slotKey) => {
        const [day, time] = slotKey.split('-') as [string, string]
        const status = availability[day]?.[time] || 'blocked'
        if (status === 'available') availableCount++
        else blockedCount++
      })
      
      // Default to the opposite of the majority
      setMultiEditStatus(availableCount > blockedCount ? 'blocked' : 'available')
      
      // Position popover near mouse
      setPopoverPosition({ top: e.clientY, left: e.clientX })
      setShowMultiEditPopover(true)
    }
  }, [isDragging, selectedSlots, availability])

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleMouseUp(e)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleMouseUp])

  // Apply multi-selection edit
  const applyMultiEdit = () => {
    setAvailability((prev) => {
      const newAvailability = { ...prev }
      
      selectedSlots.forEach((slotKey) => {
        const [day, time] = slotKey.split('-') as [string, string]
        if (!newAvailability[day]) {
          newAvailability[day] = {}
        }
        newAvailability[day][time] = multiEditStatus
      })
      
      return newAvailability
    })
    
    setShowMultiEditPopover(false)
    setSelectedSlots(new Set())
    setDragStart(null)
  }

  // Cancel multi-selection
  const cancelMultiEdit = () => {
    setShowMultiEditPopover(false)
    setSelectedSlots(new Set())
    setDragStart(null)
  }

  // Handle single slot click
  const handleSlotClick = (dayKey: string, time: string, dayDate: Date) => {
    // If we just finished a drag, don't open single edit
    if (selectedSlots.size > 1) return
    
    const bookedLesson = getBookedLesson(dayDate, time)
    if (bookedLesson) return

    setSelectedSingleSlot({ day: dayKey, time, dayDate })
    const currentStatus = availability[dayKey]?.[time] || 'blocked'
    setSingleEditStatus(currentStatus)
  }

  // Apply single slot edit
  const applySingleEdit = () => {
    if (!selectedSingleSlot) return

    setAvailability((prev) => {
      const newAvailability = { ...prev }
      if (!newAvailability[selectedSingleSlot.day]) {
        newAvailability[selectedSingleSlot.day] = {}
      }
      newAvailability[selectedSingleSlot.day][selectedSingleSlot.time] = singleEditStatus
      return newAvailability
    })
    setSelectedSingleSlot(null)
  }

  // Toggle single slot (quick action)
  const toggleSingleSlot = () => {
    if (!selectedSingleSlot) return
    
    const currentStatus = availability[selectedSingleSlot.day]?.[selectedSingleSlot.time] || 'blocked'
    const newStatus = currentStatus === 'available' ? 'blocked' : 'available'
    
    setAvailability((prev) => {
      const newAvailability = { ...prev }
      if (!newAvailability[selectedSingleSlot.day]) {
        newAvailability[selectedSingleSlot.day] = {}
      }
      newAvailability[selectedSingleSlot.day][selectedSingleSlot.time] = newStatus
      return newAvailability
    })
    setSelectedSingleSlot(null)
  }

  // Expose save functionality
  const getSlotsForSave = () => {
    const slots: Array<{ day: string; startTime: string; endTime: string; available: boolean }> = []
    
    Object.entries(availability).forEach(([day, times]) => {
      Object.entries(times).forEach(([time, status]) => {
        const [hours] = time.split(':').map(Number)
        const endTime = `${String(hours + 1).padStart(2, '0')}:00`
        
        slots.push({
          day,
          startTime: time,
          endTime,
          available: status === 'available',
        })
      })
    })

    return slots
  }

  const handleParentSave = async () => {
    await onSave(getSlotsForSave())
  }

  ;(window as unknown as { __availabilitySave?: () => Promise<void> }).__availabilitySave = handleParentSave

  const getSlotContent = (dayKey: string, time: string, dayDate: Date, dayIndex: number, timeIndex: number) => {
    const bookedLesson = getBookedLesson(dayDate, time)
    const status = availability[dayKey]?.[time] || 'blocked'
    const slotKey = `${dayKey}-${time}` as SlotKey
    const isInSelection = selectedSlots.has(slotKey)
    const isSingleSelected = selectedSingleSlot?.day === dayKey && selectedSingleSlot?.time === time

    if (bookedLesson) {
      const fullName = `${bookedLesson.student.name} ${bookedLesson.student.lastName || ''}`.trim()
      return (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 cursor-not-allowed opacity-70">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 text-center truncate w-full px-1">
            {fullName}
          </span>
          <Badge variant="secondary" className="text-[9px] mt-1">
            Reservado
          </Badge>
        </div>
      )
    }

    const slotClasses = cn(
      "w-full h-full flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer select-none",
      isInSelection && "ring-2 ring-primary ring-offset-1 scale-95",
      isSingleSelected && "ring-2 ring-primary ring-offset-2",
      status === 'available' && "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30",
      status === 'blocked' && "bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700/50"
    )

    const content = (
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleMouseDown(dayIndex, timeIndex, dayDate)
        }}
        onMouseEnter={() => handleMouseEnter(dayIndex, timeIndex)}
        onClick={() => {
          if (!isDragging && selectedSlots.size <= 1) {
            handleSlotClick(dayKey, time, dayDate)
          }
        }}
        className={slotClasses}
      >
        {status === 'available' && (
          <>
            <Check className="h-4 w-4 text-green-600 dark:text-green-400 mb-1" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Disponible
            </span>
          </>
        )}
        {status === 'blocked' && (
          <>
            <Ban className="h-4 w-4 text-slate-400 dark:text-slate-500 mb-1" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bloqueado
            </span>
          </>
        )}
      </div>
    )

    // Wrap with popover if single selected
    if (isSingleSelected && !showMultiEditPopover) {
      return (
        <Popover open={true} onOpenChange={(open) => !open && setSelectedSingleSlot(null)}>
          <PopoverTrigger asChild>
            {content}
          </PopoverTrigger>
          <PopoverContent className="w-72" align="center">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Editar Disponibilidad</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedSingleSlot(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {WEEKDAYS.find(w => w.key === selectedSingleSlot.day)?.label}, {selectedSingleSlot.time} - {
                    `${String(parseInt(selectedSingleSlot.time.split(':')[0]) + 1).padStart(2, '0')}:00`
                  }
                </span>
              </div>

              <RadioGroup value={singleEditStatus} onValueChange={(v) => setSingleEditStatus(v as 'available' | 'blocked')}>
                <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="available" id="single-available" />
                  <Label htmlFor="single-available" className="flex items-center gap-2 flex-1 cursor-pointer">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    Disponible
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="blocked" id="single-blocked" />
                  <Label htmlFor="single-blocked" className="flex items-center gap-2 flex-1 cursor-pointer">
                    <div className="h-3 w-3 rounded-full bg-slate-400" />
                    Bloqueado
                  </Label>
                </div>
              </RadioGroup>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                La disponibilidad se aplica semanalmente para este día.
              </p>

              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={toggleSingleSlot}>
                  Alternar
                </Button>
                <Button size="sm" onClick={applySingleEdit}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    return content
  }

  // Get selection summary for popover
  const getSelectionSummary = () => {
    if (selectedSlots.size === 0) return ''
    
    const days = new Set<string>()
    const times = new Set<string>()
    
    selectedSlots.forEach((slotKey) => {
      const [day, time] = slotKey.split('-') as [string, string]
      days.add(WEEKDAYS.find(w => w.key === day)?.label || day)
      times.add(time)
    })
    
    const sortedTimes = Array.from(times).sort()
    const minTime = sortedTimes[0]
    const maxTime = sortedTimes[sortedTimes.length - 1]
    const maxTimeHour = parseInt(maxTime.split(':')[0]) + 1
    const maxTimeFormatted = `${String(maxTimeHour).padStart(2, '0')}:00`
    
    return `${Array.from(days).join(', ')} • ${minTime} - ${maxTimeFormatted} (${selectedSlots.size} bloques)`
  }

  return (
    <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col relative">
      {/* Legend and instructions */}
      <div className="flex items-center justify-between gap-6 px-4 py-3 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>Arrastra para seleccionar múltiples bloques</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
            <span className="text-sm text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800/50 border border-slate-300" />
            <span className="text-sm text-muted-foreground">Bloqueado</span>
          </div>
        </div>
      </div>

      {/* Fixed header */}
      <div className="overflow-x-auto flex-shrink-0 border-b">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-16 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-10 border-r">
                Hora
              </th>
              {WEEKDAYS.map(({ key, label, index }) => {
                const dayDate = addDays(weekStart, index)
                const isCurrentDay = isToday(dayDate)
                return (
                  <th
                    key={key}
                    className={cn(
                      "min-w-[110px] px-2 py-2 text-center",
                      isCurrentDay && "bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-xs font-medium uppercase",
                        isCurrentDay ? "text-primary font-bold" : "text-muted-foreground"
                      )}>
                        {label}
                      </span>
                      <span className={cn(
                        "text-lg font-bold",
                        isCurrentDay ? "text-primary" : "text-foreground"
                      )}>
                        {format(dayDate, 'd')}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable body */}
      <div className="overflow-auto flex-1" style={{ maxHeight: '600px' }}>
        <table className="w-full min-w-[900px] border-collapse">
          <tbody className="divide-y">
            {TIME_SLOTS.map((time, timeIndex) => (
              <tr key={time}>
                <td className="w-16 px-2 py-1 text-center align-middle text-xs font-medium text-muted-foreground border-r bg-card sticky left-0 z-10 h-14">
                  {time}
                </td>
                {WEEKDAYS.map(({ key, index }) => {
                  const dayDate = addDays(weekStart, index)
                  const isCurrentDay = isToday(dayDate)

                  return (
                    <td
                      key={`${key}-${time}`}
                      className={cn(
                        "p-1 align-top h-14 border-r min-w-[110px]",
                        isCurrentDay && "bg-primary/5"
                      )}
                    >
                      {getSlotContent(key, time, dayDate, index, timeIndex)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Multi-selection popover */}
      {showMultiEditPopover && popoverPosition && (
        <div 
          ref={popoverAnchorRef}
          className="fixed z-50 bg-popover border rounded-lg shadow-lg p-4 w-80"
          style={{ 
            top: Math.min(popoverPosition.top, window.innerHeight - 300),
            left: Math.min(popoverPosition.left, window.innerWidth - 340)
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Editar Selección</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelMultiEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getSelectionSummary()}</span>
            </div>

            <RadioGroup value={multiEditStatus} onValueChange={(v) => setMultiEditStatus(v as 'available' | 'blocked')}>
              <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="available" id="multi-available" />
                <Label htmlFor="multi-available" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  Marcar como Disponible
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="blocked" id="multi-blocked" />
                <Label htmlFor="multi-blocked" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <div className="h-3 w-3 rounded-full bg-slate-400" />
                  Marcar como Bloqueado
                </Label>
              </div>
            </RadioGroup>

            <p className="text-xs text-muted-foreground">
              Los cambios se aplicarán semanalmente para los días seleccionados.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={cancelMultiEdit}>
                Cancelar
              </Button>
              <Button size="sm" onClick={applyMultiEdit}>
                Aplicar a {selectedSlots.size} bloques
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-crosshair" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  )
}
