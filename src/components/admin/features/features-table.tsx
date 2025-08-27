'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Zap } from 'lucide-react'
import { EditFeatureDialog } from './edit-feature-dialog'
import { deleteFeature } from '@/lib/actions/commercial'
import { toast } from 'sonner'

interface Feature {
  id: string
  name: string
  description: string | null
  icon: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    planFeatures: number
  }
}

interface FeaturesTableProps {
  features: Feature[]
}

export function FeaturesTable({ features }: FeaturesTableProps) {
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta característica?')) {
      const result = await deleteFeature(id)
      if (result.success) {
        toast.success('Característica eliminada correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar la característica')
      }
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Característica</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Icono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Planes Asociados</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay características registradas
                </TableCell>
              </TableRow>
            ) : (
              features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {feature.icon ? (
                        <div className="text-lg">{feature.icon}</div>
                      ) : (
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{feature.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {feature.description ? (
                      <span className="text-sm text-muted-foreground">
                        {feature.description}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {feature.icon ? (
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {feature.icon}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={feature.isActive ? 'default' : 'secondary'}>
                      {feature.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>{feature._count.planFeatures}</TableCell>
                  <TableCell>{new Date(feature.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingFeature(feature)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(feature.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingFeature && (
        <EditFeatureDialog
          feature={editingFeature}
          open={!!editingFeature}
          onOpenChange={(open: boolean) => !open && setEditingFeature(null)}
        />
      )}
    </>
  )
}
