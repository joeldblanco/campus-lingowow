'use client'

import { useState, useMemo, useTransition } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { MoreVertical, Pencil, Trash, Eye, BookOpen, Search, SlidersHorizontal, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { impersonateUser } from '@/lib/actions/impersonate'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { UserAvatar } from '@/components/ui/user-avatar'
import { UserEditDialog } from '@/components/user/user-edit-dialog'
import { ManageTeacherCoursesDialog } from '@/components/admin/teachers/manage-teacher-courses-dialog'
import { User, UserRole, UserStatus } from '@prisma/client'
import { RoleNames, StatusNames } from '@/types/user'
import { formatDateShort } from '@/lib/utils/date'

interface UsersDataTableProps {
  users: User[]
  onDeleteUser: (userId: string) => void
  onDeleteMultiple: (userIds: string[]) => void
  onUpdateUser: (user: User) => void
}

export function UsersDataTable({
  users,
  onDeleteUser,
  onDeleteMultiple,
  onUpdateUser,
}: UsersDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const [isPending, startTransition] = useTransition()

  const filteredUsers = useMemo(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.roles.includes(roleFilter as UserRole))
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    return filtered
  }, [users, searchTerm, roleFilter, statusFilter])

  const handleImpersonate = (userId: string) => {
    startTransition(() => {
      impersonateUser(userId)
        .then((response) => {
          if (response.error) {
            toast.error(response.error)
          } else {
            toast.success('Suplantación iniciada', {
              description: 'Redirigiendo...',
            })
            window.location.href = '/dashboard'
          }
        })
        .catch((error) => {
          toast.error('Error al suplantar usuario')
          console.error('Error:', error)
        })
    })
  }

  const handleDeleteSelected = () => {
    if (selectedUsers.length > 0) {
      onDeleteMultiple(selectedUsers)
      setSelectedUsers([])
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  const hasActiveFilters = searchTerm || roleFilter !== 'all' || statusFilter !== 'all'

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Usuario" />,
      cell: ({ row }) => {
        const user = row.original
        const fullName = `${user.name} ${user.lastName || ''}`.trim()
        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              userId={user.id}
              userName={user.name}
              userLastName={user.lastName}
              userImage={user.image}
              className="h-9 w-9"
            />
            <div className="min-w-0">
              <div className="font-medium truncate">{fullName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'roles',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Roles" />,
      cell: ({ row }) => {
        const roles = row.getValue('roles') as UserRole[]
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => {
              const roleColors: Record<UserRole, string> = {
                ADMIN: 'bg-purple-100 text-purple-700',
                TEACHER: 'bg-blue-100 text-blue-700',
                STUDENT: 'bg-green-100 text-green-700',
                EDITOR: 'bg-orange-100 text-orange-700',
                GUEST: 'bg-gray-100 text-gray-700',
              }
              return (
                <Badge key={role} className={`${roleColors[role]} border-0 text-xs font-medium`}>
                  {RoleNames[role]}
                </Badge>
              )
            })}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as UserStatus
        const statusStyles: Record<UserStatus, string> = {
          ACTIVE: 'bg-emerald-100 text-emerald-700',
          INACTIVE: 'bg-gray-100 text-gray-700',
        }
        return (
          <Badge className={`${statusStyles[status]} border-0 font-medium`}>
            {StatusNames[status]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Último acceso" />,
      cell: ({ row }) => {
        const lastLogin = row.original.lastLoginAt
        if (!lastLogin) {
          return <span className="text-sm text-muted-foreground">Nunca</span>
        }
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDateShort(lastLogin)}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Registro" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateShort(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const user = row.original

        return (
          <div className="flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="sr-only">Abrir menú</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {user.roles.includes(UserRole.TEACHER) && (
                  <ManageTeacherCoursesDialog
                    teacherId={user.id}
                    teacherName={`${user.name} ${user.lastName || ''}`}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Gestionar Cursos
                    </DropdownMenuItem>
                  </ManageTeacherCoursesDialog>
                )}
                <DropdownMenuItem onClick={() => setUserToDelete(user)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleImpersonate(user.id)}
                  disabled={isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {isPending ? 'Suplantando...' : 'Suplantar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const toolbar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
          <SelectItem value={UserRole.TEACHER}>Profesor</SelectItem>
          <SelectItem value={UserRole.STUDENT}>Estudiante</SelectItem>
          <SelectItem value={UserRole.EDITOR}>Editor</SelectItem>
          <SelectItem value={UserRole.GUEST}>Invitado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value={UserStatus.ACTIVE}>Activo</SelectItem>
          <SelectItem value={UserStatus.INACTIVE}>Inactivo</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
      {selectedUsers.length > 0 && (
        <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
          Eliminar ({selectedUsers.length})
        </Button>
      )}
    </div>
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredUsers}
        toolbar={toolbar}
        emptyMessage="No se encontraron usuarios"
        onRowSelectionChange={(rows) => setSelectedUsers(rows.map((r) => r.id))}
      />

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUpdateUser={(updatedUser) => {
            onUpdateUser(updatedUser)
            setEditingUser(null)
          }}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{' '}
              <strong>{userToDelete?.name} {userToDelete?.lastName}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (userToDelete) {
                  onDeleteUser(userToDelete.id)
                  setUserToDelete(null)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
