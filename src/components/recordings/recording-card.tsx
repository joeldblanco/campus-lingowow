'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/user-avatar'
import { 
  Play, 
  Clock, 
  Calendar, 
  Download,
  Loader2,
  Video
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RecordingCardProps {
  recording: {
    id: string
    bookingId: string
    status: string
    duration: number | null
    startedAt: Date | null
    endedAt: Date | null
    segmentNumber?: number
    booking: {
      id: string
      day: string
      timeSlot: string
      student: {
        id: string
        name: string
        lastName: string | null
        image: string | null
      }
      teacher: {
        id: string
        name: string
        lastName: string | null
        image: string | null
      }
      enrollment: {
        course: {
          id: string
          title: string
          language: string
          level: string
        }
      }
    }
  }
  isAdmin?: boolean
}

export function RecordingCard({ recording, isAdmin = false }: RecordingCardProps) {
  const { booking } = recording
  const teacher = booking.teacher
  const student = booking.student
  const course = booking.enrollment.course

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = () => {
    switch (recording.status) {
      case 'READY':
        return (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-green-100 text-green-800 border border-green-300">
            <Video className="w-3 h-3 mr-1" />
            Disponible
          </Badge>
        )
      case 'PROCESSING':
        return (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-md">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Procesando...
          </Badge>
        )
      case 'ARCHIVED':
        return (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-gray-100 text-gray-800 border border-gray-300">
            Archivado
          </Badge>
        )
      default:
        return null
    }
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
      case 'principiante':
      case 'a1':
      case 'a2':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
      case 'intermedio':
      case 'b1':
      case 'b2':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
      case 'avanzado':
      case 'c1':
      case 'c2':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isReady = recording.status === 'READY'

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Thumbnail / Video Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        {/* Placeholder con icono de video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-16 h-16 text-slate-600" />
        </div>
        
        {/* Overlay con botón de play */}
        {isReady && (
          <Link 
            href={`/recordings/${recording.id}`}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </Link>
        )}

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Duración */}
        {recording.duration && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded">
            {formatDuration(recording.duration)}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Título del curso */}
        <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {course.title}
          {recording.segmentNumber && recording.segmentNumber > 1 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">
              (Parte {recording.segmentNumber})
            </span>
          )}
        </h3>

        {/* Info del profesor o estudiante (según rol) */}
        <div className="flex items-center gap-2 mb-3">
          {isAdmin ? (
            <>
              <UserAvatar
                userId={student.id}
                userName={student.name}
                userLastName={student.lastName}
                userImage={student.image}
                className="h-6 w-6"
                fallbackClassName="text-xs bg-green-100 text-green-700"
              />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {student.name} {student.lastName}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  Profesor: {teacher.name} {teacher.lastName}
                </span>
              </div>
            </>
          ) : (
            <>
              <UserAvatar
                userId={teacher.id}
                userName={teacher.name}
                userLastName={teacher.lastName}
                userImage={teacher.image}
                className="h-6 w-6"
                fallbackClassName="text-xs bg-blue-100 text-blue-700"
              />
              <span className="text-sm text-muted-foreground">
                {teacher.name} {teacher.lastName}
              </span>
            </>
          )}
        </div>

        {/* Badges y metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className={getLevelColor(course.level)}>
            {course.level}
          </Badge>
        </div>

        {/* Fecha y hora */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(booking.day)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{booking.timeSlot}</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          {isReady ? (
            <>
              <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Link href={`/recordings/${recording.id}`}>
                  <Play className="w-4 h-4 mr-2" />
                  Ver
                </Link>
              </Button>
              <Button variant="outline" size="icon" title="Descargar">
                <Download className="w-4 h-4" />
              </Button>
            </>
          ) : recording.status === 'PROCESSING' ? (
            <Button disabled className="flex-1">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Procesando
            </Button>
          ) : (
            <Button disabled variant="outline" className="flex-1">
              No disponible
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
