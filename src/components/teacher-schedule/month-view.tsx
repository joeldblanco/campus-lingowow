'use client'

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import type { ScheduleLesson, AvailableSlot, BlockedSlot } from '@/types/schedule'
import { getLessonColorClasses } from '@/types/schedule'
import { cn } from '@/lib/utils'

interface MonthViewProps {
  currentDate: Date
  lessons: ScheduleLesson[]
  availableSlots: AvailableSlot[]
  blockedSlots: BlockedSlot[]
  onDayClick?: (date: Date) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MonthView({
  currentDate,
  lessons,
  availableSlots,
  blockedSlots,
  onDayClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getLessonsForDay = (date: Date) => {
    return lessons.filter((lesson) => isSameDay(new Date(lesson.date), date))
  }

  const getAvailableSlotsForDay = (date: Date) => {
    return availableSlots.filter((slot) => isSameDay(new Date(slot.date), date))
  }

  const isBlockedDay = (date: Date) => {
    return blockedSlots.some((slot) => isSameDay(new Date(slot.date), date))
  }

  const renderDayContent = (date: Date) => {
    const dayLessons = getLessonsForDay(date)
    const dayAvailable = getAvailableSlotsForDay(date)
    const isBlocked = isBlockedDay(date)
    const isCurrentMonth = isSameMonth(date, currentDate)
    const isTodayDate = isToday(date)

    return (
      <div
        className={cn(
          "min-h-[140px] p-2 flex flex-col gap-1.5 cursor-pointer transition-colors",
          isCurrentMonth
            ? "bg-card hover:bg-muted/50"
            : "bg-muted/30",
          isTodayDate && "bg-primary/5 ring-1 ring-inset ring-primary/20 hover:bg-primary/10"
        )}
        onClick={() => onDayClick?.(date)}
      >
        {/* Day Number */}
        <div className="flex justify-between items-center">
          {isTodayDate ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              {format(date, 'd')}
            </span>
          ) : (
            <span className={cn(
              "text-sm font-bold p-1",
              isCurrentMonth ? "text-foreground" : "text-muted-foreground"
            )}>
              {format(date, 'd')}
            </span>
          )}
          {isTodayDate && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Hoy
            </span>
          )}
        </div>

        {/* Lessons */}
        {dayLessons.slice(0, 3).map((lesson) => {
          const colors = getLessonColorClasses(lesson.color)
          const isCancelled = lesson.status === 'cancelled'

          return (
            <div
              key={lesson.id}
              className={cn(
                "rounded px-2 py-1 text-xs font-bold truncate shadow-sm border",
                isCancelled
                  ? "bg-muted border-border text-muted-foreground line-through"
                  : cn(colors.bg, colors.border, colors.text),
                isTodayDate && !isCancelled && "border-l-4 border-l-primary"
              )}
            >
              {lesson.startTime} {lesson.courseTitle}
              {isCancelled && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </div>
          )
        })}

        {dayLessons.length > 3 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            +{dayLessons.length - 3} más
          </span>
        )}

        {/* Available Slots */}
        {dayLessons.length === 0 && dayAvailable.length > 0 && (
          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] font-bold truncate">
              {dayAvailable.length > 1 ? `${dayAvailable.length} disponibles` : 'Disponible'}
            </span>
          </div>
        )}

        {/* Blocked */}
        {dayLessons.length === 0 && dayAvailable.length === 0 && isBlocked && (
          <div className="flex h-full items-center justify-center rounded-lg bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_50%,hsl(var(--muted))_50%,hsl(var(--muted))_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Bloqueado
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr bg-border gap-px">
        {days.map((date) => (
          <div key={date.toISOString()}>
            {renderDayContent(date)}
          </div>
        ))}
      </div>
    </div>
  )
}
