// /components/virtual-classroom/classroom-layout.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCall } from '@/components/classroom/video-call'
import { ClassMaterials } from '@/components/classroom/class-materials'
import { MeetingChat } from '@/components/jitsi/MeetingChat'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, LogIn, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { checkStudentAttendance, markStudentAttendance } from '@/lib/actions/attendance'
import { validateClassAccess, shouldShowEndWarning } from '@/lib/utils/class-access'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ClassroomLayoutProps {
  classId: string
  studentId: string
  teacherId: string
  studentName: string
  studentImage: string | null
  teacherName: string
  teacherImage: string | null
  courseName: string
  lessonName: string
  bookingId: string
  currentUserId: string
  currentUserName: string
  currentUserImage?: string | null
  day: string
  timeSlot: string
}

export const ClassroomLayout: React.FC<ClassroomLayoutProps> = ({
  classId,
  studentId,
  studentName,
  // studentImage, // TODO: Use for future features
  currentUserId,
  currentUserName,
  currentUserImage,
  courseName,
  lessonName,
  bookingId,
  day,
  timeSlot,
}) => {
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [minutesUntilEnd, setMinutesUntilEnd] = useState<number | null>(null)
  const [showEndWarning, setShowEndWarning] = useState(false)

  useEffect(() => {
    // Check if attendance is already marked
    const checkAttendance = async () => {
      try {
        const { attendanceMarked: marked, error } = await checkStudentAttendance(classId, studentId)
        if (error) {
          console.error('Error checking attendance:', error)
          toast.error('Error al verificar la asistencia')
        }
        setAttendanceMarked(marked)
      } catch (error) {
        console.error('Error checking attendance:', error)
        toast.error('Error al verificar la asistencia')
      } finally {
        setIsChecking(false)
      }
    }
    checkAttendance()
  }, [classId, studentId])

  // Monitor class end time
  useEffect(() => {
    const checkClassTime = () => {
      const validation = validateClassAccess(day, timeSlot, false)
      if (validation.minutesUntilEnd !== undefined) {
        setMinutesUntilEnd(validation.minutesUntilEnd)
        setShowEndWarning(shouldShowEndWarning(validation.minutesUntilEnd))
      }
    }

    // Check immediately
    checkClassTime()

    // Check every minute
    const interval = setInterval(checkClassTime, 60000)

    return () => clearInterval(interval)
  }, [day, timeSlot])

  const handleMarkAttendance = async () => {
    try {
      setIsLoading(true)
      const result = await markStudentAttendance(classId, studentId)

      if (result.success) {
        setAttendanceMarked(true)
        toast.success('Asistencia registrada correctamente')
      } else {
        toast.error(result.error || 'Error al marcar la asistencia')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al procesar la solicitud')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndClass = () => {
    // Lógica para finalizar la clase
    toast('Clase finalizada. La grabación estará disponible en tu panel en unos minutos')
  }

  // Show loading state while checking attendance
  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Verificando asistencia...</p>
      </div>
    )
  }

  // Show attendance button if attendance is not marked yet
  if (!attendanceMarked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">¡Bienvenido a tu clase de {courseName}!</h1>
          <p className="text-gray-600 mb-6">
            Haz clic en el botón para acceder al aula virtual.
          </p>
          <Button onClick={handleMarkAttendance} size="lg" className="w-full" disabled={isLoading}>
            <LogIn className="h-5 w-5 mr-2" />
            {isLoading ? 'Procesando...' : 'Acceder a la clase'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center bg-white">
        <div>
          <h1 className="text-xl font-bold">{courseName}</h1>
          <p className="text-sm text-gray-500">{lessonName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={handleEndClass}>
            Finalizar clase
          </Button>
        </div>
      </header>

      {/* Warning when class is about to end */}
      {showEndWarning && minutesUntilEnd !== null && (
        <Alert className="m-4 border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">La clase está por finalizar</AlertTitle>
          <AlertDescription className="text-orange-700">
            Quedan {minutesUntilEnd} minuto{minutesUntilEnd !== 1 ? 's' : ''} para que termine la clase.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4 p-4 flex-grow">
        <div className="col-span-2">
          <VideoCall 
            bookingId={bookingId}
            studentName={studentName}
          />
        </div>

        <div className="col-span-1">
          <Tabs defaultValue="chat">
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1">
                Chat
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex-1">
                Materiales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="h-[calc(100vh-12rem)]">
              <MeetingChat
                bookingId={bookingId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserImage={currentUserImage}
              />
            </TabsContent>

            <TabsContent value="materials" className="h-[calc(100vh-12rem)] overflow-y-auto">
              <ClassMaterials classId={classId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <footer className="p-4 border-t bg-white">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">Lingowow {new Date().getFullYear()}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar materiales
            </Button>
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como completada
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
