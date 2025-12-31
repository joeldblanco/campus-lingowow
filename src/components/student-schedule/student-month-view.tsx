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
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface StudentMonthViewProps {
  currentDate: Date
  lessons: StudentScheduleLesson[]
  onDayClick?: (date: Date) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getLessonColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  }
  return colorMap[color] || colorMap.blue
}

export function StudentMonthView({
  currentDate,
  lessons,
  onDayClick,
}: StudentMonthViewProps) {
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

  const renderDayContent = (date: Date) => {
    const dayLessons = getLessonsForDay(date)
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
