'use client'

import { useState, useEffect } from 'react'
import { TeachersDataTable } from '@/components/admin/teachers/teachers-data-table'
import { getAllUsers, deleteUser, updateUser } from '@/lib/actions/user'
import { User, UserRole } from '@prisma/client'
import { toast } from 'sonner'

export default function TeachersAdminView() {
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await getAllUsers()
        if ('error' in response) {
          toast.error(response.error)
        } else {
          // Filtrar solo usuarios que tengan el rol TEACHER
          const teachersOnly = response.filter((user) =>
            user.roles.includes(UserRole.TEACHER)
          )
          setTeachers(teachersOnly)
        }
      } catch {
        toast.error('Error al cargar los profesores')
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [])

  const handleDeleteTeacher = (teacherId: string) => {
    deleteUser(teacherId).then((response) => {
      if ('error' in response) {
        toast.error(response.error)
      } else {
        toast.success('El profesor ha sido eliminado correctamente')
        setTeachers(teachers.filter((teacher) => teacher.id !== teacherId))
      }
    })
  }

  const handleUpdateTeacher = (updatedTeacher: User) => {
    updateUser(updatedTeacher.id, updatedTeacher).then((response) => {
      if ('error' in response) {
        toast.error(response.error)
      } else {
        toast.success('El profesor ha sido actualizado correctamente')
        setTeachers(teachers.map((teacher) => 
          teacher.id === updatedTeacher.id ? updatedTeacher : teacher
        ))
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Profesores</h1>
        </div>
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Cargando profesores...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profesores</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los profesores y sus cursos asignados
          </p>
        </div>
      </div>

      <TeachersDataTable 
        teachers={teachers}
        onDeleteTeacher={handleDeleteTeacher}
        onUpdateTeacher={handleUpdateTeacher}
      />
    </div>
  )
}
