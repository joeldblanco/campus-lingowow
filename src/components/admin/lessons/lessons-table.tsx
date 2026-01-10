'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, Edit, Trash2, Search, FileText, Activity } from 'lucide-react'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { EditLessonDialog } from './edit-lesson-dialog'
import { ViewLessonDialog } from './view-lesson-dialog'
import { deleteLesson } from '@/lib/actions/lessons'
import { toast } from 'sonner'

interface LessonWithDetails {
  id: string
  title: string
  description: string
  order: number
  moduleId: string | null
  createdAt: Date
  updatedAt: Date
  module: {
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  } | null
  contentsCount: number
  activitiesCount: number
}

interface LessonsTableProps {
  lessons: LessonWithDetails[]
  onLessonUpdated: () => void
}

export function LessonsTable({ lessons, onLessonUpdated }: LessonsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredLessons = useMemo(() => {
    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.module?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.module?.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [lessons, searchTerm])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la lección "${title}"?`)) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteLesson(id)
      toast.success('Lección eliminada exitosamente')
      onLessonUpdated()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Error al eliminar la lección')
    } finally {
      setIsDeleting(null)
    }
  }

  const columns: ColumnDef<LessonWithDetails>[] = [
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
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lección" />,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.title}</span>
            <Badge variant="outline">Orden {row.original.order}</Badge>
          </div>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'module',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Módulo / Curso" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.module?.title || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">{row.original.module?.course.title || 'N/A'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'contentsCount',
      header: () => <div className="text-center">Contenidos</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1 text-sm">
          <FileText className="h-3 w-3" />
          {row.original.contentsCount}
        </div>
      ),
    },
    {
      accessorKey: 'activitiesCount',
      header: () => <div className="text-center">Actividades</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1 text-sm">
          <Activity className="h-3 w-3" />
          {row.original.activitiesCount}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <ViewLessonDialog lessonId={lesson.id}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
            </ViewLessonDialog>
            <EditLessonDialog lesson={lesson} onLessonUpdated={onLessonUpdated}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            </EditLessonDialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDelete(lesson.id, lesson.title)}
              disabled={isDeleting === lesson.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const toolbar = (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar lecciones..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={filteredLessons}
      toolbar={toolbar}
      emptyMessage="No hay lecciones"
    />
  )
}
