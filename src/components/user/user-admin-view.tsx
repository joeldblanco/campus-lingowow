'use client'

import { Button } from '@/components/ui/button'
import { UserCreateDialog } from '@/components/user/user-create-dialog'
import { UsersDataTable } from '@/components/user/users-data-table'
import { createUser, deleteUser, updateUser, getAllUsers, deleteMultipleUsers } from '@/lib/actions/user'
import { CreateUserSchema } from '@/schemas/user'
import { User } from '@prisma/client'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as z from 'zod'

export default function UserAdminView() {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers()
        if ('error' in response) {
          toast.error(response.error)
        } else {
          setUsers(response)
        }
      } catch {
        toast.error('Error al cargar los usuarios')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleCreateUser = (user: z.infer<typeof CreateUserSchema>) => {
    createUser(user).then((response) => {
      if ('error' in response) {
        toast.error(response.error)
      } else {
        toast.success('El usuario ha sido creado correctamente')
        setUsers((prev) => [...prev, response])
        setOpen(false)
      }
    })
  }

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId).then((response) => {
      if ('error' in response) {
        toast.error(response.error)
      } else {
        toast.success('El usuario ha sido eliminado correctamente')
        setUsers(users.filter((user) => user.id !== userId))
      }
    })
  }

  const handleDeleteMultiple = (userIds: string[]) => {
    deleteMultipleUsers(userIds).then((response) => {
      if (response && 'error' in response) {
        toast.error(response.error)
      } else {
        toast.success('Usuarios eliminados correctamente')
        setUsers(users.filter((user) => !userIds.includes(user.id)))
      }
    })
  }

  const handleUpdateUser = (updatedUser: User) => {
    updateUser(updatedUser.id, updatedUser).then((response) => {
      if ('error' in response) {
        toast.error(response.error)
      } else {
        toast.success('El usuario ha sido actualizado correctamente')
        setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra todos los usuarios de la plataforma.
            </p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Cargando usuarios...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra todos los usuarios de la plataforma.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/80 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <UsersDataTable
        users={users}
        onDeleteUser={handleDeleteUser}
        onDeleteMultiple={handleDeleteMultiple}
        onUpdateUser={handleUpdateUser}
      />

      <UserCreateDialog open={open} onOpenChange={setOpen} onCreateUser={handleCreateUser} />
    </div>
  )
}
