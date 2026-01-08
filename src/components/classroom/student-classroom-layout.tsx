'use client'

import React, { useState, useEffect } from 'react'
import { ClassroomContainer } from '@/components/classroom/classroom-container'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
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
    const router = useRouter()
    const [isInitializing, setIsInitializing] = useState(true)
    const [roomDetails, setRoomDetails] = useState<{ roomName: string, jwt: string | null } | null>(null)

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

                // Get Token
                const tokenRes = await fetch('/api/livekit/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName, bookingId })
                })

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
                toast.error('Error de conexión')
            } finally {
                setIsInitializing(false)
            }
        }
        join()
    }, [bookingId])

    const handleLeave = () => {
        router.push('/dashboard')
    }

    if (isInitializing || !roomDetails) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800">Conectando...</h2>
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

    const endTime = getEndTime()

    return (
        <ClassroomContainer
            bookingId={bookingId}
            roomName={roomDetails.roomName}
            jwt={roomDetails.jwt}
            lessonData={undefined} // Start with no lesson
            endTime={endTime}
            userDisplayName={currentUserName}
            isTeacher={false}
            onMeetingEnd={handleLeave}
        />
    )
}
