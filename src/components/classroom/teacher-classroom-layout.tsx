'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCall } from '@/components/classroom/video-call'
import { ClassMaterials } from '@/components/classroom/class-materials'
import { WhiteboardArea } from '@/components/classroom/whiteboard-area'
// import { ClassChat } from '@/components/classroom/class-chat'
import { ClassNotes } from '@/components/classroom/class-notes'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Video, LogIn, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { checkTeacherAttendance, markTeacherAttendance } from '@/lib/actions/attendance'
import { endJitsiMeeting } from '@/lib/actions/jitsi'
import { useRouter } from 'next/navigation'
import { validateClassAccess, shouldShowEndWarning } from '@/lib/utils/class-access'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface TeacherClassroomLayoutProps {
  classId: string
  teacherId: string
  studentId: string
  courseName: string
  lessonName: string
  bookingId: string
  day: string
  timeSlot: string
}

export const TeacherClassroomLayout: React.FC<TeacherClassroomLayoutProps> = ({
  classId,
  teacherId,
  // studentId, // Temporarily commented out with chat implementation
  courseName,
  lessonName,
  bookingId,
  day,
  timeSlot,
}) => {
  const router = useRouter()
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [minutesUntilEnd, setMinutesUntilEnd] = useState<number | null>(null)
  const [showEndWarning, setShowEndWarning] = useState(false)

  useEffect(() => {
    // Marcar asistencia automáticamente cuando el profesor ingresa al classroom
    const autoMarkAttendance = async () => {
      try {
        // Primero verificar si ya está marcada
        const { attendanceMarked: marked, error } = await checkTeacherAttendance(classId, teacherId)

        if (error) {
          console.error('Error checking teacher attendance:', error)
        }

        if (marked) {
          // Ya está marcada, solo actualizar el estado
          setAttendanceMarked(true)
        } else {
          // No está marcada, marcarla automáticamente
          const result = await markTeacherAttendance(classId, teacherId)
          if (result.success) {
            setAttendanceMarked(true)
            console.log('✅ Asistencia del profesor registrada automáticamente')
          } else {
            console.error('Error al marcar asistencia automáticamente:', result.error)
          }
        }
      } catch (error) {
        console.error('Error en registro automático de asistencia:', error)
      } finally {
        setIsChecking(false)
      }
    }
    autoMarkAttendance()
  }, [classId, teacherId])

  // Monitor class end time
  useEffect(() => {
    const checkClassTime = () => {
      const validation = validateClassAccess(day, timeSlot, true)
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
      const result = await markTeacherAttendance(classId, teacherId)

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

  const handleEndClass = async () => {
    try {
      setIsLoading(true)
      const result = await endJitsiMeeting(bookingId)

      if (result.success) {
        toast.success(`Clase finalizada. Duración: ${result.duration} mins`)
        // Esperar un momento para que el usuario lea el mensaje
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        toast.error(result.error || 'Error al finalizar la clase')
      }
    } catch (error) {
      console.error('Error ending class:', error)
      toast.error('Error al finalizar la clase')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartRecording = () => {
    toast('Grabación iniciada. Esta sesión se está grabando')
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
          <p className="text-xs text-blue-600">Vista del Profesor</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleStartRecording}>
            <Video className="h-4 w-4 mr-2" />
            Grabar sesión
          </Button>
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
          <VideoCall bookingId={bookingId} />
        </div>

        <div className="col-span-1">
          <Tabs defaultValue="materials">
            <TabsList className="w-full">
              <TabsTrigger value="materials" className="flex-1">
                Materiales
              </TabsTrigger>
              <TabsTrigger value="whiteboard" className="flex-1">
                Pizarra
              </TabsTrigger>
              {/* <TabsTrigger value="chat" className="flex-1">
                Chat
              </TabsTrigger> */}
              <TabsTrigger value="notes" className="flex-1">
                Notas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="h-[calc(100vh-12rem)] overflow-y-auto">
              <ClassMaterials classId={classId} />
            </TabsContent>

            <TabsContent value="whiteboard" className="h-[calc(100vh-12rem)]">
              <WhiteboardArea classId={classId} />
            </TabsContent>

            {/* <TabsContent value="chat" className="h-[calc(100vh-12rem)]">
              <ClassChat classId={classId} studentId={studentId} teacherId={teacherId} />
            </TabsContent> */}

            <TabsContent value="notes" className="h-[calc(100vh-12rem)]">
              <ClassNotes classId={classId} studentId={teacherId} />
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
