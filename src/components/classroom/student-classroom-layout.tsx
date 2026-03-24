'use client'

import React, { useState, useEffect } from 'react'
import { ClassroomContainer } from '@/components/classroom/classroom-container'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createLiveKitMeeting } from '@/lib/actions/livekit'

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

export const StudentClassroomLayout: React.FC<StudentClassroomLayoutProps> = (props) => {
    const { bookingId, day, timeSlot, currentUserName } = props
    const [isInitializing, setIsInitializing] = useState(true)
    const [roomDetails, setRoomDetails] = useState<{ roomName: string, jwt: string | null } | null>(null)
    const [initError, setInitError] = useState<string | null>(null)
    const [retryKey, setRetryKey] = useState(0)

    useEffect(() => {
        const join = async () => {
            try {
                // Reuse logic: Student triggers 'create' which acts as 'get or create' usually.
                // In many systems students might wait, but to ensure they can join if early, we check meeting.

                const result = await createLiveKitMeeting(bookingId)
                if (!result.success || !result.roomName) {
                    toast.error('No se pudo conectar a la clase. Espera al profesor.')
                    // Don't return, maybe teacher hasn't started it? 
                    // If JaaS, room must be created via API to exist.
                    return
                }

                const roomName = result.roomName

                // Get Token (with 15s timeout)
                const tokenController = new AbortController()
                const tokenTimeout = setTimeout(() => tokenController.abort(), 15_000)
                const tokenRes = await fetch('/api/livekit/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName, bookingId }),
                    signal: tokenController.signal,
                })
                clearTimeout(tokenTimeout)

                if (!tokenRes.ok) throw new Error('Token error')
                const { token } = await tokenRes.json()

                setRoomDetails({ roomName, jwt: token }) // Token can be null

                // Mark Attendance (only within class schedule)
                const attendanceRes = await fetch('/api/attendance/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId, userType: 'student' })
                })

                if (attendanceRes.ok) {
                    toast.success('Asistencia registrada automáticamente')
                } else {
                    const attendanceData = await attendanceRes.json()
                    if (attendanceData.outsideSchedule) {
                        toast.info(attendanceData.error || 'Fuera del horario de clase')
                    }
                }

            } catch (e) {
                console.error(e)
                const msg = e instanceof Error && e.name === 'AbortError'
                    ? 'Tiempo de espera agotado al conectar'
                    : 'Error de conexión'
                toast.error(msg)
                setInitError(msg)
            } finally {
                setIsInitializing(false)
            }
        }
        join()
    }, [bookingId, retryKey])

    const handleLeave = () => {
        window.close()
    }

    if (isInitializing) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800">Conectando...</h2>
            </div>
        )
    }

    if (!roomDetails) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {initError || 'No se pudo conectar a la clase'}
                </h2>
                <p className="text-gray-500 mb-4">Verifica tu conexión e intenta de nuevo</p>
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    onClick={() => {
                        setInitError(null)
                        setIsInitializing(true)
                        setRoomDetails(null)
                        setRetryKey(k => k + 1)
                    }}
                >
                    Reintentar
                </button>
            </div>
        )
    }

    // Calculate end time based on booking slot (UTC from DB)
    // timeSlot format: "09:00 - 09:45", day format: "YYYY-MM-DD"
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
            bookingId={bookingId}
            roomName={roomDetails.roomName}
            jwt={roomDetails.jwt}
            lessonData={undefined} // Start with no lesson
            startTime={startTime}
            endTime={endTime}
            userDisplayName={currentUserName}
            isTeacher={false}
            onMeetingEnd={handleLeave}
        />
    )
}
