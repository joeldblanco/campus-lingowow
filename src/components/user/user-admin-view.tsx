'use client'

import { Button } from '@/components/ui/button'
import { UserCreateDialog } from '@/components/user/user-create-dialog'
import { UserStatsCards } from '@/components/user/user-stats-cards'
import { UsersDataTable } from '@/components/user/users-data-table'
import { createUser, deleteUser, updateUser, getAllUsers } from '@/lib/actions/user'
import { CreateUserSchema } from '@/schemas/user'
import { User } from '@prisma/client'
import { PlusCircle } from 'lucide-react'
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
    setUsers(users.filter((user) => !userIds.includes(user.id)))
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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        </div>
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Cargando usuarios...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <Button onClick={() => setOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir usuario
        </Button>
      </div>

      <UserStatsCards users={users} />

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
