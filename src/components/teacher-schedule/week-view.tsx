'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AvailableSlot, BlockedSlot, ScheduleLesson } from '@/types/schedule'
import { getInitials, getLessonColorClasses } from '@/types/schedule'
import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, Plus } from 'lucide-react'

interface WeekViewProps {
  currentDate: Date
  lessons: ScheduleLesson[]
  availableSlots: AvailableSlot[]
  blockedSlots: BlockedSlot[]
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
  onLessonClick?: (lesson: ScheduleLesson) => void
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
function isWithin10MinutesOfStart(lesson: ScheduleLesson): boolean {
  const now = new Date()
  const [hours, minutes] = lesson.startTime.split(':').map(Number)
  const lessonDate = new Date(lesson.date)
  lessonDate.setHours(hours, minutes, 0, 0)

  const diffMs = lessonDate.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)

  return diffMinutes <= 10 && diffMinutes >= -60
}

export function WeekView({
  currentDate,
  lessons,
  availableSlots,
  blockedSlots,
  onJoinClass,
  onViewMaterials,
  onLessonClick,
  isCompact = false,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) // Monday to Sunday

  const getLessonForSlot = (date: Date, time: string) => {
    return lessons.find(
      (lesson) => isSameDay(new Date(lesson.date), date) && lesson.startTime === time
    )
  }

  const isSlotAvailable = (date: Date, time: string) => {
    return availableSlots.some(
      (slot) => isSameDay(new Date(slot.date), date) && slot.startTime === time
    )
  }

  const isSlotBlocked = (date: Date, time: string) => {
    return blockedSlots.some(
      (slot) => isSameDay(new Date(slot.date), date) && slot.startTime === time
    )
  }

  const renderLessonCard = (lesson: ScheduleLesson) => {
    const colors = getLessonColorClasses(lesson.color)
    const isLive = lesson.status === 'in_progress'
    const isCompleted = lesson.status === 'completed'
    const isCancelled = lesson.status === 'cancelled'
    const canJoin = isLive || isWithin10MinutesOfStart(lesson)

    if (isCancelled) {
      return (
        <div
          onClick={() => onLessonClick?.(lesson)}
          className="group relative flex h-full w-full cursor-pointer flex-col gap-2 rounded-lg border-l-4 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-muted p-3 transition-all hover:bg-background shadow-sm overflow-hidden"
        >
          <div className="flex items-start justify-between gap-1 min-w-0">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase max-w-[calc(100%-70px)]">
              <span className="truncate block">{lesson.courseTitle}</span>
            </Badge>
            <Badge variant="destructive" className="text-[9px] font-bold flex-shrink-0">
              CANCELADA
            </Badge>
          </div>
          <div className="flex items-center gap-2 opacity-50 min-w-0">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={lesson.student.image || ''} />
              <AvatarFallback className="text-xs">
                {getInitials(lesson.student.name, lesson.student.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-muted-foreground line-through truncate">
              {lesson.student.name}
            </span>
          </div>
        </div>
      )
    }

    if (isCompleted) {
      return (
        <div
          onClick={() => onLessonClick?.(lesson)}
          className="group flex h-full cursor-pointer flex-col gap-2 rounded-lg bg-muted border p-3 opacity-70 hover:opacity-100 transition-all"
        >
          <div className="flex items-start justify-between">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              {lesson.courseTitle}
            </Badge>
            <span className="text-green-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 grayscale">
              <AvatarImage src={lesson.student.image || ''} />
              <AvatarFallback className="text-xs">
                {getInitials(lesson.student.name, lesson.student.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-muted-foreground">{lesson.student.name}</span>
          </div>
          <div className="mt-auto text-xs text-muted-foreground">Completada</div>
        </div>
      )
    }

    return (
      <div
        onClick={() => onLessonClick?.(lesson)}
        className={cn(
          'group relative flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border-l-4 bg-card p-2 shadow-sm hover:shadow-md transition-all ring-1 ring-border overflow-hidden',
          colors.accent
        )}
      >
        <div className="flex items-start justify-between gap-1 min-w-0">
          <Badge
            className={cn(
              'text-[9px] font-bold uppercase mb-2 max-w-[calc(100%-8px)]',
              colors.bg,
              colors.text,
              'border-0'
            )}
          >
            <p className="truncate">{lesson.courseTitle}</p>
          </Badge>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={lesson.student.image || ''} />
            <AvatarFallback className={cn('text-[10px]', colors.bg, colors.text)}>
              {getInitials(lesson.student.name, lesson.student.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-foreground truncate">
            {lesson.student.name} {lesson.student.lastName}
          </span>
        </div>
        <div className="mt-auto flex gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[9px] font-medium"
            onClick={(e) => {
              e.stopPropagation()
              onViewMaterials?.(lesson.id)
            }}
          >
            <FileText className="h-3 w-3 mr-0.5" />
            Materiales
          </Button>
          {canJoin && (
            <Button
              size="sm"
              className="h-6 px-1.5 text-[9px] font-bold"
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

  const renderAvailableSlot = () => (
    <div className="group flex h-full cursor-pointer flex-col justify-between rounded-lg border border-transparent bg-green-50 dark:bg-green-900/20 p-3 hover:border-green-200 dark:hover:border-green-800 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0 text-[10px] font-bold uppercase">
          Disponible
        </Badge>
        <Plus className="h-4 w-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-xs text-green-700 dark:text-green-400 font-medium">
        Abierto para reservas
      </div>
    </div>
  )

  const renderBlockedSlot = () => (
    <div className="flex h-full items-center justify-center rounded-lg bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_50%,hsl(var(--muted))_50%,hsl(var(--muted))_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-50">
      <span className="text-xs font-medium text-muted-foreground">Bloqueado</span>
    </div>
  )

  // Row height based on compact mode
  const rowHeight = isCompact ? 'h-16' : 'h-28'
  const cellPadding = isCompact ? 'p-1' : 'p-2'

  return (
    <div
      className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm"
      style={{ maxHeight: '650px' }}
    >
      <table className="w-full min-w-[900px] border-collapse table-fixed">
        <colgroup>
          <col className="w-16" />
          {weekDays.map((day) => (
            <col key={day.toISOString()} style={{ width: `${100 / 7}%` }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20">
          <tr className="bg-muted/50 border-b">
            <th className="w-16 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-30 border-r">
              Hora
            </th>
            {weekDays.map((day) => {
              const isCurrentDay = isToday(day)
              return (
                <th
                  key={day.toISOString()}
                  className={cn(
                    'px-2 py-2 text-center bg-muted/50',
                    isCurrentDay && 'bg-primary/10'
                  )}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'text-xs font-medium uppercase',
                        isCurrentDay ? 'text-primary font-bold' : 'text-muted-foreground'
                      )}
                    >
                      {format(day, 'EEE', { locale: es })}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        isCurrentDay ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {TIME_SLOTS.map((time) => (
            <tr key={time}>
              <td
                className={cn(
                  'w-16 px-2 text-center align-middle text-xs font-medium text-muted-foreground border-r bg-card sticky left-0 z-10',
                  rowHeight
                )}
              >
                {time}
              </td>
              {weekDays.map((day) => {
                const lesson = getLessonForSlot(day, time)
                const available = isSlotAvailable(day, time)
                const blocked = isSlotBlocked(day, time)
                const isCurrentDay = isToday(day)

                return (
                  <td
                    key={`${day.toISOString()}-${time}`}
                    className={cn(
                      'align-top border-r border-dashed transition-colors',
                      cellPadding,
                      rowHeight,
                      isCurrentDay && 'bg-primary/5'
                    )}
                  >
                    {lesson && renderLessonCard(lesson)}
                    {!lesson && available && renderAvailableSlot()}
                    {!lesson && !available && blocked && renderBlockedSlot()}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
