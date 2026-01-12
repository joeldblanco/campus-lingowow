'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getRecordingById, markRecordingAsViewed } from '@/lib/actions/recordings'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, ArrowLeft, Calendar, Clock, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { VideoPlayer } from './video-player'

interface RecordingViewerProps {
  recordingId: string
}

interface RecordingData {
  id: string
  bookingId: string
  status: string
  duration: number | null
  startedAt: Date | null
  endedAt: Date | null
  fileUrl: string | null
  signedUrl?: string | null
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

export function RecordingViewer({ recordingId }: RecordingViewerProps) {
  const [recording, setRecording] = useState<RecordingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const result = await getRecordingById(recordingId)

        if (result.success && result.data) {
          setRecording(result.data as RecordingData)
          // Marcar como vista
          await markRecordingAsViewed(recordingId)
        } else {
          setError(result.error || 'Error al cargar la grabación')
        }
      } catch (err) {
        console.error('Error fetching recording:', err)
        setError('Error al cargar la grabación')
      } finally {
        setLoading(false)
      }
    }

    fetchRecording()
  }, [recordingId])

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar la grabación</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button asChild>
          <Link href="/recordings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a grabaciones
          </Link>
        </Button>
      </div>
    )
  }

  const { booking } = recording
  const teacher = booking.teacher
  const course = booking.enrollment.course
  const videoUrl = recording.signedUrl || recording.fileUrl

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/recordings" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Grabaciones
        </Link>
        <span>/</span>
        <span className="text-foreground">{course.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          {videoUrl ? (
            <VideoPlayer src={videoUrl} title={course.title} />
          ) : (
            <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Video no disponible</p>
              </div>
            </div>
          )}

          {/* Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <UserAvatar
                  userId={teacher.id}
                  userName={teacher.name}
                  userLastName={teacher.lastName}
                  userImage={teacher.image}
                  className="h-8 w-8"
                  fallbackClassName="bg-blue-100 text-blue-700"
                />
                <span className="text-muted-foreground">
                  {teacher.name} {teacher.lastName}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">{formatDate(booking.day)}</span>
              </div>
            </div>

            {/* <div className="flex gap-2">
              <Button variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Hacer Pregunta
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar Completa
              </Button>
            </div> */}
          </div>

          {/* Level Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getLevelColor(course.level)}>
              {course.level}
            </Badge>
          </div>

          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle>Acerca de esta sesión</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Clase grabada el {formatDate(booking.day)} a las {booking.timeSlot}. Esta grabación
                corresponde al curso de {course.title} con el profesor {teacher.name}{' '}
                {teacher.lastName}.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tabs for Chapters/Materials/Transcript */}
          <Card>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="materials">Materiales</TabsTrigger>
                <TabsTrigger value="transcript">Transcripción</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="p-4">
                <div className="space-y-4">
                  {/* Fecha */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha</p>
                      <p className="font-medium capitalize">{formatDate(booking.day)}</p>
                    </div>
                  </div>

                  {/* Hora */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horario</p>
                      <p className="font-medium">{booking.timeSlot}</p>
                    </div>
                  </div>

                  {/* Duración */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duración</p>
                      <p className="font-medium">{formatDuration(recording.duration)}</p>
                    </div>
                  </div>

                  {/* Profesor */}
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={teacher.id}
                      userName={teacher.name}
                      userLastName={teacher.lastName}
                      userImage={teacher.image}
                      className="h-10 w-10"
                      fallbackClassName="bg-blue-100 text-blue-700"
                    />
                    <div>
                      <p className="text-sm text-muted-foreground">Profesor</p>
                      <p className="font-medium">
                        {teacher.name} {teacher.lastName}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="p-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay materiales disponibles para esta clase.</p>
                </div>
              </TabsContent>

              <TabsContent value="transcript" className="p-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Transcripción no disponible.</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Quick Downloads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Descargas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {videoUrl ? (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Video
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay descargas disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
