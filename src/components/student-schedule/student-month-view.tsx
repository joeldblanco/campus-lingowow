'use client'

import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  format 
} from 'date-fns'
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface StudentMonthViewProps {
  currentDate: Date
  lessons: StudentScheduleLesson[]
  onDayClick?: (date: Date) => void
}

function getLessonColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500', text: 'text-white' },
    purple: { bg: 'bg-purple-500', text: 'text-white' },
    orange: { bg: 'bg-orange-500', text: 'text-white' },
    green: { bg: 'bg-green-500', text: 'text-white' },
    pink: { bg: 'bg-pink-500', text: 'text-white' },
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
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

  const getLessonsForDay = (date: Date) => {
    return lessons.filter((lesson) => isSameDay(new Date(lesson.date), date))
  }

  return (
    <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayLessons = getLessonsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={cn(
                "min-h-[120px] border-b border-r p-2 cursor-pointer transition-colors hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                index % 7 === 6 && "border-r-0",
                isCurrentDay && "bg-primary/5"
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    isCurrentDay && "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Lessons */}
              <div className="space-y-1">
                {dayLessons.slice(0, 3).map((lesson) => {
                  const colors = getLessonColorClasses(lesson.color)
                  const isCancelled = lesson.status === 'cancelled'
                  
                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium truncate",
                        colors.bg,
                        colors.text,
                        isCancelled && "opacity-50 line-through"
                      )}
                      title={`${lesson.startTime} - ${lesson.courseTitle}`}
                    >
                      {lesson.startTime} {lesson.courseTitle}
                    </div>
                  )
                })}
                {dayLessons.length > 3 && (
                  <div className="text-[10px] font-medium text-muted-foreground px-1">
                    +{dayLessons.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
