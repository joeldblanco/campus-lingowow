'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Video, FileText, Clock } from 'lucide-react'

interface UpcomingLesson {
  id: string
  courseTitle: string
  topic: string
  teacher: {
    id: string
    name: string
    lastName: string | null
    image: string | null
  }
  startTime: string
  endTime: string
  startsIn: string
  date: string
}

interface UpcomingClassCardProps {
  lesson: UpcomingLesson | null
  onJoinClass?: (lessonId: string) => void
  onViewMaterials?: (lessonId: string) => void
}

export function UpcomingClassCard({
  lesson,
  onJoinClass,
  onViewMaterials,
}: UpcomingClassCardProps) {
  if (!lesson) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
            Próxima Clase
          </span>
        </div>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            No tienes clases programadas próximamente
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Video className="mr-2 h-4 w-4" />
            Sin clases
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-primary/80 p-4">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
          Próxima Clase
        </span>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary-foreground">
              {lesson.courseTitle}
            </h3>
            <p className="text-sm text-primary-foreground/80">
              {lesson.topic}
            </p>
          </div>
          <UserAvatar
            userId={lesson.teacher.id}
            userName={lesson.teacher.name}
            userLastName={lesson.teacher.lastName}
            userImage={lesson.teacher.image}
            className="h-10 w-10 ring-2 ring-primary-foreground/20"
            fallbackClassName="bg-primary-foreground/20 text-primary-foreground text-xs font-bold"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-primary-foreground/90">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{lesson.startTime} - {lesson.endTime}</span>
          </div>
          <span className="font-bold">
            {lesson.startsIn === 'Ahora' ? 'Ahora' : `Inicia en ${lesson.startsIn}`}
          </span>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <Button 
          className="w-full" 
          onClick={() => onJoinClass?.(lesson.id)}
        >
          <Video className="mr-2 h-4 w-4" />
          Unirse a Clase
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewMaterials?.(lesson.id)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Ver Materiales
        </Button>
      </CardContent>
    </Card>
  )
}
