'use client'

import { useState, useTransition } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, BookOpen, Calendar, Eye, Mail, MoreVertical, Pencil, Trash, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { impersonateUser } from '@/lib/actions/impersonate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ManageTeacherCoursesDialog } from '@/components/admin/teachers/manage-teacher-courses-dialog'
import { TeacherScheduleDialog } from '@/components/admin/teachers/teacher-schedule-dialog'
import { UserEditDialog } from '@/components/user/user-edit-dialog'
import { User } from '@prisma/client'

interface TeachersDataTableProps {
  teachers: User[]
  onDeleteTeacher: (teacherId: string) => void
  onUpdateTeacher: (teacher: User) => void
}

export function TeachersDataTable({ teachers, onDeleteTeacher, onUpdateTeacher }: TeachersDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null)
  const [scheduleTeacher, setScheduleTeacher] = useState<User | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
            // Redirigir después de suplantación exitosa
            router.push('/dashboard')
            router.refresh()
          }
        })
        .catch((error) => {
          toast.error('Error al suplantar usuario')
          console.error('Error:', error)
        })
    })
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Profesor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const teacher = row.original
        const fullName = `${teacher.name} ${teacher.lastName || ''}`
        
        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              userId={teacher.id}
              userName={teacher.name}
              userLastName={teacher.lastName}
              userImage={teacher.image}
              className="h-10 w-10"
            />
            <div>
              <div className="font-medium">{fullName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {teacher.email}
              </div>
            </div>
          </div>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        const fullName = `${row.original.name} ${row.original.lastName || ''}`.toLowerCase()
        const email = row.original.email.toLowerCase()
        const searchValue = filterValue.toLowerCase()
        return fullName.includes(searchValue) || email.includes(searchValue)
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Estado
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <div className="flex justify-center">
            {status === 'ACTIVE' ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Activo</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 font-medium">Inactivo</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const teacher = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Abrir menú</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditingTeacher(teacher)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <ManageTeacherCoursesDialog
                teacherId={teacher.id}
                teacherName={`${teacher.name} ${teacher.lastName || ''}`}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Gestionar Cursos
                </DropdownMenuItem>
              </ManageTeacherCoursesDialog>
              <DropdownMenuItem onClick={() => setScheduleTeacher(teacher)}>
                <Calendar className="mr-2 h-4 w-4" />
                Ver Horario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteTeacher(teacher.id)}>
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleImpersonate(teacher.id)}
                disabled={isPending}
              >
                <Eye className="mr-2 h-4 w-4" />
                {isPending ? 'Suplantando...' : 'Suplantar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: teachers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
            className="max-w-sm pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {teachers.length} profesor{teachers.length !== 1 ? 'es' : ''} en total
        </div>
      </div>
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-semibold text-xs uppercase text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron profesores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Mostrando {table.getRowModel().rows.length} de {teachers.length} profesor
          {teachers.length !== 1 ? 'es' : ''}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {editingTeacher && (
        <UserEditDialog
          user={editingTeacher}
          open={!!editingTeacher}
          onOpenChange={(open) => !open && setEditingTeacher(null)}
          onUpdateUser={(updatedTeacher) => {
            onUpdateTeacher(updatedTeacher)
            setEditingTeacher(null)
          }}
        />
      )}

      {scheduleTeacher && (
        <TeacherScheduleDialog
          teacherId={scheduleTeacher.id}
          teacherName={`${scheduleTeacher.name} ${scheduleTeacher.lastName || ''}`}
          open={!!scheduleTeacher}
          onOpenChange={(open) => !open && setScheduleTeacher(null)}
        />
      )}
    </div>
  )
}
