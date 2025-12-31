'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Video, FileText, Clock, Calendar, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { StudentScheduleLesson } from '@/lib/actions/student-schedule'

interface LessonDetailsDialogProps {
  lesson: StudentScheduleLesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
  onContactTeacher?: (email: string) => void
}

function getLessonColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  }
  return colorMap[color] || colorMap.blue
}

function getInitials(name: string, lastName?: string | null): string {
  const first = name?.charAt(0) || ''
  const last = lastName?.charAt(0) || name?.split(' ')[1]?.charAt(0) || ''
  return (first + last).toUpperCase()
}

function getStatusBadge(status: StudentScheduleLesson['status']) {
  switch (status) {
    case 'in_progress':
      return <Badge className="bg-green-500 text-white">En Progreso</Badge>
    case 'completed':
      return <Badge variant="secondary">Completada</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Cancelada</Badge>
    default:
      return <Badge variant="outline">Programada</Badge>
  }
}

export function LessonDetailsDialog({
  lesson,
  open,
  onOpenChange,
  onJoinClass,
  onViewMaterials,
  onContactTeacher,
}: LessonDetailsDialogProps) {
  if (!lesson) return null

  const colors = getLessonColorClasses(lesson.color)
  const lessonDate = new Date(lesson.date)
  const isLive = lesson.status === 'in_progress'
  const isCancelled = lesson.status === 'cancelled'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Detalles de la Clase
            </DialogTitle>
            {getStatusBadge(lesson.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="space-y-2">
            <Badge className={cn("text-sm font-medium", colors.bg, colors.text, "border-0")}>
              {lesson.courseTitle}
            </Badge>
            {lesson.courseLevel && (
              <p className="text-sm text-muted-foreground">
                Nivel: {lesson.courseLevel}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(lessonDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{lesson.startTime} - {lesson.endTime}</span>
            <span className="text-xs">({lesson.duration} min)</span>
          </div>

          {/* Teacher Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={lesson.teacher.image || ''} />
              <AvatarFallback className={cn("font-bold", colors.bg, colors.text)}>
                {getInitials(lesson.teacher.name, lesson.teacher.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {lesson.teacher.name} {lesson.teacher.lastName}
              </p>
              <p className="text-sm text-muted-foreground">Profesor</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onContactTeacher?.(lesson.teacher.email)}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>

          {/* Topic */}
          {lesson.topic && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tema</p>
              <p className="text-sm">{lesson.topic}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onViewMaterials?.(lesson.id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Materiales
            </Button>
            {!isCancelled && (
              <Button
                className="flex-1"
                onClick={() => onJoinClass?.(lesson.id)}
                disabled={!isLive && lesson.status !== 'scheduled'}
              >
                <Video className="h-4 w-4 mr-2" />
                {isLive ? 'Unirse Ahora' : 'Unirse a Clase'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
