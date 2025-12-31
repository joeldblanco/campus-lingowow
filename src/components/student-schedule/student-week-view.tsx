'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Video } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface StudentWeekViewProps {
  currentDate: Date
  lessons: StudentScheduleLesson[]
  onJoinClass?: (lessonId: string) => void
  onLessonClick?: (lesson: StudentScheduleLesson) => void
  isCompact?: boolean
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

// Helper to check if class is within 10 minutes of starting
function isWithin10MinutesOfStart(lesson: StudentScheduleLesson): boolean {
  const now = new Date()
  const [hours, minutes] = lesson.startTime.split(':').map(Number)
  const lessonDate = new Date(lesson.date)
  lessonDate.setHours(hours, minutes, 0, 0)
  
  const diffMs = lessonDate.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  return diffMinutes <= 10 && diffMinutes >= -60
}

// Get color classes based on lesson color
function getLessonColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-l-blue-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-l-purple-500' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-l-orange-500' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-l-green-500' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-l-pink-500' },
  }
  return colorMap[color] || colorMap.blue
}

function getInitials(name: string, lastName?: string | null): string {
  const first = name?.charAt(0) || ''
  const last = lastName?.charAt(0) || name?.split(' ')[1]?.charAt(0) || ''
  return (first + last).toUpperCase()
}

export function StudentWeekView({
  currentDate,
  lessons,
  onJoinClass,
  onLessonClick,
  isCompact = false,
}: StudentWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getLessonForSlot = (date: Date, time: string) => {
    return lessons.find(
      (lesson) =>
        isSameDay(new Date(lesson.date), date) && lesson.startTime === time
    )
  }

  const renderLessonCard = (lesson: StudentScheduleLesson) => {
    const colors = getLessonColorClasses(lesson.color)
    const isLive = lesson.status === 'in_progress'
    const canJoin = isLive || isWithin10MinutesOfStart(lesson)
    const isCancelled = lesson.status === 'cancelled'

    return (
      <div
        onClick={() => onLessonClick?.(lesson)}
        className={cn(
          "group h-full cursor-pointer flex flex-col rounded-lg border-l-4 p-2 transition-all hover:shadow-md",
          colors.border,
          colors.bg,
          isCancelled && "opacity-50 line-through",
          isLive && "ring-2 ring-primary ring-offset-1"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <span className={cn("text-xs font-bold truncate", colors.text)}>
              {lesson.courseTitle}
            </span>
            {isLive && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>
          
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {lesson.startTime} - {lesson.endTime}
          </p>

          {!isCompact && (
            <div className="flex items-center gap-1.5 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={lesson.teacher.image || ''} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {getInitials(lesson.teacher.name, lesson.teacher.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate">
                {lesson.teacher.name}
              </span>
            </div>
          )}
        </div>

        {canJoin && !isCancelled && (
          <Button
            size="sm"
            className="w-full h-6 text-[10px] mt-2"
            onClick={(e) => {
              e.stopPropagation()
              onJoinClass?.(lesson.id)
            }}
          >
            <Video className="h-3 w-3 mr-1" />
            Unirse
          </Button>
        )}
      </div>
    )
  }

  const rowHeight = isCompact ? 'h-16' : 'h-28'
  const cellPadding = isCompact ? 'p-1' : 'p-2'

  return (
    <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col">
      {/* Fixed header */}
      <div className="overflow-x-auto flex-shrink-0">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="w-16 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-10 border-r">
                Hora
              </th>
              {weekDays.map((day) => {
                const isCurrentDay = isToday(day)
                return (
                  <th
                    key={day.toISOString()}
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
                        {format(day, 'EEE', { locale: es })}
                      </span>
                      <span className={cn(
                        "text-lg font-bold",
                        isCurrentDay ? "text-primary" : "text-foreground"
                      )}>
                        {format(day, 'd')}
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
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className={cn(
                  "w-16 px-2 text-center align-middle text-xs font-medium text-muted-foreground border-r bg-card sticky left-0 z-10",
                  rowHeight
                )}>
                  {time}
                </td>
                {weekDays.map((day) => {
                  const lesson = getLessonForSlot(day, time)
                  const isCurrentDay = isToday(day)

                  return (
                    <td
                      key={`${day.toISOString()}-${time}`}
                      className={cn(
                        "align-top border-r border-dashed hover:bg-muted/50 transition-colors min-w-[110px]",
                        cellPadding,
                        rowHeight,
                        isCurrentDay && "bg-primary/5"
                      )}
                    >
                      {lesson && renderLessonCard(lesson)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
