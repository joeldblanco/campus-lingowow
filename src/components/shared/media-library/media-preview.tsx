'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Calendar, 
  HardDrive, 
  FileText,
  ExternalLink
} from 'lucide-react'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { FileResourceType } from '@prisma/client'
import { formatFileSize, formatDate } from '@/lib/utils'
import Image from 'next/image'

interface MediaPreviewProps {
  file: ServerFileAsset
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  file,
  open,
  onOpenChange
}) => {
  const getFileTypeColor = (resourceType: FileResourceType) => {
    switch (resourceType) {
      case FileResourceType.IMAGE:
        return 'bg-green-100 text-green-800'
      case FileResourceType.VIDEO:
        return 'bg-blue-100 text-blue-800'
      case FileResourceType.AUDIO:
        return 'bg-purple-100 text-purple-800'
      case FileResourceType.RAW:
        return 'bg-orange-100 text-orange-800'
      case FileResourceType.DOCUMENT:
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderPreviewContent = () => {
    switch (file.resourceType) {
      case FileResourceType.IMAGE:
        return (
          <div className="relative max-w-4xl mx-auto">
            <Image
              src={file.secureUrl}
              alt={file.fileName}
              width={file.width || 800}
              height={file.height || 600}
              className="w-full h-auto rounded-lg"
              priority
            />
            {file.width && file.height && (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                {file.width} × {file.height}px
              </div>
            )}
          </div>
        )

      case FileResourceType.VIDEO:
        return (
          <div className="max-w-4xl mx-auto">
            <video
              src={file.url}
              controls
              className="w-full rounded-lg"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
            {file.duration && (
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Duration: {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        )

      case FileResourceType.AUDIO:
        return (
          <div className="max-w-2xl mx-auto p-4">
            <div className="bg-muted rounded-lg p-6 text-center">
              <div className="text-4xl mb-4 text-muted-foreground">🎵</div>
              <h3 className="text-lg font-medium mb-4 truncate">{file.fileName}</h3>
              <audio
                src={file.url}
                controls
                className="w-full max-w-lg mx-auto"
                preload="metadata"
              >
                Your browser does not support the audio tag.
              </audio>
              {file.duration && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Duración: {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        )

      case FileResourceType.RAW:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-muted rounded-lg p-8 text-center">
              <div className="text-6xl mb-4 text-muted-foreground">📄</div>
              <h3 className="text-lg font-medium mb-2">{file.fileName}</h3>
              <p className="text-muted-foreground mb-4">
                Document preview not available
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => window.open(file.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Document
                </Button>
                <Button variant="outline" onClick={() => window.open(file.url + '?download=true', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )

      case FileResourceType.DOCUMENT:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-muted rounded-lg p-8 text-center">
              <div className="text-6xl mb-4 text-muted-foreground">📄</div>
              <h3 className="text-lg font-medium mb-2">{file.fileName}</h3>
              <p className="text-muted-foreground mb-4">
                Document preview not available
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => window.open(file.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Document
                </Button>
                <Button variant="outline" onClick={() => window.open(file.url + '?download=true', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-muted rounded-lg p-8 text-center">
              <div className="text-6xl mb-4 text-muted-foreground">📁</div>
              <h3 className="text-lg font-medium mb-2">{file.fileName}</h3>
              <p className="text-muted-foreground">
                Preview not available for this file type
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader className="p-6 pb-0 flex-shrink-0 sticky top-0 bg-background">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg truncate">{file.fileName}</DialogTitle>
              <Badge 
                variant="secondary" 
                className={getFileTypeColor(file.resourceType)}
              >
                {file.resourceType.split('_')[0]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-2">
          {/* Preview Content */}
          <div className="mb-6">
            {renderPreviewContent()}
          </div>

          {/* File Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Detalles del Archivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Tamaño</div>
                  <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Creado</div>
                  <div className="text-sm text-muted-foreground">{formatDate(file.createdAt)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Modificado</div>
                  <div className="text-sm text-muted-foreground">{formatDate(file.updatedAt)}</div>
                </div>
              </div>

              {file.width && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Dimensiones</div>
                    <div className="text-sm text-muted-foreground">{file.width} × {file.height}px</div>
                  </div>
                </div>
              )}

              {file.duration && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Duración</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              )}

              {file.folder && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Carpeta</div>
                    <div className="text-sm text-muted-foreground">{file.folder}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {file.tags.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Etiquetas</h4>
                <div className="flex flex-wrap gap-2">
                  {file.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {file.description && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{file.description}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
