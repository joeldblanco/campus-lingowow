'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, Ban, GripVertical } from 'lucide-react'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ScheduleLesson } from '@/types/schedule'

interface AvailabilityEditViewProps {
  currentDate: Date
  lessons: ScheduleLesson[]
  initialAvailability: Array<{ day: string; startTime: string; endTime: string }>
  onSave: (
    slots: Array<{ day: string; startTime: string; endTime: string; available: boolean }>
  ) => Promise<void>
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
type AvailabilityStatus = 'available' | 'blocked'

export function AvailabilityEditView({
  currentDate,
  lessons,
  initialAvailability,
  onSave,
}: AvailabilityEditViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const draggedSlotsRef = useRef<Set<SlotKey>>(new Set())

  // Initialize availability state - only 'available' or 'blocked'
  const [availability, setAvailability] = useState<
    Record<string, Record<string, AvailabilityStatus>>
  >(() => {
    const initial: Record<string, Record<string, AvailabilityStatus>> = {}

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

  // Immediate toggle state for click-and-drag editing
  const [isDragging, setIsDragging] = useState(false)

  // Check if a slot has a booked lesson
  const getBookedLesson = useCallback(
    (dayDate: Date, time: string): ScheduleLesson | undefined => {
      return lessons.find((lesson) => {
        const lessonDate = new Date(lesson.date)
        return (
          lessonDate.toDateString() === dayDate.toDateString() &&
          lesson.startTime === time &&
          lesson.status !== 'cancelled'
        )
      })
    },
    [lessons]
  )

  const toggleSlotStatus = useCallback((day: string, time: string) => {
    setAvailability((prev) => {
      const currentStatus = prev[day]?.[time] || 'blocked'
      const nextStatus: AvailabilityStatus = currentStatus === 'available' ? 'blocked' : 'available'

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [time]: nextStatus,
        },
      }
    })
  }, [])

  // Handle mouse down on a slot and toggle immediately
  const handleMouseDown = (dayIndex: number, timeIndex: number, dayDate: Date) => {
    const dayKey = WEEKDAYS[dayIndex].key
    const time = TIME_SLOTS[timeIndex]
    const slotKey = `${dayKey}-${time}` as SlotKey

    // Don't allow editing booked slots
    if (getBookedLesson(dayDate, time)) return

    setIsDragging(true)
    draggedSlotsRef.current = new Set([slotKey])
    toggleSlotStatus(dayKey, time)
  }

  // Toggle each new slot immediately while dragging
  const handleMouseEnter = (dayIndex: number, timeIndex: number, dayDate: Date) => {
    if (!isDragging) return

    const dayKey = WEEKDAYS[dayIndex].key
    const time = TIME_SLOTS[timeIndex]
    const slotKey = `${dayKey}-${time}` as SlotKey

    if (draggedSlotsRef.current.has(slotKey)) return
    if (getBookedLesson(dayDate, time)) return

    draggedSlotsRef.current.add(slotKey)
    toggleSlotStatus(dayKey, time)
  }

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    draggedSlotsRef.current.clear()
  }, [isDragging])

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleMouseUp])

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

  ;(window as unknown as { __availabilitySave?: () => Promise<void> }).__availabilitySave =
    handleParentSave

  const getSlotContent = (
    dayKey: string,
    time: string,
    dayDate: Date,
    dayIndex: number,
    timeIndex: number
  ) => {
    const bookedLesson = getBookedLesson(dayDate, time)
    const status = availability[dayKey]?.[time] || 'blocked'

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
      'w-full h-full flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer select-none',
      status === 'available' &&
        'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30',
      status === 'blocked' &&
        'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700/50'
    )

    const content = (
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleMouseDown(dayIndex, timeIndex, dayDate)
        }}
        onMouseEnter={() => handleMouseEnter(dayIndex, timeIndex, dayDate)}
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

    return content
  }

  return (
    <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col relative">
      {/* Legend and instructions */}
      <div className="flex items-center justify-between gap-6 px-4 py-3 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>Haz clic o arrastra para alternar bloques al instante</span>
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
                      'min-w-[110px] px-2 py-2 text-center',
                      isCurrentDay && 'bg-primary/5'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'text-xs font-medium uppercase',
                          isCurrentDay ? 'text-primary font-bold' : 'text-muted-foreground'
                        )}
                      >
                        {label}
                      </span>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          isCurrentDay ? 'text-primary' : 'text-foreground'
                        )}
                      >
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
                        'p-1 align-top h-14 border-r min-w-[110px]',
                        isCurrentDay && 'bg-primary/5'
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

      {/* Overlay when dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-crosshair" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  )
}
