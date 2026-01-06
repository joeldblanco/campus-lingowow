'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { getTeacherScheduleForAdmin, type TeacherScheduleLesson, type TeacherAvailabilitySlot } from '@/lib/actions/teacher-schedule'
import type { ScheduleLesson } from '@/types/schedule'
import { getLessonColorClasses } from '@/types/schedule'
import { 
  addDays, 
  format, 
  isSameDay, 
  isToday, 
  startOfWeek, 
  startOfMonth, 
  endOfMonth,
  addWeeks,
  subWeeks
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react'

interface TeacherScheduleDialogProps {
  teacherId: string
  teacherName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseLocalDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear()
    const month = dateInput.getMonth()
    const day = dateInput.getDate()
    return new Date(year, month, day, 12, 0, 0, 0)
  }
  const dateStr = typeof dateInput === 'string' ? dateInput : String(dateInput)
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function transformLessons(serverLessons: TeacherScheduleLesson[]): ScheduleLesson[] {
  return serverLessons.map((lesson) => ({
    id: lesson.id,
    courseTitle: lesson.courseTitle,
    courseLevel: lesson.courseLevel,
    student: {
      id: lesson.student.id,
      name: lesson.student.name,
      lastName: lesson.student.lastName,
      email: lesson.student.email,
      image: lesson.student.image,
    },
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    date: parseLocalDate(lesson.date),
    status: lesson.status,
    topic: lesson.topic,
    duration: lesson.duration,
    roomUrl: lesson.roomUrl,
    color: lesson.color,
  }))
}

const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function TeacherScheduleDialog({
  teacherId,
  teacherName,
  open,
  onOpenChange,
}: TeacherScheduleDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [lessons, setLessons] = useState<ScheduleLesson[]>([])
  const [availability, setAvailability] = useState<TeacherAvailabilitySlot[]>([])
  const lastFetchedMonth = useRef<string>('')

  const fetchData = useCallback(async (force = false) => {
    if (!open || !teacherId) return

    const monthStart = startOfMonth(currentDate)
    const monthKey = `${teacherId}-${format(monthStart, 'yyyy-MM')}`

    if (!force && lastFetchedMonth.current === monthKey) {
      return
    }

    setIsLoading(true)
    try {
      const monthEnd = endOfMonth(currentDate)
      const result = await getTeacherScheduleForAdmin(teacherId, monthStart, monthEnd)

      if (result.success && result.data) {
        setLessons(transformLessons(result.data.lessons))
        setAvailability(result.data.availability)
        lastFetchedMonth.current = monthKey
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, teacherId, open])

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [fetchData, open])

  useEffect(() => {
    if (!open) {
      lastFetchedMonth.current = ''
      setLessons([])
      setAvailability([])
    }
  }, [open])

  const DAY_MAP: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0,
    lunes: 1, martes: 2, miércoles: 3, jueves: 4,
    viernes: 5, sábado: 6, domingo: 0,
  }

  const isSlotAvailable = (date: Date, time: string) => {
    const dayOfWeek = date.getDay()
    return availability.some((slot) => {
      const slotDayNum = DAY_MAP[slot.day.toLowerCase()]
      if (slotDayNum !== dayOfWeek) return false
      const slotStart = slot.startTime
      const slotEnd = slot.endTime
      return time >= slotStart && time < slotEnd
    })
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredLessons = useMemo(() => {
    const weekEnd = addDays(weekStart, 6)
    return lessons.filter((lesson) => {
      const lessonDate = lesson.date instanceof Date ? lesson.date : new Date(lesson.date)
      return lessonDate >= weekStart && lessonDate <= weekEnd
    })
  }, [lessons, weekStart])

  const getLessonForSlot = (date: Date, time: string) => {
    return filteredLessons.find(
      (lesson) => isSameDay(new Date(lesson.date), date) && lesson.startTime === time
    )
  }

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())

  const renderLessonCard = (lesson: ScheduleLesson) => {
    const colors = getLessonColorClasses(lesson.color)
    const isCompleted = lesson.status === 'completed'
    const isCancelled = lesson.status === 'cancelled'

    if (isCancelled) {
      return (
        <div className="group relative flex h-full w-full flex-col gap-1 rounded-md border-l-2 border-l-gray-300 bg-gray-50 dark:bg-muted p-1.5 overflow-hidden">
          <Badge variant="secondary" className="text-[8px] font-bold uppercase w-fit">
            <span className="truncate block max-w-[60px]">{lesson.courseTitle}</span>
          </Badge>
          <div className="flex items-center gap-1 opacity-50">
            <UserAvatar
              userId={lesson.student.id}
              userName={lesson.student.name}
              userLastName={lesson.student.lastName}
              userImage={lesson.student.image}
              className="h-4 w-4 flex-shrink-0"
              fallbackClassName="text-[8px]"
            />
            <span className="text-[10px] font-medium text-muted-foreground line-through truncate">
              {lesson.student.name}
            </span>
          </div>
        </div>
      )
    }

    if (isCompleted) {
      return (
        <div className="group flex h-full flex-col gap-1 rounded-md bg-muted border p-1.5 opacity-70">
          <Badge variant="secondary" className="text-[8px] font-bold uppercase w-fit">
            {lesson.courseTitle}
          </Badge>
          <div className="flex items-center gap-1">
            <UserAvatar
              userId={lesson.student.id}
              userName={lesson.student.name}
              userLastName={lesson.student.lastName}
              userImage={lesson.student.image}
              className="h-4 w-4 grayscale"
              fallbackClassName="text-[8px]"
            />
            <span className="text-[10px] font-medium text-muted-foreground truncate">{lesson.student.name}</span>
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          'group relative flex h-full w-full flex-col gap-1 rounded-md border-l-2 bg-card p-1.5 shadow-sm ring-1 ring-border overflow-hidden',
          colors.accent
        )}
      >
        <Badge
          className={cn(
            'text-[8px] font-bold uppercase w-fit',
            colors.bg,
            colors.text,
            'border-0'
          )}
        >
          <p className="truncate max-w-[60px]">{lesson.courseTitle}</p>
        </Badge>
        <div className="flex items-center gap-1">
          <UserAvatar
            userId={lesson.student.id}
            userName={lesson.student.name}
            userLastName={lesson.student.lastName}
            userImage={lesson.student.image}
            className="h-4 w-4 flex-shrink-0"
            fallbackClassName={cn('text-[8px]', colors.bg, colors.text)}
          />
          <span className="text-[10px] font-bold text-foreground truncate">
            {lesson.student.name}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          {lesson.startTime} - {lesson.endTime}
        </span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Horario de {teacherName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Visualizando en tu zona horaria
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700" />
              <span className="text-muted-foreground">Disponible</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" />
              <span className="text-muted-foreground">Clase programada</span>
            </div>
          </div>
          <div className="text-sm font-medium">
            {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando horario...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-14" />
                {weekDays.map((day) => (
                  <col key={day.toISOString()} style={{ width: `${100 / 7}%` }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-20">
                <tr className="bg-muted/50 border-b">
                  <th className="w-14 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-30 border-r">
                    Hora
                  </th>
                  {weekDays.map((day) => {
                    const isCurrentDay = isToday(day)
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          'px-1 py-1 text-center bg-muted/50',
                          isCurrentDay && 'bg-primary/10'
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              'text-[10px] font-medium uppercase',
                              isCurrentDay ? 'text-primary font-bold' : 'text-muted-foreground'
                            )}
                          >
                            {format(day, 'EEE', { locale: es })}
                          </span>
                          <span
                            className={cn(
                              'text-sm font-bold',
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
                    <td className="w-14 px-1 h-14 text-center align-middle text-[10px] font-medium text-muted-foreground border-r bg-card sticky left-0 z-10">
                      {time}
                    </td>
                    {weekDays.map((day) => {
                      const lesson = getLessonForSlot(day, time)
                      const isCurrentDay = isToday(day)

                      return (
                        <td
                          key={`${day.toISOString()}-${time}`}
                          className={cn(
                            'align-top border-r border-dashed p-0.5 h-16',
                            isCurrentDay && 'bg-primary/5',
                            !lesson && isSlotAvailable(day, time) && 'bg-green-50 dark:bg-green-900/20'
                          )}
                        >
                          {lesson ? renderLessonCard(lesson) : (
                            isSlotAvailable(day, time) && (
                              <div className="h-full flex items-center justify-center">
                                <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">Disponible</span>
                              </div>
                            )
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredLessons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay clases programadas para esta semana
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
