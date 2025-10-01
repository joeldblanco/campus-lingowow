'use client'

import { ClassroomLayout } from '@/components/classroom/classroom-layout'
import { useCurrentClass } from '@/context/current-class'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getClassroomData } from '@/lib/actions/dashboard'

type ClassroomData = {
  studentId: string
  teacherId: string
  courseName: string
  lessonName: string
  bookingId: string
}

export default function ClassroomPage() {
  const searchParams = useSearchParams()
  const { currentClassId, setCurrentClass } = useCurrentClass()
  const { data: session } = useSession()
  const [classroomData, setClassroomData] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const urlClassId = searchParams.get('classId')
  const effectiveClassId = urlClassId || currentClassId

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
  }, [effectiveClassId, session?.user?.id])

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

  return (
    <div data-testid="teacher-dashboard">
      <ClassroomLayout
        classId={effectiveClassId}
        studentId={classroomData.studentId}
        teacherId={classroomData.teacherId}
        courseName={classroomData.courseName}
        lessonName={classroomData.lessonName}
        bookingId={classroomData.bookingId}
      />
    </div>
  )
}
