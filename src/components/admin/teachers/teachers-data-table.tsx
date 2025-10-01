'use client'

import { useState } from 'react'
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
import { ArrowUpDown, BookOpen, Mail, MoreHorizontal, Pencil, Trash } from 'lucide-react'

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ManageTeacherCoursesDialog } from '@/components/admin/teachers/manage-teacher-courses-dialog'
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
        const fullName = `${teacher.name} ${teacher.lastName}`
        const initials = `${teacher.name[0]}${teacher.lastName[0] || ''}`.toUpperCase()
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={teacher.image || undefined} alt={fullName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
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
        const fullName = `${row.original.name} ${row.original.lastName}`.toLowerCase()
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
            <Badge
              variant={status === 'ACTIVE' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </Badge>
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
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
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
                teacherName={`${teacher.name} ${teacher.lastName}`}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Gestionar Cursos
                </DropdownMenuItem>
              </ManageTeacherCoursesDialog>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteTeacher(teacher.id)}>
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
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
        <Input
          placeholder="Buscar por nombre o correo..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {teachers.length} profesor{teachers.length !== 1 ? 'es' : ''} en total
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
    </div>
  )
}
