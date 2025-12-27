'use client'

import { TeacherClassroomLayout } from '@/components/classroom/teacher-classroom-layout'
import { StudentClassroomLayout } from '@/components/classroom/student-classroom-layout'
import { useCurrentClass } from '@/context/current-class'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getClassroomData } from '@/lib/actions/dashboard'
import { validateClassAccess } from '@/lib/utils/class-access'
import { UserRole } from '@prisma/client'
import { Clock } from 'lucide-react'

type ClassroomData = {
  studentId: string
  teacherId: string
  studentName: string
  studentImage: string | null
  teacherName: string
  teacherImage: string | null
  courseName: string
  lessonName: string
  bookingId: string
  dayUTC: string
  timeSlotUTC: string
  day: string
  timeSlot: string
}

export default function ClassroomPage() {
  const searchParams = useSearchParams()
  const { currentClassId, setCurrentClass } = useCurrentClass()
  const { data: session } = useSession()
  const [classroomData, setClassroomData] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessValidation, setAccessValidation] = useState<ReturnType<typeof validateClassAccess> | null>(null)

  const urlClassId = searchParams.get('classId')
  const effectiveClassId = urlClassId || currentClassId
  const isTeacher = session?.user?.roles?.includes(UserRole.TEACHER) || false

  // Sincronizar el ID de la URL con el estado global
  useEffect(() => {
    if (urlClassId) {
      setCurrentClass(urlClassId)
    }
  }, [urlClassId, setCurrentClass])

  // Cargar datos de la clase
  useEffect(() => {
    const loadClassroomData = async () => {
      if (effectiveClassId && session?.user?.id) {
        setLoading(true)
        try {
          const data = await getClassroomData(effectiveClassId, session.user.id)
          setClassroomData(data)

          // Validar acceso a la clase usando datos UTC
          const validation = validateClassAccess(data.dayUTC, data.timeSlotUTC, isTeacher)
          setAccessValidation(validation)
        } catch (error) {
          console.error('Error cargando datos del aula:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    loadClassroomData()
  }, [effectiveClassId, session?.user?.id, isTeacher])

  // Actualizar validación cada segundo y recargar cuando llegue la hora
  useEffect(() => {
    if (!classroomData) return

    const interval = setInterval(() => {
      const validation = validateClassAccess(classroomData.dayUTC, classroomData.timeSlotUTC, isTeacher)
      setAccessValidation(validation)

      // Si la clase ya puede accederse, recargar la página
      if (validation.canAccess && accessValidation && !accessValidation.canAccess) {
        window.location.reload()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [classroomData, isTeacher, accessValidation])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando aula virtual...</div>
          <div className="text-sm text-muted-foreground">Preparando tu clase</div>
        </div>
      </div>
    )
  }

  if (!effectiveClassId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Selecciona una clase</div>
          <div className="text-sm text-muted-foreground">
            Elige una clase desde el panel de control o la barra lateral
          </div>
        </div>
      </div>
    )
  }

  if (!classroomData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Clase no encontrada</div>
          <div className="text-sm text-muted-foreground">
            La clase seleccionada no existe o no tienes acceso a ella
          </div>
        </div>
      </div>
    )
  }

  // Validar acceso basado en horario
  if (accessValidation && !accessValidation.canAccess) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-bold mb-4">{classroomData.courseName}</h1>
          <p className="text-lg font-medium mb-2">{classroomData.lessonName}</p>
          <p className="text-gray-600 mb-6">{accessValidation.reason}</p>
          <div className="text-sm text-gray-500">
            {isTeacher ? (
              <p>Como profesor, podrás acceder 10 minutos antes de la clase.</p>
            ) : (
              <p>Podrás acceder cuando la clase comience.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render Teacher Layout
  if (isTeacher) {
    return (
      <div data-testid="teacher-dashboard">
        <TeacherClassroomLayout
          classId={effectiveClassId}
          studentId={classroomData.studentId}
          teacherId={classroomData.teacherId}
          courseName={classroomData.courseName}
          lessonName={classroomData.lessonName}
          bookingId={classroomData.bookingId}
          day={classroomData.day}
          timeSlot={classroomData.timeSlot}
          currentUserName={session?.user?.name || 'Profesor'}
        />
      </div>
    )
  }

  // Render Student Layout (Default)
  return (
    <div data-testid="student-dashboard">
      <StudentClassroomLayout
        classId={effectiveClassId}
        studentId={classroomData.studentId}
        teacherId={classroomData.teacherId}
        courseName={classroomData.courseName}
        lessonName={classroomData.lessonName}
        bookingId={classroomData.bookingId}
        day={classroomData.day}
        timeSlot={classroomData.timeSlot}
        currentUserName={session?.user?.name || 'Estudiante'}
      />
    </div>
  )
}
