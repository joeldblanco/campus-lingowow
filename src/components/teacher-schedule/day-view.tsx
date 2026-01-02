'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Video, CheckCircle, Clock, Plus, Pencil } from 'lucide-react'
import type { ScheduleLesson, AvailableSlot } from '@/types/schedule'
import { getLessonColorClasses, getInitials } from '@/types/schedule'
import { cn } from '@/lib/utils'

interface DayViewProps {
  lessons: ScheduleLesson[]
  availableSlots: AvailableSlot[]
  currentLesson?: ScheduleLesson
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
  onMarkAttendance?: (lessonId: string) => void
  onEditAvailability?: (slotId: string) => void
  onLessonClick?: (lesson: ScheduleLesson) => void
}

// Helper to check if class is within 10 minutes of starting
function isWithin10MinutesOfStart(lesson: ScheduleLesson): boolean {
  const now = new Date()
  const [hours, minutes] = lesson.startTime.split(':').map(Number)
  const lessonDate = new Date(lesson.date)
  lessonDate.setHours(hours, minutes, 0, 0)
  
  const diffMs = lessonDate.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  // Show join button if within 10 minutes before start or class is in progress
  return diffMinutes <= 10 && diffMinutes >= -60 // Allow up to 60 min after start
}

export function DayView({
  lessons,
  availableSlots,
  currentLesson,
  onJoinClass,
  onViewMaterials,
  onMarkAttendance,
  onEditAvailability,
  onLessonClick,
}: DayViewProps) {
  const sortedLessons = [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime))
  
  const allItems = [
    ...sortedLessons.map((lesson) => ({ type: 'lesson' as const, data: lesson, time: lesson.startTime })),
    ...availableSlots.map((slot) => ({ type: 'available' as const, data: slot, time: slot.startTime })),
  ].sort((a, b) => a.time.localeCompare(b.time))

  const renderCurrentLessonBanner = () => {
    if (!currentLesson) return null

    return (
      <div className="w-full rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-5 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-center justify-center h-16 w-16 bg-card rounded-xl shadow-sm border border-blue-100 dark:border-blue-800 text-primary">
              <span className="text-xs font-bold uppercase">Ahora</span>
              <span className="text-lg font-bold">{currentLesson.startTime}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {currentLesson.courseTitle} - {currentLesson.topic || 'Clase'}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {currentLesson.startTime} - {currentLesson.endTime} (En Progreso)
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={() => onJoinClass?.(currentLesson.id)}
            >
              <Video className="h-4 w-4 mr-2" />
              Unirse a Llamada
            </Button>
            <Button
              className="flex-1 md:flex-none"
              onClick={() => onMarkAttendance?.(currentLesson.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar Asistencia
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderLessonItem = (lesson: ScheduleLesson, isLive: boolean) => {
    const colors = getLessonColorClasses(lesson.color)
    const isCompleted = lesson.status === 'completed'
    const canJoin = isLive || isWithin10MinutesOfStart(lesson)

    return (
      <div
        onClick={() => onLessonClick?.(lesson)}
        className={cn(
          "group flex flex-col md:flex-row gap-4 p-4 rounded-xl border transition-all cursor-pointer",
          isLive
            ? "border-l-4 border-l-primary border-y border-r bg-blue-50/30 dark:bg-blue-900/5 shadow-sm"
            : "bg-card hover:shadow-md",
          !isLive && !isCompleted && "opacity-80 hover:opacity-100"
        )}
      >
        <div className="flex items-center gap-4 min-w-[200px]">
          <Avatar className={cn("h-12 w-12 ring-2 ring-border", isCompleted && "grayscale")}>
            <AvatarImage src={lesson.student.image || ''} />
            <AvatarFallback className={cn("text-sm font-bold", colors.bg, colors.text)}>
              {getInitials(lesson.student.name, lesson.student.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-bold text-foreground">{lesson.student.name} {lesson.student.lastName}</h4>
            <Badge className={cn("text-xs font-medium", colors.bg, colors.text, "border-0")}>
              {lesson.courseTitle}
            </Badge>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-1">
          {isLive ? (
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              En Vivo Ahora
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {lesson.duration} mins de duración
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Tema: {lesson.topic || 'Sin tema especificado'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-bold"
            onClick={() => onViewMaterials?.(lesson.id)}
          >
            <FileText className="h-4 w-4 mr-1" />
            Materiales
          </Button>
          {isCompleted ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Asistió
            </Button>
          ) : canJoin ? (
            <Button
              size="sm"
              className="h-9 px-3 text-xs font-bold shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onJoinClass?.(lesson.id)
              }}
            >
              <Video className="h-4 w-4 mr-1" />
              Unirse
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold"
              onClick={(e) => {
                e.stopPropagation()
                onMarkAttendance?.(lesson.id)
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Asistencia
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderAvailableSlot = (slot: AvailableSlot) => (
    <div className="group flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-dashed border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer">
      <div className="flex items-center gap-4 min-w-[200px]">
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-green-100 text-green-600">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-foreground">Horario Disponible</h4>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Abierto para reservas
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {slot.duration} mins de duración
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-bold text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
          onClick={() => onEditAvailability?.(slot.id)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Editar Disponibilidad
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col gap-6">
      {renderCurrentLessonBanner()}

      <div className="relative flex flex-col gap-0 border-l border-border ml-16 pl-6 pb-10">
        {allItems.map((item, index) => {
          const isLive = item.type === 'lesson' && item.data.status === 'in_progress'
          const timeDisplay = item.time

          return (
            <div key={`${item.type}-${item.time}-${index}`} className="relative pb-10">
              {/* Time Label - positioned further left to avoid overlap */}
              <span className={cn(
                "absolute -left-20 top-2 flex h-8 w-14 items-center justify-end text-sm font-bold pr-2",
                isLive ? "text-primary" : "text-muted-foreground"
              )}>
                {timeDisplay}
              </span>

              {/* Timeline Dot - positioned on the border line */}
              <div className={cn(
                "absolute -left-[30px] top-4 h-3 w-3 rounded-full border-2 border-background z-10",
                isLive
                  ? "bg-primary ring-4 ring-blue-100 dark:ring-blue-900/30"
                  : item.type === 'available'
                  ? "bg-green-500 ring-1 ring-border"
                  : item.data.status === 'completed'
                  ? "bg-green-500 ring-1 ring-border"
                  : "bg-muted-foreground/50 ring-1 ring-border"
              )} />

              {/* Content */}
              {item.type === 'lesson' && renderLessonItem(item.data as ScheduleLesson, isLive)}
              {item.type === 'available' && renderAvailableSlot(item.data as AvailableSlot)}
            </div>
          )
        })}

        {allItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No hay clases programadas para hoy</p>
            <p className="text-sm">Configura tu disponibilidad para recibir reservas</p>
          </div>
        )}
      </div>
    </div>
  )
}
