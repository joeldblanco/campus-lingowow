'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Search, BookOpen, FileText, Activity } from 'lucide-react'
import { EditModuleDialog } from './edit-module-dialog'
import { ViewModuleDialog } from './view-module-dialog'
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

interface ModulesTableProps {
  modules: ModuleWithDetails[]
  onModuleUpdated: () => void
}

export function ModulesTable({ modules, onModuleUpdated }: ModulesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredModules = modules.filter(
    (module) =>
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el módulo "${title}"?`)) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteModule(id)
      toast.success('Módulo eliminado exitosamente')
      onModuleUpdated()
    } catch (error) {
      console.error('Error deleting module:', error)
      toast.error('Error al eliminar el módulo')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Módulos</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredModules.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay módulos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'No se encontraron módulos con ese término de búsqueda.'
                : 'Comienza creando un nuevo módulo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{module.title}</h3>
                    <Badge variant={module.isPublished ? 'default' : 'secondary'}>
                      {module.isPublished ? 'Publicada' : 'Borrador'}
                    </Badge>
                    <Badge variant="outline">Nivel {module.level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Curso: {module.course.title}</p>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {module.lessonsCount} lecciones
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {module.activitiesCount} actividades
                    </div>
                    <span>Orden: {module.order}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ViewModuleDialog moduleId={module.id}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </ViewModuleDialog>

                  <EditModuleDialog module={module} onModuleUpdated={onModuleUpdated}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </EditModuleDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(module.id, module.title)}
                    disabled={isDeleting === module.id}
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
