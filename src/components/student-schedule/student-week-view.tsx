'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, FileText } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface StudentWeekViewProps {
  currentDate: Date
  lessons: StudentScheduleLesson[]
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
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

// Get color classes based on lesson color (matching teacher schedule)
function getLessonColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string; accent: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', accent: 'border-l-blue-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', accent: 'border-l-purple-500' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', accent: 'border-l-orange-500' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', accent: 'border-l-green-500' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', accent: 'border-l-pink-500' },
  }
  return colorMap[color] || colorMap.blue
}

export function StudentWeekView({
  currentDate,
  lessons,
  onJoinClass,
  onViewMaterials,
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
    const isCompleted = lesson.status === 'completed'
    const isCancelled = lesson.status === 'cancelled'
    const canJoin = isLive || isWithin10MinutesOfStart(lesson)

    if (isCancelled) {
      return (
        <div 
          onClick={() => onLessonClick?.(lesson)}
          className="group relative flex h-full cursor-pointer flex-col gap-2 rounded-lg border-l-4 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-muted p-3 transition-all hover:bg-background shadow-sm">
          <div className="flex items-start justify-between">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              {lesson.courseTitle}
            </Badge>
            <Badge variant="destructive" className="text-[9px] font-bold">
              CANCELADA
            </Badge>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <UserAvatar
              userId={lesson.teacher.id}
              userName={lesson.teacher.name}
              userLastName={lesson.teacher.lastName}
              userImage={lesson.teacher.image}
              className="h-6 w-6"
              fallbackClassName="text-xs"
            />
            <span className="text-sm font-medium text-muted-foreground line-through">
              {lesson.teacher.name}
            </span>
          </div>
        </div>
      )
    }

    if (isCompleted) {
      return (
        <div 
          onClick={() => onLessonClick?.(lesson)}
          className="group flex h-full cursor-pointer flex-col gap-2 rounded-lg bg-muted border p-3 opacity-70 hover:opacity-100 transition-all">
          <div className="flex items-start justify-between">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              {lesson.courseTitle}
            </Badge>
            <span className="text-green-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar
              userId={lesson.teacher.id}
              userName={lesson.teacher.name}
              userLastName={lesson.teacher.lastName}
              userImage={lesson.teacher.image}
              className="h-6 w-6 grayscale"
              fallbackClassName="text-xs"
            />
            <span className="text-sm font-medium text-muted-foreground">
              {lesson.teacher.name}
            </span>
          </div>
          <div className="mt-auto text-xs text-muted-foreground">Completada</div>
        </div>
      )
    }

    return (
      <div 
        onClick={() => onLessonClick?.(lesson)}
        className={cn(
          "group relative flex h-full cursor-pointer flex-col gap-2 rounded-lg border-l-4 bg-card p-3 shadow-sm hover:shadow-md transition-all ring-1 ring-border",
          colors.accent
        )}>
        <div className="flex items-start justify-between">
          <Badge className={cn("text-[10px] font-bold uppercase", colors.bg, colors.text, "border-0")}>
            {lesson.courseTitle}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <UserAvatar
            userId={lesson.teacher.id}
            userName={lesson.teacher.name}
            userLastName={lesson.teacher.lastName}
            userImage={lesson.teacher.image}
            className="h-6 w-6"
            fallbackClassName={cn("text-xs", colors.bg, colors.text)}
          />
          <span className="text-sm font-bold text-foreground">
            {lesson.teacher.name}
          </span>
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px] font-medium"
            onClick={(e) => {
              e.stopPropagation()
              onViewMaterials?.(lesson.id)
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            Materiales
          </Button>
          {canJoin && (
            <Button
              size="sm"
              className="h-7 px-2 text-[10px] font-bold"
              onClick={(e) => {
                e.stopPropagation()
                onJoinClass?.(lesson.id)
              }}
            >
              Unirse
            </Button>
          )}
        </div>
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
