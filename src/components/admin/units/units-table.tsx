'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Search, BookOpen, FileText, Activity } from 'lucide-react'
import { EditUnitDialog } from './edit-unit-dialog'
import { ViewUnitDialog } from './view-unit-dialog'
import { deleteModule } from '@/lib/actions/modules'
import { toast } from 'sonner'

interface ModuleWithDetails {
  id: string
  title: string
  description: string | null
  level: number
  order: number
  isPublished: boolean
  courseId: string
  createdAt: Date
  updatedAt: Date
  course: {
    id: string
    title: string
  }
  lessonsCount: number
  activitiesCount: number
}

interface UnitsTableProps {
  units: ModuleWithDetails[]
  onUnitUpdated: () => void
}

export function UnitsTable({ units, onUnitUpdated }: UnitsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredUnits = units.filter(unit =>
    unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la unidad "${title}"?`)) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteModule(id)
      toast.success('Unidad eliminada exitosamente')
      onUnitUpdated()
    } catch (error) {
      console.error('Error deleting unit:', error)
      toast.error('Error al eliminar la unidad')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Unidades</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUnits.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay unidades</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron unidades con ese término de búsqueda.' : 'Comienza creando una nueva unidad.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUnits.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{unit.title}</h3>
                    <Badge variant={unit.isPublished ? 'default' : 'secondary'}>
                      {unit.isPublished ? 'Publicada' : 'Borrador'}
                    </Badge>
                    <Badge variant="outline">
                      Nivel {unit.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Curso: {unit.course.title}
                  </p>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {unit.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {unit.lessonsCount} lecciones
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {unit.activitiesCount} actividades
                    </div>
                    <span>Orden: {unit.order}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ViewUnitDialog unitId={unit.id}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </ViewUnitDialog>

                  <EditUnitDialog unit={unit} onUnitUpdated={onUnitUpdated}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </EditUnitDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(unit.id, unit.title)}
                    disabled={isDeleting === unit.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
