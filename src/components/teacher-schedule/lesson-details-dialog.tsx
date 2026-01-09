'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, User, BookOpen, Video, FileText, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScheduleLesson } from '@/types/schedule'
import { getLessonColorClasses, getInitials } from '@/types/schedule'
import { cn } from '@/lib/utils'

interface LessonDetailsDialogProps {
  lesson: ScheduleLesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
  onContactStudent?: (studentEmail: string) => void
}

export function LessonDetailsDialog({
  lesson,
  open,
  onOpenChange,
  onJoinClass,
  onViewMaterials,
  onContactStudent,
}: LessonDetailsDialogProps) {
  if (!lesson) return null

  const colors = getLessonColorClasses(lesson.color)
  const isLive = lesson.status === 'in_progress'
  const isCompleted = lesson.status === 'completed'
  const isCancelled = lesson.status === 'cancelled'

  const getStatusBadge = () => {
    if (isCancelled) {
      return <Badge variant="destructive">Cancelada</Badge>
    }
    if (isCompleted) {
      return <Badge className="bg-green-100 text-green-700 border-0">Completada</Badge>
    }
    if (isLive) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-0">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          En Vivo
        </Badge>
      )
    }
    return <Badge variant="secondary">Programada</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <BookOpen className={cn("h-5 w-5", colors.text)} />
            </div>
            <div>
              <span className="text-lg">{lesson.courseTitle}</span>
              <p className="text-sm font-normal text-muted-foreground">{lesson.courseLevel}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <span className="text-sm text-muted-foreground">
              {lesson.duration} minutos
            </span>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Fecha</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {format(new Date(lesson.date), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Horario</p>
                <p className="text-sm text-muted-foreground">
                  {lesson.startTime} - {lesson.endTime}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Student Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={lesson.student.image || ''} />
              <AvatarFallback className={cn("text-sm font-bold", colors.bg, colors.text)}>
                {getInitials(lesson.student.name, lesson.student.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{lesson.student.name} {lesson.student.lastName}</p>
              </div>
              <p className="text-sm text-muted-foreground">{lesson.student.email}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onContactStudent?.(lesson.student.email)}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>

          {/* Topic */}
          {lesson.topic && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Tema de la clase</p>
                <p className="text-sm text-muted-foreground">{lesson.topic}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onViewMaterials?.(lesson.id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Materiales
            </Button>
            {!isCancelled && !isCompleted && (
              <Button
                className="flex-1"
                onClick={() => onJoinClass?.(lesson.id)}
              >
                <Video className="h-4 w-4 mr-2" />
                {isLive ? 'Unirse Ahora' : 'Entrar al Aula'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
