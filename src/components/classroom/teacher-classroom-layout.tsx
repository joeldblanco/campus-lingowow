'use client'

import { Button } from '@/components/ui/button'
import {
  endGoogleMeetClassroom,
  enterGoogleMeetClassroom,
} from '@/lib/actions/google-meet-classroom'
import { checkTeacherAttendance, markTeacherAttendance } from '@/lib/actions/attendance'
import { closeClassroomWindow } from '@/lib/open-classroom-window'
import { ExternalLink, Loader2, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface TeacherClassroomLayoutProps {
  classId: string
  teacherId: string
  studentId: string
  courseName: string
  lessonName: string
  bookingId: string
  day: string
  timeSlot: string
  currentUserName: string
}

export const TeacherClassroomLayout: React.FC<TeacherClassroomLayoutProps> = ({
  classId,
  teacherId,
  bookingId,
  day,
  timeSlot,
  currentUserName,
}) => {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  const [attendanceChecked, setAttendanceChecked] = useState(false)
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initAttendance = async () => {
      try {
        const { attendanceMarked } = await checkTeacherAttendance(classId, teacherId)
        if (!attendanceMarked) {
          const result = await markTeacherAttendance(classId, teacherId)
          if (result.success) {
            toast.success(
              result.markedAsPayable
                ? 'Asistencia registrada - Clase marcada como pagable automaticamente'
                : 'Asistencia registrada automaticamente'
            )
          } else if (result.outsideSchedule) {
            toast.info(result.error || 'Fuera del horario de clase')
          }
        }
      } catch (error) {
        console.error('Error attendance', error)
      } finally {
        setAttendanceChecked(true)
      }
    }

    initAttendance()
  }, [classId, teacherId])

  useEffect(() => {
    const prepareMeet = async () => {
      if (!attendanceChecked) return

      try {
        const result = await enterGoogleMeetClassroom(bookingId)
        if (!result.success || !result.meetingUrl) {
          const message = result.error || 'No se pudo preparar Google Meet'
          setInitError(message)
          toast.error(message)
          return
        }

        setMeetingUrl(result.meetingUrl)
      } catch (error) {
        console.error('Error initializing Google Meet classroom:', error)
        const message = 'Error al preparar el aula en Google Meet'
        setInitError(message)
        toast.error(message)
      } finally {
        setIsInitializing(false)
      }
    }

    prepareMeet()
  }, [attendanceChecked, bookingId])

  const handleRetry = () => {
    setInitError(null)
    setMeetingUrl(null)
    setAttendanceChecked(false)
    setIsInitializing(true)
  }

  const handleMeetingEnd = async () => {
    toast.info('Finalizando clase...')
    try {
      await endGoogleMeetClassroom(bookingId)
    } catch (error) {
      console.error('Error ending meeting:', error)
      toast.error('Error al guardar el estado de la clase')
    } finally {
      closeClassroomWindow(() => router.push('/dashboard'))
    }
  }

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Preparando el aula...</h2>
        <p className="text-gray-500">Registrando asistencia y creando Google Meet</p>
      </div>
    )
  }

  if (!meetingUrl) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
        <h2 className="mb-2 text-xl font-semibold text-gray-800">
          {initError || 'No se pudo preparar el aula'}
        </h2>
        <p className="mb-4 text-gray-500">Verifica la configuracion de Google Meet e intenta de nuevo</p>
        <Button onClick={handleRetry}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#202124] px-4">
      <div className="w-full max-w-lg rounded-lg bg-[#292a2d] p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
          <Video className="h-7 w-7 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">Aula lista en Google Meet</h1>
        <p className="mb-1 text-white/70">Profesor: {currentUserName}</p>
        <p className="mb-6 text-sm text-white/50">
          Horario UTC: {day} - {timeSlot}
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="h-11 bg-blue-600 hover:bg-blue-700">
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir clase en Google Meet
            </a>
          </Button>
          <Button variant="destructive" className="h-11" onClick={handleMeetingEnd}>
            Finalizar clase
          </Button>
        </div>
      </div>
    </div>
  )
}
