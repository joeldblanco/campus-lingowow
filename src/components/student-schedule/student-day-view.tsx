'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Video, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface StudentDayViewProps {
  lessons: StudentScheduleLesson[]
  currentLesson?: StudentScheduleLesson
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
  onLessonClick?: (lesson: StudentScheduleLesson) => void
}

function isWithin10MinutesOfStart(lesson: StudentScheduleLesson): boolean {
  const now = new Date()
  const [hours, minutes] = lesson.startTime.split(':').map(Number)
  const lessonDate = new Date(lesson.date)
  lessonDate.setHours(hours, minutes, 0, 0)
  
  const diffMs = lessonDate.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  return diffMinutes <= 10 && diffMinutes >= -60
}

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

export function StudentDayView({
  lessons,
  currentLesson,
  onJoinClass,
  onViewMaterials,
  onLessonClick,
}: StudentDayViewProps) {
  const sortedLessons = [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime))

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
              onClick={() => onViewMaterials?.(currentLesson.id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Materiales
            </Button>
            <Button
              className="flex-1 md:flex-none"
              onClick={() => onJoinClass?.(currentLesson.id)}
            >
              <Video className="h-4 w-4 mr-2" />
              Unirse a Clase
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderLessonItem = (lesson: StudentScheduleLesson, isLive: boolean) => {
    const colors = getLessonColorClasses(lesson.color)
    const isCompleted = lesson.status === 'completed'
    const isCancelled = lesson.status === 'cancelled'
    const canJoin = isLive || isWithin10MinutesOfStart(lesson)

    return (
      <div
        onClick={() => onLessonClick?.(lesson)}
        className={cn(
          "group flex flex-col md:flex-row gap-4 p-4 rounded-xl border transition-all cursor-pointer",
          isLive
            ? "border-l-4 border-l-primary border-y border-r bg-blue-50/30 dark:bg-blue-900/5 shadow-sm"
            : "bg-card hover:shadow-md",
          isCancelled && "opacity-50",
          !isLive && !isCompleted && !isCancelled && "opacity-80 hover:opacity-100"
        )}
      >
        <div className="flex items-center gap-4 min-w-[200px]">
          <Avatar className={cn("h-12 w-12 ring-2 ring-border", isCompleted && "grayscale")}>
            <AvatarImage src={lesson.teacher.image || ''} />
            <AvatarFallback className={cn("text-sm font-bold", colors.bg, colors.text)}>
              {getInitials(lesson.teacher.name, lesson.teacher.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-bold text-foreground">{lesson.teacher.name}</h4>
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
            onClick={(e) => {
              e.stopPropagation()
              onViewMaterials?.(lesson.id)
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            Materiales
          </Button>
          {canJoin && !isCancelled ? (
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
          ) : isCancelled ? (
            <Badge variant="destructive" className="text-xs">
              Cancelada
            </Badge>
          ) : isCompleted ? (
            <Badge variant="secondary" className="text-xs">
              Completada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Próximamente
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      {renderCurrentLessonBanner()}

      <div className="relative flex flex-col gap-0 border-l border-border ml-16 pl-6 pb-10">
        {sortedLessons.map((lesson, index) => {
          const isLive = lesson.status === 'in_progress'

          return (
            <div key={`${lesson.id}-${index}`} className="relative pb-10">
              {/* Time Label */}
              <span className={cn(
                "absolute -left-20 top-2 flex h-8 w-14 items-center justify-end text-sm font-bold pr-2",
                isLive ? "text-primary" : "text-muted-foreground"
              )}>
                {lesson.startTime}
              </span>

              {/* Timeline Dot */}
              <div className={cn(
                "absolute -left-[30px] top-4 h-3 w-3 rounded-full border-2 border-background z-10",
                isLive
                  ? "bg-primary ring-4 ring-blue-100 dark:ring-blue-900/30"
                  : lesson.status === 'completed'
                  ? "bg-green-500 ring-1 ring-border"
                  : lesson.status === 'cancelled'
                  ? "bg-red-500 ring-1 ring-border"
                  : "bg-muted-foreground/50 ring-1 ring-border"
              )} />

              {/* Content */}
              {renderLessonItem(lesson, isLive)}
            </div>
          )
        })}

        {sortedLessons.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No hay clases programadas para hoy</p>
            <p className="text-sm">Reserva una clase con tu profesor favorito</p>
          </div>
        )}
      </div>
    </div>
  )
}
