'use client'

import { Button } from '@/components/ui/button'
import { enterGoogleMeetClassroom } from '@/lib/actions/google-meet-classroom'
import { checkTeacherAttendance, markTeacherAttendance } from '@/lib/actions/attendance'
import { replaceClassroomWithGoogleMeet } from '@/lib/open-classroom-window'
import { Loader2 } from 'lucide-react'
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
}) => {
  const [isInitializing, setIsInitializing] = useState(true)
  const [attendanceChecked, setAttendanceChecked] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

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
  }, [classId, teacherId, retryKey])

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

        replaceClassroomWithGoogleMeet(result.meetingUrl)
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
  }, [attendanceChecked, bookingId, retryKey])

  const handleRetry = () => {
    setInitError(null)
    setAttendanceChecked(false)
    setIsInitializing(true)
    setRetryKey((key) => key + 1)
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

  if (initError) {
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

  return null
}
