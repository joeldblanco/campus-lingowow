'use client'

import React, { useState, useEffect } from 'react'
import { ClassroomContainer } from '@/components/classroom/classroom-container'
import { createJitsiMeeting, endJitsiMeeting } from '@/lib/actions/jitsi'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { checkTeacherAttendance, markTeacherAttendance } from '@/lib/actions/attendance'
import { Loader2 } from 'lucide-react'
import { LessonForView } from '@/types/lesson'

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
  studentId,
  courseName,
  lessonName,
  bookingId,
  day,
  timeSlot,
  currentUserName
}) => {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  const [roomDetails, setRoomDetails] = useState<{ roomName: string, jwt: string | null } | null>(null)
  const [attendanceChecked, setAttendanceChecked] = useState(false)

  // 1. Mark Attendance
  useEffect(() => {
    const initAttendance = async () => {
      try {
        const { attendanceMarked } = await checkTeacherAttendance(classId, teacherId)
        if (!attendanceMarked) {
          await markTeacherAttendance(classId, teacherId)
          toast.success('Asistencia registrada automáticamente')
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
        const meetingResult = await createJitsiMeeting(bookingId)
        if (!meetingResult.success || !meetingResult.roomName) {
          toast.error(meetingResult.error || 'Error creando sala')
          return
        }

        const roomName = meetingResult.roomName

        // B. Get JWT Token from API Route
        const tokenResponse = await fetch('/api/jitsi/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomName,
            bookingId: bookingId,
          })
        })

        if (!tokenResponse.ok) {
          throw new Error('Error obteniendo token de acceso')
        }

        const { token, usePublicJitsi } = await tokenResponse.json()

        if (usePublicJitsi) {
          toast.warning('JAAS Key faltante: Usando modo demostración público')
        }

        setRoomDetails({ roomName, jwt: token }) // Token can be null now

      } catch (error) {
        console.error('Error initializing classroom:', error)
        toast.error('Error al conectar con el aula virtual')
      } finally {
        setIsInitializing(false)
      }
    }

    initCall()
  }, [bookingId, attendanceChecked])

  const handleMeetingEnd = async () => {
    toast.info('Finalizando clase...')
    try {
      await endJitsiMeeting(bookingId)
      router.push('/dashboard')
    } catch (error) {
      toast.error('Error al guardar el estado de la clase')
    }
  }

  if (isInitializing || !roomDetails) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Preparando el aula...</h2>
        <p className="text-gray-500">Registrando asistencia y conectando servicios</p>
      </div>
    )
  }

  // Calculate end time based on booking slot vs current time
  // timeSlot format expected: "09:00 - 09:45" (UTC? Or Local? User says DB is UTC)
  // Assuming day is "YYYY-MM-DD"
  const getEndTime = () => {
    try {
      if (!day || !timeSlot) return new Date(new Date().getTime() + 45 * 60000)

      const parts = timeSlot.split('-')
      if (parts.length < 2) return new Date(new Date().getTime() + 45 * 60000)

      const endTimeStr = parts[1].trim() // "09:45"
      const [hours, minutes] = endTimeStr.split(':').map(Number)

      // Parse day string "YYYY-MM-DD" safely
      // We assume day comes as "YYYY-MM-DD"
      const dateParts = day.split('-')
      if (dateParts.length !== 3) return new Date(new Date().getTime() + 45 * 60000)

      const year = parseInt(dateParts[0])
      const month = parseInt(dateParts[1]) - 1 // Month is 0-indexed in JS
      const dayOfMonth = parseInt(dateParts[2])

      // Create Date object assuming inputs are UTC
      // Date.UTC returns timestamp in ms
      const utcTimestamp = Date.UTC(year, month, dayOfMonth, hours, minutes, 0)
      const endDate = new Date(utcTimestamp)

      // FALLBACK: If class is already over (endDate < now), timer handles it (00:00).
      // If result is Invalid, fallback
      if (isNaN(endDate.getTime())) return new Date(new Date().getTime() + 45 * 60000)

      return endDate
    } catch (e) {
      console.error('Error parsing meeting end time', e)
      return new Date(new Date().getTime() + 45 * 60000)
    }
  }

  const endTime = getEndTime()

  return (
    <ClassroomContainer
      roomName={roomDetails.roomName}
      jwt={roomDetails.jwt}
      bookingId={bookingId}
      lessonData={undefined}
      endTime={endTime}
      userDisplayName={currentUserName}
      isTeacher={true}
      onMeetingEnd={handleMeetingEnd}
    />
  )
}
