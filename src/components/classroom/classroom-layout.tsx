// /components/virtual-classroom/classroom-layout.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCall } from '@/components/classroom/video-call'
import { ClassMaterials } from '@/components/classroom/class-materials'
import { WhiteboardArea } from '@/components/classroom/whiteboard-area'
// import { ClassChat } from '@/components/classroom/class-chat'
import { ClassNotes } from '@/components/classroom/class-notes'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Video, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { checkStudentAttendance, markStudentAttendance } from '@/lib/actions/attendance'

interface ClassroomLayoutProps {
  classId: string
  studentId: string
  teacherId: string
  courseName: string
  lessonName: string
  bookingId: string
}

export const ClassroomLayout: React.FC<ClassroomLayoutProps> = ({
  classId,
  studentId,
  // teacherId, // Temporarily commented out with chat implementation
  courseName,
  lessonName,
  bookingId,
}) => {
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

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
              <ClassNotes classId={classId} studentId={studentId} />
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
