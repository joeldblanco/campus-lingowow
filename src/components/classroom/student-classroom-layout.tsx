'use client'

import { Button } from '@/components/ui/button'
import { enterGoogleMeetClassroom } from '@/lib/actions/google-meet-classroom'
import { replaceClassroomWithGoogleMeet } from '@/lib/open-classroom-window'
import { Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface StudentClassroomLayoutProps {
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

export const StudentClassroomLayout: React.FC<StudentClassroomLayoutProps> = ({
  bookingId,
}) => {
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const prepareMeet = async () => {
      try {
        const result = await enterGoogleMeetClassroom(bookingId)
        if (!result.success || !result.meetingUrl) {
          const message = result.error || 'No se pudo preparar Google Meet'
          setInitError(message)
          toast.error(message)
          return
        }

        const attendanceRes = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, userType: 'student' }),
        })

        if (attendanceRes.ok) {
          toast.success('Asistencia registrada automaticamente')
        } else {
          const attendanceData = await attendanceRes.json()
          if (attendanceData.outsideSchedule) {
            toast.info(attendanceData.error || 'Fuera del horario de clase')
          }
        }

        replaceClassroomWithGoogleMeet(result.meetingUrl)
      } catch (error) {
        console.error(error)
        const message = 'Error de conexion'
        setInitError(message)
        toast.error(message)
      } finally {
        setIsInitializing(false)
      }
    }

    prepareMeet()
  }, [bookingId, retryKey])

  const handleRetry = () => {
    setInitError(null)
    setIsInitializing(true)
    setRetryKey((key) => key + 1)
  }

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Conectando...</h2>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
        <h2 className="mb-2 text-xl font-semibold text-gray-800">
          {initError || 'No se pudo conectar a la clase'}
        </h2>
        <p className="mb-4 text-gray-500">Verifica tu conexion e intenta de nuevo</p>
        <Button onClick={handleRetry}>Reintentar</Button>
      </div>
    )
  }

  return null
}
