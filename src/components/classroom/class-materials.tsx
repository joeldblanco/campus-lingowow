// /components/virtual-classroom/class-materials.tsx
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, Video, Volume2 } from 'lucide-react'
import React from 'react'

interface ClassMaterialsProps {
  classId: string
}

export const ClassMaterials: React.FC<ClassMaterialsProps> = ({ classId }) => {
  console.log(classId)
  // En una implementación real, cargarías los materiales desde tu API
  const materials = [
    {
      id: 1,
      type: 'pdf',
      name: 'Guía de gramática - Pasado Simple',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 2,
      type: 'audio',
      name: 'Diálogo - En el restaurante',
      icon: <Volume2 className="h-5 w-5" />,
    },
    {
      id: 3,
      type: 'video',
      name: 'Explicación - Verbos irregulares',
      icon: <Video className="h-5 w-5" />,
    },
    {
      id: 4,
      type: 'pdf',
      name: 'Ejercicios - Práctica de pasado',
      icon: <FileText className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-4">
      {materials.map((material) => (
        <Card key={material.id}>
          <CardHeader className="py-3">
            <div className="flex items-center">
              <div className="mr-2 text-primary">{material.icon}</div>
              <div>
                <CardTitle className="text-sm">{material.name}</CardTitle>
                <CardDescription className="text-xs">{material.type.toUpperCase()}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter className="py-2">
            <Button variant="ghost" size="sm" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
