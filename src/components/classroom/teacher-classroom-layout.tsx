'use client'

import { ClassroomContainer } from '@/components/classroom/classroom-container'
import { checkTeacherAttendance, markTeacherAttendance } from '@/lib/actions/attendance'
import { createLiveKitMeeting, endLiveKitMeeting } from '@/lib/actions/livekit'
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
  day,
  timeSlot,
  currentUserName,
}) => {
  const [isInitializing, setIsInitializing] = useState(true)
  const [roomDetails, setRoomDetails] = useState<{ roomName: string; jwt: string | null } | null>(
    null
  )
  const [attendanceChecked, setAttendanceChecked] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // 1. Mark Attendance (only within class schedule)
  useEffect(() => {
    const initAttendance = async () => {
      try {
        const { attendanceMarked } = await checkTeacherAttendance(classId, teacherId)
        if (!attendanceMarked) {
          const result = await markTeacherAttendance(classId, teacherId)
          if (result.success) {
            if (result.markedAsPayable) {
              toast.success('Asistencia registrada - Clase marcada como pagable automáticamente')
            } else {
              toast.success('Asistencia registrada automáticamente')
            }
          } else if (result.outsideSchedule) {
            toast.info(result.error || 'Fuera del horario de clase')
          }
        }
        setAttendanceChecked(true)
      } catch (e) {
        console.error('Error attendance', e)
        setAttendanceChecked(true) // Proceed anyway
      }
    }
    initAttendance()
  }, [classId, teacherId])

  // 2. Initialize Call (Get Room & Token)
  useEffect(() => {
    const initCall = async () => {
      if (!attendanceChecked) return

      try {
        // A. Create/Get Room from Server Action
        const meetingResult = await createLiveKitMeeting(bookingId)
        if (!meetingResult.success || !meetingResult.roomName) {
          toast.error(meetingResult.error || 'Error creando sala')
          return
        }

        const roomName = meetingResult.roomName

        // B. Get JWT Token from API Route (with 15s timeout)
        const tokenController = new AbortController()
        const tokenTimeout = setTimeout(() => tokenController.abort(), 15_000)
        const tokenResponse = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomName,
            bookingId: bookingId,
          }),
          signal: tokenController.signal,
        })
        clearTimeout(tokenTimeout)

        if (!tokenResponse.ok) {
          throw new Error('Error obteniendo token de acceso')
        }

        const { token } = await tokenResponse.json()

        setRoomDetails({ roomName, jwt: token }) // Token can be null now
      } catch (error) {
        console.error('Error initializing classroom:', error)
        const msg = error instanceof Error && error.name === 'AbortError'
          ? 'Tiempo de espera agotado al conectar'
          : 'Error al conectar con el aula virtual'
        toast.error(msg)
        setInitError(msg)
      } finally {
        setIsInitializing(false)
      }
    }

    initCall()
  }, [bookingId, attendanceChecked])

  const handleMeetingEnd = async () => {
    toast.info('Finalizando clase...')
    try {
      await endLiveKitMeeting(bookingId)
      window.close()
    } catch (error) {
      console.error('Error ending meeting:', error)
      toast.error('Error al guardar el estado de la clase')
    }
  }

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Preparando el aula...</h2>
        <p className="text-gray-500">Registrando asistencia y conectando servicios</p>
      </div>
    )
  }

  if (!roomDetails) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {initError || 'No se pudo preparar el aula'}
        </h2>
        <p className="text-gray-500 mb-4">Verifica tu conexión e intenta de nuevo</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          onClick={() => {
            setInitError(null)
            setIsInitializing(true)
            setAttendanceChecked(false)
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Calculate end time based on booking slot
  // timeSlot format: "09:00 - 09:45", day format: "YYYY-MM-DD" (UTC from DB)
  const getEndTime = (): Date => {
    if (!day || !timeSlot) {
      return new Date(Date.now() + 45 * 60000)
    }

    const parts = timeSlot.split('-')
    if (parts.length < 2) {
      return new Date(Date.now() + 45 * 60000)
    }

    const endTimeStr = parts[1].trim()
    const [hours, minutes] = endTimeStr.split(':').map(Number)
    const dateParts = day.split('-')

    if (dateParts.length !== 3 || isNaN(hours) || isNaN(minutes)) {
      return new Date(Date.now() + 45 * 60000)
    }

    const year = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1
    const dayOfMonth = parseInt(dateParts[2])

    const utcTimestamp = Date.UTC(year, month, dayOfMonth, hours, minutes, 0)
    const endDate = new Date(utcTimestamp)

    if (isNaN(endDate.getTime())) {
      return new Date(Date.now() + 45 * 60000)
    }

    return endDate
  }

  // Calculate start time based on booking slot
  // timeSlot format: "09:00 - 09:45", day format: "YYYY-MM-DD" (UTC from DB)
  const getStartTime = (): Date => {
    if (!day || !timeSlot) {
      return new Date(Date.now())
    }

    const parts = timeSlot.split('-')
    if (parts.length < 2) {
      return new Date(Date.now())
    }

    const startTimeStr = parts[0].trim()
    const [hours, minutes] = startTimeStr.split(':').map(Number)
    const dateParts = day.split('-')

    if (dateParts.length !== 3 || isNaN(hours) || isNaN(minutes)) {
      return new Date(Date.now())
    }

    const year = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1
    const dayOfMonth = parseInt(dateParts[2])

    const utcTimestamp = Date.UTC(year, month, dayOfMonth, hours, minutes, 0)
    const startDate = new Date(utcTimestamp)

    if (isNaN(startDate.getTime())) {
      return new Date(Date.now())
    }

    return startDate
  }

  const endTime = getEndTime()
  const startTime = getStartTime()

  return (
    <ClassroomContainer
      roomName={roomDetails.roomName}
      jwt={roomDetails.jwt}
      bookingId={bookingId}
      lessonData={undefined}
      startTime={startTime}
      endTime={endTime}
      userDisplayName={currentUserName}
      isTeacher={true}
      onMeetingEnd={handleMeetingEnd}
    />
  )
}
