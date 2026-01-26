'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MediaLibrary } from '@/components/shared/media-library'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { FileResourceType } from '@prisma/client'
import { Library, ImageIcon, Video, Music, FileText } from 'lucide-react'

export default function MediaLibraryDemo() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<ServerFileAsset[]>([])
  const [builder, setBuilder] = useState<'lesson' | 'exam' | 'resource'>('lesson')

  const handleSelectFiles = (files: ServerFileAsset[]) => {
    setSelectedFiles(files)
  }

  const getBuilderIcon = (builderType: string) => {
    switch (builderType) {
      case 'lesson':
        return <FileText className="h-4 w-4" />
      case 'exam':
        return <Video className="h-4 w-4" />
      case 'resource':
        return <Library className="h-4 w-4" />
      default:
        return <Library className="h-4 w-4" />
    }
  }

  const getFileIcon = (resourceType: FileResourceType) => {
    switch (resourceType) {
      case FileResourceType.IMAGE:
        return <ImageIcon className="h-8 w-8" />
      case FileResourceType.VIDEO:
        return <Video className="h-4 w-4" />
      case FileResourceType.AUDIO:
        return <Music className="h-4 w-4" />
      case FileResourceType.RAW:
        return <FileText className="h-4 w-4" />
      case FileResourceType.DOCUMENT:
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getBuilderTypes = (builderType: string) => {
    switch (builderType) {
      case 'lesson':
        return [FileResourceType.IMAGE, FileResourceType.VIDEO, FileResourceType.AUDIO]
      case 'exam':
        return [FileResourceType.IMAGE, FileResourceType.VIDEO, FileResourceType.AUDIO]
      case 'resource':
        return [FileResourceType.IMAGE, FileResourceType.VIDEO, FileResourceType.AUDIO, FileResourceType.DOCUMENT]
      default:
        return []
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-8 w-8" />
            Biblioteca de Medios - Demo
          </h1>
          <p className="text-muted-foreground">
            Prueba el componente Biblioteca de Medios con diferentes contextos de constructor
          </p>
        </div>
        <Button onClick={() => setIsLibraryOpen(true)}>
          <Library className="h-4 w-4 mr-2" />
          Abrir Biblioteca de Medios
        </Button>
      </div>

      {/* Builder Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Contexto del Constructor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Seleccionar Constructor:</span>
            <div className="flex gap-2">
              {(['lesson', 'exam', 'resource'] as const).map((builderType) => (
                <Button
                  key={builderType}
                  variant={builder === builderType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBuilder(builderType)}
                  className="capitalize"
                >
                  {getBuilderIcon(builderType)}
                  {builderType}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Tipos Permitidos:</div>
            <div className="flex gap-2">
              {getBuilderTypes(builder).map(type => (
                <Badge key={type} variant="outline">
                  {getFileIcon(type)}
                  {type.split('_')[0]}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Archivos Seleccionados ({selectedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {selectedFiles.map((file) => (
                <div key={file.publicId} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.resourceType)}
                    <span className="font-medium truncate">{file.fileName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Tipo: {file.resourceType}</div>
                    <div>Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div>Carpeta: {file.folder}</div>
                    <div>Creado: {file.createdAt.toLocaleDateString()}</div>
                  </div>
                  {file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Características</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Navega y busca archivos en Cloudinary</li>
                <li>• Filtra por tipo de archivo y carpeta</li>
                <li>• Modos de vista cuadrícula y lista</li>
                <li>• Vista previa de imágenes, videos y audio</li>
                <li>• Sube nuevos archivos directamente</li>
                <li>• Selección simple y múltiple</li>
                <li>• Copia URLs y descarga archivos</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Contextos de Constructor</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Constructor de Lecciones:</strong> Archivos de contenido del curso</li>
                <li>• <strong>Constructor de Exámenes:</strong> Medios y recursos de exámenes</li>
                <li>• <strong>Constructor de Recursos:</strong> Todos los tipos de archivos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Library Modal */}
      <MediaLibrary
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        onSelect={handleSelectFiles}
        allowedTypes={getBuilderTypes(builder)}
        multiple={true}
        maxSelection={10}
        builder={builder}
      />
    </div>
  )
}
