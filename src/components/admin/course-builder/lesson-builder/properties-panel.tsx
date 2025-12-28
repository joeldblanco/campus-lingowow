'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Textarea } from '@/components/ui/textarea'
import {
  AudioBlock,
  Block,
  DownloadableFile,
  EssayBlock,
  FileBlock,
  FillBlanksBlock,
  GrammarBlock,
  ImageBlock,
  MatchBlock,
  QuizBlock,
  QuizQuestion,
  RecordingBlock,
  StructuredContentBlock,
  TextBlock,
  TrueFalseBlock,
  VideoBlock,
  VocabularyBlock,
  MultipleChoiceBlock,
  ShortAnswerBlock,
  OrderingBlock,
  DragDropBlock,
} from '@/types/course-builder'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Card, CardContent } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import { Switch } from '@/components/ui/switch'
import { deleteCloudinaryFile, uploadFileByType } from '@/lib/actions/cloudinary'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Loader2, Mic, Play, Plus, Square, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Helper helper to clean up old files when replacing them
const deleteFileFromUrl = async (url: string, resourceType: 'image' | 'video' | 'raw') => {
  if (!url || !url.includes('cloudinary.com')) return

  try {
    const parts = url.split('/upload/')
    if (parts.length === 2) {
      const pathParts = parts[1].split('/')
      // Find version segment (e.g., v123456789)
      const versionIndex = pathParts.findIndex(
        (p) => p.startsWith('v') && !isNaN(Number(p.substring(1)))
      )

      // Get the path after version
      const relevantParts = versionIndex !== -1 ? pathParts.slice(versionIndex + 1) : pathParts
      // Look for public_id.
      // Note: For video/audio (resource_type: video), Cloudinary usually works with public_id sans extension.
      // But standard URLs have extension. We try to handle it.
      let publicId = relevantParts.join('/')
      publicId = decodeURIComponent(publicId)

      // Attempt removal
      // We don't await strictly or throw error to avoid blocking the UI update if this background task fails
      deleteCloudinaryFile(publicId, resourceType).catch((e) =>
        console.error('Background delete failed', e)
      )
    }
  } catch (error) {
    console.error('Error parsing URL for deletion:', error)
  }
}

interface PropertiesPanelProps {
  block: Block | null
  onUpdate: (updates: Partial<Block>) => void
  onRemove?: () => void
  onClose: () => void
}

export function PropertiesPanel({ block, onUpdate, onRemove, onClose }: PropertiesPanelProps) {
  if (!block) return null

  const renderContent = () => {
    switch (block.type) {
      case 'grammar':
        return <GrammarProperties block={block as GrammarBlock} onUpdate={onUpdate} />
      case 'vocabulary':
        return <VocabularyProperties block={block as VocabularyBlock} onUpdate={onUpdate} />
      case 'quiz':
        return <QuizProperties block={block as QuizBlock} onUpdate={onUpdate} />
      case 'audio':
        return <AudioProperties block={block as AudioBlock} onUpdate={onUpdate} />
      case 'file':
        return <FileProperties block={block as FileBlock} onUpdate={onUpdate} />
      case 'fill_blanks':
        return <FillBlanksProperties block={block as FillBlanksBlock} onUpdate={onUpdate} />
      case 'match':
        return <MatchProperties block={block as MatchBlock} onUpdate={onUpdate} />
      case 'true_false':
        return <TrueFalseProperties block={block as TrueFalseBlock} onUpdate={onUpdate} />
      case 'essay':
        return <EssayProperties block={block as EssayBlock} onUpdate={onUpdate} />
      case 'recording':
        return <RecordingProperties block={block as RecordingBlock} onUpdate={onUpdate} />
      case 'structured-content':
        return (
          <StructuredContentProperties
            block={block as StructuredContentBlock}
            onUpdate={onUpdate}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceProperties
            block={block as MultipleChoiceBlock}
            onUpdate={onUpdate}
          />
        )
      case 'short_answer':
        return (
          <ShortAnswerProperties
            block={block as ShortAnswerBlock}
            onUpdate={onUpdate}
          />
        )
      case 'ordering':
        return (
          <OrderingProperties
            block={block as OrderingBlock}
            onUpdate={onUpdate}
          />
        )
      case 'drag_drop':
        return (
          <DragDropProperties
            block={block as DragDropBlock}
            onUpdate={onUpdate}
          />
        )
      default:
        return <GenericProperties block={block} onUpdate={onUpdate} />
    }
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-xl z-20">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <h2 className="font-semibold text-sm uppercase tracking-wider">Propiedades</h2>
        <div className="flex items-center gap-1">
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">{renderContent()}</div>
    </div>
  )
}

function StructuredContentProperties({
  block,
  onUpdate,
}: {
  block: StructuredContentBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<(typeof templates)[0] | null>(null)

  const templates = [
    {
      id: 'default',
      label: 'Dos Columnas',
      icon: 'Columns',
      data: {
        title: 'Nueva Tabla',
        subtitle: 'Descripción opcional',
        config: { hasHeaderRow: true, hasStripedRows: false, hasBorders: true },
        content: {
          headers: ['Encabezado 1', 'Encabezado 2'],
          rows: [
            ['Celda 1', 'Celda 2'],
            ['Celda 3', 'Celda 4'],
          ],
        },
      },
    },
    {
      id: 'comparison',
      label: 'Comparación',
      icon: 'Table',
      data: {
        title: 'Comparación',
        subtitle: 'Comparar elementos',
        config: { hasHeaderRow: true, hasStripedRows: true, hasBorders: true },
        content: {
          headers: ['Característica', 'Opción A', 'Opción B'],
          rows: [
            ['Precio', '$10', '$20'],
            ['Calidad', 'Alta', 'Media'],
            ['Disponibilidad', 'Inmediata', 'Baja'],
          ],
        },
      },
    },
    {
      id: 'vocab-list',
      label: 'Lista de Vocabulario',
      icon: 'List',
      data: {
        title: 'Vocabulario Útil',
        subtitle: '',
        config: { hasHeaderRow: false, hasStripedRows: true, hasBorders: false },
        content: {
          headers: ['Término', 'Definición'],
          rows: [
            ['Término 1', 'Definición 1'],
            ['Término 2', 'Definición 2'],
            ['Término 3', 'Definición 3'],
          ],
        },
      },
    },
    {
      id: 'phrase-pairs',
      label: 'Frases Comunes',
      icon: 'Columns',
      data: {
        title: 'Frases Comunes',
        subtitle: 'Emparejar significados',
        config: { hasHeaderRow: true, hasStripedRows: true, hasBorders: false },
        content: {
          headers: ['Inglés', 'Español'],
          rows: [
            ['Hello', 'Hola'],
            ['How are you?', '¿Cómo estás?'],
            ['Good morning', 'Buenos días'],
          ],
        },
      },
    },
    {
      id: 'irregular-verbs',
      label: 'Verbos Irregulares',
      icon: 'Table',
      data: {
        title: 'Verbos Irregulares',
        subtitle: 'Lista de referencia',
        config: { hasHeaderRow: true, hasStripedRows: true, hasBorders: true },
        content: {
          headers: ['Infinitivo', 'Pasado Simple', 'Participio'],
          rows: [
            ['Be', 'Was/Were', 'Been'],
            ['Go', 'Went', 'Gone'],
            ['See', 'Saw', 'Seen'],
          ],
        },
      },
    },
    {
      id: 'conjugation',
      label: 'Conjugación',
      icon: 'Grid',
      data: {
        title: 'Conjugación de Verbos',
        subtitle: 'Presente Simple',
        config: { hasHeaderRow: true, hasStripedRows: false, hasBorders: true },
        content: {
          headers: ['Pronombre', 'Verbo'],
          rows: [
            ['I', 'Play'],
            ['You', 'Play'],
            ['He/She/It', 'Plays'],
            ['We', 'Play'],
            ['They', 'Play'],
          ],
        },
      },
    },
    {
      id: 'travel-vocab',
      label: 'Vocabulario de Viaje',
      icon: 'List',
      data: {
        title: 'Palabras para Viajar',
        subtitle: 'Esenciales',
        config: { hasHeaderRow: true, hasStripedRows: true, hasBorders: false },
        content: {
          headers: ['Palabra', 'Traducción', 'Nota'],
          rows: [
            ['Airport', 'Aeropuerto', ''],
            ['Ticket', 'Boleto', ''],
            ['Hotel', 'Hotel', 'Alojamiento'],
          ],
        },
      },
    },
  ]

  const applyTemplate = (template: (typeof templates)[0]) => {
    onUpdate({
      title: template.data.title,
      subtitle: template.data.subtitle,
      content: template.data.content,
      config: {
        ...block.config,
      },
    })
  }

  const handleTemplateClick = (template: (typeof templates)[0]) => {
    const hasContent =
      (block.content?.headers?.length ?? 0) > 0 || (block.content?.rows?.length ?? 0) > 0
    if (hasContent) {
      setPendingTemplate(template)
    } else {
      applyTemplate(template)
    }
  }

  const confirmTemplateChange = () => {
    if (pendingTemplate) {
      applyTemplate(pendingTemplate)
      setPendingTemplate(null)
    }
  }

  const displayedTemplates = showAllTemplates ? templates : templates.slice(0, 4)

  // Simple icons for the properties panel local to this component
  const TypeIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" x2="15" y1="20" y2="20" />
      <line x1="12" x2="12" y1="4" y2="20" />
    </svg>
  )
  const RowsIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="3" x2="21" y1="15" y2="15" />
    </svg>
  )
  const GridIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="3" x2="21" y1="15" y2="15" />
      <line x1="9" x2="9" y1="3" y2="21" />
      <line x1="15" x2="15" y1="3" y2="21" />
    </svg>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Título del Bloque</Label>
          <Input
            value={block.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ej. Conjugación de Verbos"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtítulo (Opcional)</Label>
          <Input
            value={block.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
            placeholder="Ej. Completa la tabla..."
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-xs uppercase text-muted-foreground font-bold">Plantillas</Label>
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => setShowAllTemplates(!showAllTemplates)}
          >
            {showAllTemplates ? 'Ver menos' : 'Ver todas'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {displayedTemplates.map((t) => (
            <div
              key={t.id}
              className="border rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center gap-2"
              onClick={() => handleTemplateClick(t)}
            >
              <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                {/* Simple icon placeholder logic */}
                {t.icon === 'Table' && <span className="text-lg">TT</span>}
                {t.icon === 'Grid' && <span className="text-lg">▦</span>}
                {t.icon === 'List' && <span className="text-lg">☰</span>}
                {t.icon === 'Columns' && <span className="text-lg">|||</span>}
              </div>
              <span className="text-xs font-medium">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase text-muted-foreground font-bold mb-4 block">
          Configuración de Tabla
        </Label>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="header-row" className="font-normal cursor-pointer">
                Fila de Encabezado
              </Label>
            </div>
            <Switch
              id="header-row"
              checked={block.config?.hasHeaderRow ?? true}
              onCheckedChange={(checked) =>
                onUpdate({ config: { ...block.config, hasHeaderRow: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RowsIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="striped-rows" className="font-normal cursor-pointer">
                Filas Alternas
              </Label>
            </div>
            <Switch
              id="striped-rows"
              checked={block.config?.hasStripedRows ?? false}
              onCheckedChange={(checked) =>
                onUpdate({ config: { ...block.config, hasStripedRows: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GridIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="borders" className="font-normal cursor-pointer">
                Bordes
              </Label>
            </div>
            <Switch
              id="borders"
              checked={block.config?.hasBorders ?? true}
              onCheckedChange={(checked) =>
                onUpdate({ config: { ...block.config, hasBorders: checked } })
              }
            />
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reemplazará todo el contenido actual de la tabla con la plantilla
              seleccionada. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTemplateChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FileProperties({
  block,
  onUpdate,
}: {
  block: FileBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const handleAddFile = (res: {
    original_filename?: string
    format?: string
    resource_type?: string
    secure_url: string
    bytes?: number
  }) => {
    // Extract extension from original filename to ensure correct type detection
    const ext = res.original_filename?.split('.').pop()?.toLowerCase()

    // Determine file type: prioritize format (if present) -> extension -> resource_type
    const type = res.format || ext || res.resource_type || 'file'

    // Fix URL for download: ensure it includes fl_attachment if not present
    let downloadUrl = res.secure_url
    if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
      // Now that backend preserves filenames, simple fl_attachment is safer
      // We can rely on Cloudinary's default behavior or public_id structure
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/')
    }

    const newFile = {
      id: `file_${Date.now()}`,
      title: res.original_filename || 'Nuevo Archivo',
      url: downloadUrl,
      fileType: type,
      size: res.bytes || 0,
      resourceType: res.resource_type, // Store Cloudinary resource type for deletion
    }

    const currentFiles = block.files || []
    onUpdate({ files: [...currentFiles, newFile] })
  }

  const removeFile = async (id: string, url: string, storedResourceType?: string) => {
    // Optimistically remove from UI
    onUpdate({ files: block.files?.filter((f: DownloadableFile) => f.id !== id) })

    // Extract public_id from URL
    try {
      if (url && url.includes('cloudinary.com')) {
        const parts = url.split('/upload/')
        if (parts.length === 2) {
          const pathParts = parts[1].split('/')
          const versionIndex = pathParts.findIndex(
            (p) => p.startsWith('v') && !isNaN(Number(p.substring(1)))
          )
          const relevantParts = pathParts.slice(versionIndex + 1)
          let publicId = relevantParts.join('/')
          publicId = decodeURIComponent(publicId)

          // Clean modifiers if any (like fl_attachment at start of path if we didn't use separate /fl_attachment/ segment)
          if (publicId.startsWith('fl_attachment')) {
            // This would be rare with new logic but possible with old
          }

          // Determine resource type
          let resourceType: 'image' | 'video' | 'raw' = 'image'

          if (
            storedResourceType === 'raw' ||
            storedResourceType === 'video' ||
            storedResourceType === 'image'
          ) {
            resourceType = storedResourceType
          } else {
            // Fallback inference
            const ext = publicId.split('.').pop()?.toLowerCase()
            if (
              [
                'pdf',
                'doc',
                'docx',
                'xls',
                'xlsx',
                'ppt',
                'pptx',
                'zip',
                'rar',
                'txt',
                'csv',
              ].includes(ext || '')
            ) {
              resourceType = 'raw'
            } else if (
              ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg'].includes(ext || '')
            ) {
              resourceType = 'video' // Audio is video in Cloudinary
            }
          }

          // Call server action
          await deleteCloudinaryFile(publicId, resourceType)
        }
      }
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error)
    }
  }

  const updateFile = (id: string, updates: Partial<DownloadableFile>) => {
    onUpdate({
      files: block.files?.map((f: DownloadableFile) => (f.id === id ? { ...f, ...updates } : f)),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título del Bloque</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ej. Descargar Materiales del Curso"
        />
      </div>
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          value={block.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Descripción para el estudiante..."
        />
      </div>

      <div className="space-y-3">
        <Label>Archivos Descargables</Label>

        {/* File Upload Area */}
        <div className="border-2 border-dashed rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
          <FileUpload
            fileType="document"
            acceptedTypes={['*/*']}
            folder="course-files"
            onUploadComplete={handleAddFile}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Sube archivos PDF, Word, Excel, Audio, etc.
          </p>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {block.files?.map((file: DownloadableFile) => (
            <Card key={file.id} className="relative group overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Título de Botón</Label>
                    <Input
                      value={file.title}
                      onChange={(e) => updateFile(file.id, { title: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(file.id, file.url, file.resourceType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono bg-muted p-1.5 rounded truncate">
                  <span className="uppercase font-bold shrink-0">{file.fileType}</span>
                  <span className="truncate">{file.url}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!block.files || block.files.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4 italic">
              No hay archivos añadidos. Sube uno arriba.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function GenericProperties({
  block,
  onUpdate,
}: {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      {/* Common Fields */}
      {'title' in block && (
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={(block as Block & { title?: string }).title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
        </div>
      )}
      {'description' in block && (
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            value={(block as Block & { description?: string }).description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      )}

      {/* Specific Fields for Text Block */}
      {block.type === 'text' && (
        <div className="space-y-2">
          <Label>Contenido</Label>
          <RichTextEditor
            value={(block as TextBlock).content || ''}
            onChange={(content) => onUpdate({ content })}
          />
        </div>
      )}
      {/* Specific Fields for Video Block */}
      {block.type === 'video' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={(block as VideoBlock).title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Título del video"
            />
          </div>
          <div className="space-y-2">
            <Label>Fuente de Video</Label>
            <FileUpload
              fileType="video"
              folder="course-videos"
              onUploadComplete={(res: { secure_url: string; duration?: number }) =>
                onUpdate({ url: res.secure_url, duration: res.duration })
              }
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O URL</span>
              </div>
            </div>
            <Input
              value={(block as VideoBlock).url || ''}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      )}
      {/* Specific Fields for Image Block */}
      {block.type === 'image' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subir Imagen</Label>
            <FileUpload
              fileType="image"
              folder="course-images"
              onUploadComplete={(res: { secure_url: string; original_filename?: string }) =>
                onUpdate({ url: res.secure_url, alt: res.original_filename || '' })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Texto Alternativo</Label>
            <Input
              value={(block as ImageBlock).alt || ''}
              onChange={(e) => onUpdate({ alt: e.target.value })}
              placeholder="Descripción de la imagen"
            />
          </div>
          <div className="space-y-2">
            <Label>Leyenda</Label>
            <Input
              value={(block as ImageBlock).caption || ''}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Leyenda de imagen (opcional)"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function QuizProperties({
  block,
  onUpdate,
}: {
  block: QuizBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 'Option 1',
      points: 10,
    }
    onUpdate({ questions: [...(block.questions || []), newQuestion] })
  }

  const removeQuestion = (id: string) => {
    onUpdate({ questions: block.questions?.filter((q: QuizQuestion) => q.id !== id) })
  }

  const updateQuestion = (id: string, field: string, value: string | string[] | number) => {
    onUpdate({
      questions: block.questions?.map((q: QuizQuestion) =>
        q.id === id ? { ...q, [field]: value } : q
      ),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título del Quiz</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del Quiz"
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Preguntas</Label>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-3 w-3 mr-1" /> Agregar
          </Button>
        </div>
        {block.questions?.map((q: QuizQuestion, i: number) => (
          <Card key={q.id} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => removeQuestion(q.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
            <CardContent className="p-3 space-y-3">
              <div className="font-medium text-xs text-muted-foreground">Pregunta {i + 1}</div>
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                placeholder="Escribe la pregunta..."
              />
              {/* Simplified logic for options - could be expanded */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opciones</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const newOptions = [...(q.options || []), 'Nueva Opción']
                      updateQuestion(q.id, 'options', newOptions)
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Opción
                  </Button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-muted">
                  {(q.options || []).map((opt: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center shrink-0',
                          q.correctAnswer === opt
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        )}
                        onClick={() => updateQuestion(q.id, 'correctAnswer', opt)}
                        title="Marcar como correcta"
                      >
                        {q.correctAnswer === opt && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...(q.options || [])]
                          newOptions[optIndex] = e.target.value
                          // If we are modifying the correct answer, update it too
                          if (q.correctAnswer === opt) {
                            updateQuestion(q.id, 'correctAnswer', e.target.value)
                          }
                          updateQuestion(q.id, 'options', newOptions)
                        }}
                        className="h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:text-destructive"
                        onClick={() => {
                          const newOptions = (q.options || []).filter(
                            (_: string, idx: number) => idx !== optIndex
                          )
                          updateQuestion(q.id, 'options', newOptions)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">
                  Respuesta Correcta Actual:{' '}
                  <span className="font-medium text-foreground">
                    {q.correctAnswer || '(Ninguna seleccionada)'}
                  </span>
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function GrammarProperties({
  block,
  onUpdate,
}: {
  block: GrammarBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  // ... existing implementation ...
  const addExample = () => {
    const newExample = { id: `ex_${Date.now()}`, sentence: '', translation: '' }
    onUpdate({ examples: [...(block.examples || []), newExample] })
  }

  const updateExample = (id: string, field: string, value: string) => {
    const updatedExamples = block.examples?.map((ex) =>
      ex.id === id ? { ...ex, [field]: value } : ex
    )
    onUpdate({ examples: updatedExamples })
  }

  const removeExample = (id: string) => {
    const updatedExamples = block.examples?.filter((ex) => ex.id !== id)
    onUpdate({ examples: updatedExamples })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título de la Regla</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="ej. Presente Simple"
        />
      </div>

      <div className="space-y-2">
        <Label>Descripción / Explicación</Label>
        <RichTextEditor
          value={block.description || ''}
          onChange={(content) => onUpdate({ description: content })}
          placeholder="Explica la regla gramatical..."
        />
      </div>

      <div className="space-y-2">
        <Label>Ilustración</Label>
        <IllustrationPicker value={block.image} onChange={(val) => onUpdate({ image: val })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ejemplos</Label>
          <Button variant="outline" size="sm" onClick={addExample}>
            <Plus className="h-3 w-3 mr-1" /> Agregar
          </Button>
        </div>
        {block.examples?.map((ex) => (
          <Card key={ex.id} className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeExample(ex.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Frase (Oración)</Label>
                <HighlighterInput
                  value={ex.sentence}
                  onChange={(val) => updateExample(ex.id, 'sentence', val)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Traducción / Nota</Label>
                <Input
                  value={ex.translation || ''}
                  onChange={(e) => updateExample(ex.id, 'translation', e.target.value)}
                  placeholder="Traducción opcional"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// List of monochromatic blue icons suitable for education/vocabulary
const VOCABULARY_ICONS = Array.from(
  new Set([
    'Book',
    'BookOpen',
    'Bookmark',
    'GraduationCap',
    'School',
    'Pencil',
    'PenTool',
    'Edit',
    'Languages',
    'Globe',
    'Map',
    'Compass',
    'Navigation',
    'Lightbulb',
    'Brain',
    'Puzzle',
    'Zap',
    'Star',
    'Trophy',
    'Medal',
    'Target',
    'Flag',
    'Crown',
    'Award',
    'ThumbsUp',
    'Heart',
    'Smile',
    'User',
    'Users',
    'Group',
    'MessageCircle',
    'MessageSquare',
    'Mic',
    'Volume2',
    'Music',
    'Video',
    'Image',
    'Camera',
    'Film',
    'Monitor',
    'Smartphone',
    'Laptop',
    'Watch',
    'Mouse',
    'Keyboard',
    'HardDrive',
    'Wifi',
    'Signal',
    'Battery',
    'Sun',
    'Moon',
    'Cloud',
    'CloudRain',
    'Umbrella',
    'Wind',
    'Thermometer',
    'Droplet',
    'Coffee',
    'Utensils',
    'Apple',
    'Car',
    'Bus',
    'Train',
    'Plane',
    'Ship',
    'Bike',
    'Home',
    'Building',
    'Factory',
    'Briefcase',
    'CreditCard',
    'DollarSign',
    'ShoppingBag',
    'ShoppingCart',
    'Gift',
    'Tag',
    'Calendar',
    'Clock',
    'Timer',
    'Bell',
    'Search',
    'ZoomIn',
    'Key',
    'Lock',
    'Unlock',
    'Shield',
    'Anchor',
    'Archive',
    'ArrowRight',
    'AtSign',
    'Baby',
    'Backpack',
    'Badge',
    'BadgeCheck',
    'Banknote',
    'BarChart',
    'Beer',
    'Binary',
    'Bird',
    'Bitcoin',
    'Bluetooth',
    'Bone',
    'Box',
    'Brush',
    'Bug',
    'Calculator',
    'CalendarDays',
    'Cast',
    'Cat',
    'Check',
    'CheckCircle',
    'ChefHat',
    'Cherry',
    'ChevronRight',
    'Church',
    'Cigarette',
    'Circle',
    'Clipboard',
    'ClipboardList',
    'CloudFog',
    'CloudLightning',
    'CloudSnow',
    'Code',
    'Coins',
    'Command',
    'Computer',
    'Construction',
    'Contact',
    'Cookie',
    'Copy',
    'Copyright',
    'CornerDownRight',
    'Crop',
    'Cross',
    'Crosshair',
    'CupSoda',
    'Database',
    'Delete',
    'Diamond',
    'Dice1',
    'Disc',
    'Divide',
    'Dna',
    'Dog',
    'DoorOpen',
    'Download',
    'Droplets',
    'Drum',
    'Dumbbell',
    'Ear',
    'Edit2',
    'Egg',
    'Eraser',
    'Euro',
    'Eye',
    'Fan',
    'FastForward',
    'Feather',
    'Figma',
    'File',
    'FileAudio',
    'FileCode',
    'FileDigit',
    'FileImage',
    'FileJson',
    'FileText',
    'FileVideo',
    'Files',
    'Filter',
    'Fingerprint',
    'FireExtinguisher',
    'Fish',
    'Flame',
    'Flashlight',
    'FlaskConical',
    'FlipHorizontal',
    'Flower',
    'Folder',
    'FolderOpen',
    'Frown',
    'FunctionSquare',
    'Gamepad',
    'Gamepad2',
    'Gavel',
    'Gem',
    'Ghost',
    'GitBranch',
    'GitCommit',
    'GitMerge',
    'GitPullRequest',
    'Github',
    'Glasses',
    'Goal',
    'Grab',
    'Grape',
    'Grid',
    'GripHorizontal',
    'GripVertical',
    'Hammer',
    'Hand',
    'HandMetal',
    'HardHat',
    'Hash',
    'Haze',
    'Heading',
    'Headphones',
    'HelpCircle',
    'Hexagon',
    'Highlighter',
    'History',
    'Hourglass',
    'IceCream',
    'Inbox',
    'Indent',
    'Infinity',
    'Info',
    'Instagram',
    'Italic',
    'JapaneseYen',
    'Joystick',
    'Lamp',
    'Landmark',
    'Lasso',
    'Laugh',
    'Layers',
    'Layout',
    'Leaf',
    'Library',
    'LifeBuoy',
    'Link',
    'Linkedin',
    'List',
    'ListChecks',
    'ListMusic',
    'ListOrdered',
    'Loader',
    'LogIn',
    'LogOut',
    'Mail',
    'MailOpen',
    'MapPin',
    'Maximize',
    'Megaphone',
    'Meh',
    'Menu',
    'MicOff',
    'Minimize',
    'Minus',
    'MoreHorizontal',
    'MoreVertical',
    'Move',
    'Network',
    'Newspaper',
  ])
).sort()

import * as LucideIcons from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const IPA_SYMBOLS = [
  'ə',
  'ɪ',
  'i:',
  'ʊ',
  'u:',
  'e',
  'ɜ:',
  'ɔ:',
  'æ',
  'ʌ',
  'ɑ:',
  'ɒ', // Vowels
  'eɪ',
  'aɪ',
  'ɔɪ',
  'aʊ',
  'əʊ',
  'ɪə',
  'eə',
  'ʊə', // Diphthongs
  'p',
  'b',
  't',
  'd',
  'k',
  'g',
  'f',
  'v',
  'θ',
  'ð',
  's',
  'z',
  'ʃ',
  'ʒ',
  'h',
  'm',
  'n',
  'ŋ',
  'r',
  'l',
  'w',
  'j',
  'tʃ',
  'dʒ', // Consonants
]

function IPAPicker({ onInsert }: { onInsert: (symbol: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-xs text-muted-foreground mr-1"
          title="Insert IPA Symbol"
        >
          <span className="font-serif">ə</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-6 gap-1">
          {IPA_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              className="p-1.5 text-sm hover:bg-muted rounded font-serif text-center"
              onClick={() => {
                onInsert(symbol)
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function IconPicker({ value, onChange }: { value?: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredIcons = VOCABULARY_ICONS.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  )

  const SelectedIcon = value
    ? (LucideIcons[value as keyof typeof LucideIcons] as LucideIcons.LucideIcon | undefined)
    : null

  return (
    <div className="relative">
      {!open ? (
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setOpen(true)}
        >
          {SelectedIcon ? (
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-blue-500" />
              <span>{value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Seleccionar Ícono</span>
          )}
        </Button>
      ) : (
        <div className="border rounded-lg p-2 bg-background space-y-2">
          <Input
            placeholder="Buscar ícono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="h-8 text-xs"
          />
          <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto p-1">
            {filteredIcons.map((iconName) => {
              const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as
                | LucideIcons.LucideIcon
                | undefined
              if (!Icon) return null
              return (
                <button
                  key={iconName}
                  className={cn(
                    'p-1.5 rounded hover:bg-muted flex items-center justify-center transition-colors',
                    value === iconName
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    onChange(iconName)
                    setOpen(false)
                  }}
                  title={iconName}
                >
                  <Icon className="h-5 w-5" />
                </button>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-xs"
            onClick={() => setOpen(false)}
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  )
}

function VocabularyProperties({
  block,
  onUpdate,
}: {
  block: VocabularyBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const addItem = () => {
    const newItem = { id: `voc_${Date.now()}`, term: '', definition: '', icon: 'Book', example: '' }
    onUpdate({ items: [...(block.items || []), newItem] })
  }

  const updateItem = (id: string, field: string, value: string) => {
    const updatedItems = block.items?.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    )
    onUpdate({ items: updatedItems })
  }

  const removeItem = (id: string) => {
    const updatedItems = block.items?.filter((item) => item.id !== id)
    onUpdate({ items: updatedItems })
  }

  const moveItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      if (!block.items) return
      const newItems = [...block.items]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newItems.length) return

      const [movedItem] = newItems.splice(index, 1)
      newItems.splice(targetIndex, 0, movedItem)

      onUpdate({ items: newItems })
    },
    [block.items, onUpdate]
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título de la Sección</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="ej. Vocabulario de Viaje"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Lista de Vocabulario</Label>
          <span className="text-xs text-muted-foreground">{block.items?.length || 0} palabras</span>
        </div>

        <div className="space-y-3">
          {block.items?.map((item, index) => (
            <Card key={item.id} className="relative group">
              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  title="Mover arriba"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === (block.items?.length || 0) - 1}
                  title="Mover abajo"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(item.id)}
                  title="Eliminar palabra"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <CardContent className="p-3 space-y-4 pt-8 sm:pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Término</Label>
                    <Input
                      value={item.term}
                      onChange={(e) => updateItem(item.id, 'term', e.target.value)}
                      placeholder="Palabra"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pronunciación</Label>
                    <div className="relative">
                      <Input
                        value={item.pronunciation || ''}
                        onChange={(e) => updateItem(item.id, 'pronunciation', e.target.value)}
                        placeholder="/IPA/"
                        className="pr-8"
                      />
                      <div className="absolute right-1 top-1">
                        <IPAPicker
                          onInsert={(symbol) =>
                            updateItem(
                              item.id,
                              'pronunciation',
                              (item.pronunciation || '') + symbol
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Definición</Label>
                  <Textarea
                    value={item.definition}
                    onChange={(e) => updateItem(item.id, 'definition', e.target.value)}
                    placeholder="Significado de la palabra..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Ejemplo (puedes resaltar en negrita azul)
                  </Label>
                  <HighlighterInput
                    value={item.example || ''}
                    onChange={(val) => updateItem(item.id, 'example', val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ícono</Label>
                  <IconPicker
                    value={(item as { icon?: string }).icon}
                    onChange={(val) => updateItem(item.id, 'icon', val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Audio de Pronunciación (Opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <FileUpload
                        fileType="audio"
                        folder="course-vocabulary-audio"
                        onUploadComplete={async (res: { secure_url: string }) => {
                          if (item.audioUrl) {
                            await deleteFileFromUrl(item.audioUrl, 'video')
                          }
                          updateItem(item.id, 'audioUrl', res.secure_url)
                        }}
                      />
                    </div>
                    {item.audioUrl && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600"
                          onClick={() => {
                            const audio = new Audio(item.audioUrl)
                            audio.play()
                          }}
                          title="Reproducir"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => updateItem(item.id, 'audioUrl', '')}
                          title="Eliminar audio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {item.audioUrl && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-full">
                      {item.audioUrl.split('/').pop()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!block.items || block.items.length === 0) && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-2">
                No tienes palabras en este bloque.
              </p>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="h-3 w-3 mr-1" /> Agregar Palabra
          </Button>
        </div>
      </div>
    </div>
  )
}

// Grammar icons available for selection
// const GRAMMAR_ICONS = [
//     'Book', 'BookOpen', 'MessageCircle', 'PenTool', 'Brain', 'Lightbulb',
//     'GraduationCap', 'School', 'Languages', 'MessageSquare', 'Puzzle', 'Zap'
// ];

function IllustrationPicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (val: string) => void
}) {
  const [search, setSearch] = useState('')

  // Filter icons based on search
  const filteredIcons = VOCABULARY_ICONS.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar ícono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-6 gap-2 max-h-[240px] overflow-y-auto p-1 border rounded-md">
        {filteredIcons.map((iconName) => {
          const Icon =
            (LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcons.LucideIcon) ||
            LucideIcons.HelpCircle
          return (
            <div
              key={iconName}
              className={cn(
                'aspect-square rounded-md flex items-center justify-center cursor-pointer border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors',
                value === iconName
                  ? 'border-blue-500 bg-blue-50 text-blue-600 ring-1 ring-blue-500'
                  : 'border-transparent'
              )}
              onClick={() => onChange(iconName)}
              title={iconName}
            >
              <Icon className="h-5 w-5" />
            </div>
          )
        })}
      </div>
      <div className="text-[10px] text-muted-foreground text-right">
        {filteredIcons.length} íconos disponibles
      </div>
    </div>
  )
}

function HighlighterInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isLocked = useRef(false)

  // Sync: Prop -> DOM
  // Only update DOM if it differs from prop AND we are not in the middle of a composition/input
  // to avoid cursor jumps.
  useEffect(() => {
    const div = editorRef.current
    if (!div) return

    if (div.innerHTML !== value) {
      // Check if the difference is meaningful (optional)
      // But fundamentally, if we are typing, div.innerHTML matches value (via onInput sync).
      // So this only fires if value changed Externally or if there's a discrepancy.

      // To be safe against cursor jumps during rapid typing if round-trip is fast:
      // Check if we are the active element.
      if (document.activeElement === div) {
        // If we are focused, we assume the DOM is the source of truth for the *latest* keystroke.
        // We only overwrite if the prop divergence is significant or we want to force formatting.
        // For now, let's trusting that onInput syncs up.
        if (div.innerHTML !== value) {
          // Prop is different. This happens if we formatted text (toggleHighlight).
          // Or if input was rejected.
          // We must update.
          const savedSelection = saveSelection(div)
          div.innerHTML = value
          restoreSelection(div, savedSelection)
        }
      } else {
        div.innerHTML = value
      }
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const toggleHighlight = () => {
    const div = editorRef.current
    if (!div) return

    div.focus() // Ensure focus
    document.execCommand('bold')
    handleInput() // Trigger update
  }

  // Helper to save cursor position (simple version)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveSelection = (_containerEl: Node) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    return range.cloneRange()
  }

  // Helper to restore cursor (approximate)
  const restoreSelection = (containerEl: Node, savedRange: Range | null) => {
    if (!savedRange) return
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center bg-muted/50 p-1 rounded-t-md border border-b-0">
        <span className="text-[10px] text-muted-foreground px-2">Selecciona y resalta</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 hover:bg-white"
          onMouseDown={(e) => {
            e.preventDefault()
            toggleHighlight()
          }}
        >
          <LucideIcons.Highlighter className="h-3 w-3 mr-1 text-blue-600" />
          <span className="font-bold text-blue-600">Resaltar</span>
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] w-full rounded-b-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&_b]:text-blue-600 [&_b]:font-bold"
        style={{ fontFamily: 'monospace', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
      />
    </div>
  )
}

function AudioProperties({
  block,
  onUpdate,
}: {
  block: AudioBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título del Audio</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del audio"
        />
      </div>

      <div className="space-y-4">
        <Label>Fuente de Audio</Label>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Subir Archivo</Label>
          <FileUpload
            fileType="audio"
            folder="course-audio"
            onUploadComplete={async (res: { secure_url: string }) => {
              if (block.url) {
                await deleteFileFromUrl(block.url, 'video')
              }
              onUpdate({ url: res.secure_url })
            }}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">O grabar</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Grabar Micrófono</Label>
          <AudioRecorder
            onUploadComplete={async (url) => {
              if (block.url) {
                await deleteFileFromUrl(block.url, 'video')
              }
              onUpdate({ url })
            }}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label>Límite de Reproducciones</Label>
          <Switch
            checked={block.maxReplays !== undefined && block.maxReplays > 0}
            onCheckedChange={(checked) => onUpdate({ maxReplays: checked ? 1 : 0 })}
          />
        </div>
        {block.maxReplays !== undefined && block.maxReplays > 0 && (
          <div className="pt-2 animate-in slide-in-from-top-2">
            <Label className="text-xs text-muted-foreground">
              Cantidad máxima de veces (0 = Ilimitado)
            </Label>
            <Input
              type="number"
              min={1}
              value={block.maxReplays}
              onChange={(e) => onUpdate({ maxReplays: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function AudioRecorder({ onUploadComplete }: { onUploadComplete: (url: string) => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }) // webm is common
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        await handleUpload(file)

        // Stop tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('No se pudo acceder al micrófono.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadFileByType(formData, 'audio', 'course-audio-recordings')
      if (result.success && result.data) {
        onUploadComplete(result.data.secure_url)
      } else {
        console.error('Upload failed', result.error)
        alert('Error al subir la grabación')
      }
    } catch (e) {
      console.error(e)
      alert('Error al subir la grabación')
    } finally {
      setIsUploading(false)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col items-center justify-center gap-3 bg-muted/20">
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Subiendo grabación...</span>
        </div>
      ) : (
        <>
          <div className="text-2xl font-mono tabular-nums font-bold text-primary">
            {formatTime(recordingTime)}
          </div>

          {!isRecording ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full hover:scale-105 transition-transform"
              onClick={startRecording}
              title="Empezar Grabación"
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-12 w-12 rounded-full animate-pulse bg-red-600 hover:bg-red-700 hover:scale-105 transition-transform"
              onClick={stopRecording}
              title="Detener Grabación"
            >
              <Square className="h-5 w-5 fill-current" />
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            {isRecording ? 'Grabando...' : 'Haz clic para grabar'}
          </p>
        </>
      )}
    </div>
  )
}

function FillBlanksProperties({
  block,
  onUpdate,
}: {
  block: FillBlanksBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const activeTextareaRef = useRef<{ index: number; el: HTMLTextAreaElement } | null>(null)

  const addItem = () => {
    const newItem = { id: `fb_${Date.now()}`, content: '' }
    onUpdate({ items: [...(block.items || []), newItem] })
  }

  const updateItem = (id: string, content: string) => {
    const updatedItems = block.items?.map((item) => (item.id === id ? { ...item, content } : item))
    onUpdate({ items: updatedItems })
  }

  const removeItem = (id: string) => {
    const updatedItems = block.items?.filter((item) => item.id !== id)
    onUpdate({ items: updatedItems })
  }

  const addBlank = () => {
    const active = activeTextareaRef.current
    if (!active || !block.items) return

    const item = block.items[active.index]
    if (!item) return

    const textarea = active.el
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = item.content || ''

    if (start === end) {
      const before = text.substring(0, start)
      const after = text.substring(end)
      const newContent = `${before}[palabra]${after}`
      updateItem(item.id, newContent)
      return
    }

    const selected = text.substring(start, end)
    if (selected.startsWith('[') && selected.endsWith(']')) return

    const before = text.substring(0, start)
    const after = text.substring(end)
    const newContent = `${before}[${selected}]${after}`
    updateItem(item.id, newContent)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Contenido del Ejercicio</Label>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
            <p>1. Escribe el texto completo abajo.</p>
            <p>2. Selecciona la palabra que quieres ocultar.</p>
            <p>
              3. Haz clic en <strong>Crear Espacio</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Ejercicios</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={addBlank}
              type="button"
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Crear Espacio
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {block.items?.map((item, index) => (
            <div key={item.id} className="relative group p-2 border rounded-md bg-background">
              <div className="absolute right-2 top-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Ejercicio {index + 1}
              </Label>
              <Textarea
                value={item.content}
                onChange={(e) => updateItem(item.id, e.target.value)}
                onFocus={(e) => (activeTextareaRef.current = { index, el: e.target })}
                rows={3}
                className="font-mono text-sm leading-relaxed resize-y"
                placeholder="El gato está [durmiendo] en la alfombra..."
              />
            </div>
          ))}
          {(!block.items || block.items.length === 0) && (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">No hay ejercicios</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={addItem} className="h-9">
            <Plus className="h-3 w-3 mr-1" /> Agregar Ejercicio
          </Button>
        </div>
      </div>
    </div>
  )
}

function MatchProperties({
  block,
  onUpdate,
}: {
  block: MatchBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const addPair = () => {
    const newPair = { id: `m_${Date.now()}`, left: '', right: '' }
    onUpdate({ pairs: [...(block.pairs || []), newPair] })
  }

  const updatePair = (id: string, field: 'left' | 'right', value: string) => {
    onUpdate({
      pairs: block.pairs.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    })
  }

  const removePair = (id: string) => {
    onUpdate({
      pairs: block.pairs.filter((p) => p.id !== id),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título (Opcional)</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Instrucciones..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pares de Correspondencia</Label>
          <Button variant="outline" size="sm" onClick={addPair}>
            <Plus className="h-3 w-3 mr-1" /> Agregar Par
          </Button>
        </div>

        <div className="space-y-2">
          {block.pairs?.map((pair, index) => (
            <div key={pair.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-start group">
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Lado A</Label>}
                <Input
                  value={pair.left}
                  onChange={(e) => updatePair(pair.id, 'left', e.target.value)}
                  placeholder="Izquierda"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs text-muted-foreground">Lado B</Label>}
                <Input
                  value={pair.right}
                  onChange={(e) => updatePair(pair.id, 'right', e.target.value)}
                  placeholder="Derecha"
                  className="text-sm"
                />
              </div>
              <div className={cn('pt-1', index === 0 && 'pt-6')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removePair(pair.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {(!block.pairs || block.pairs.length === 0) && (
            <div className="text-center py-4 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No hay pares definidos</p>
              <Button variant="link" onClick={addPair}>
                Agregar uno
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrueFalseProperties({
  block,
  onUpdate,
}: {
  block: TrueFalseBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const addItem = () => {
    const newItem = { id: `tf_${Date.now()}`, statement: '', correctAnswer: true }
    onUpdate({ items: [...(block.items || []), newItem] })
  }

  const updateItem = (
    id: string,
    updates: Partial<{ statement: string; correctAnswer: boolean }>
  ) => {
    const updatedItems = block.items?.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    )
    onUpdate({ items: updatedItems })
  }

  const removeItem = (id: string) => {
    const updatedItems = block.items?.filter((item) => item.id !== id)
    onUpdate({ items: updatedItems })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label>Afirmaciones</Label>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Agregar
        </Button>
      </div>

      <div className="space-y-4">
        {block.items?.map((item, index) => (
          <div key={item.id} className="p-3 border rounded-lg bg-card space-y-3 relative group">
            <div className="absolute right-2 top-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Afirmación {index + 1}</Label>
              <Textarea
                value={item.statement}
                onChange={(e) => updateItem(item.id, { statement: e.target.value })}
                placeholder="Escribe la afirmación..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Respuesta Correcta</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={item.correctAnswer === true ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 h-8',
                    item.correctAnswer === true ? 'bg-green-600 hover:bg-green-700' : ''
                  )}
                  onClick={() => updateItem(item.id, { correctAnswer: true })}
                >
                  Verdadero
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={item.correctAnswer === false ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 h-8',
                    item.correctAnswer === false ? 'bg-red-600 hover:bg-red-700' : ''
                  )}
                  onClick={() => updateItem(item.id, { correctAnswer: false })}
                >
                  Falso
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(!block.items || block.items.length === 0) && (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No hay afirmaciones</p>
            <Button variant="outline" onClick={addItem}>
              Agregar Primera
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EssayProperties({
  block,
  onUpdate,
}: {
  block: EssayBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Pregunta o Tema</Label>
        <Textarea
          value={block.prompt || ''}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="Describe el tema sobre el que deben escribir..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mínimo de Palabras</Label>
          <Input
            type="number"
            value={block.minWords || 0}
            onChange={(e) => onUpdate({ minWords: parseInt(e.target.value) || undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label>Máximo (Opcional)</Label>
          <Input
            type="number"
            value={block.maxWords || ''}
            onChange={(e) => onUpdate({ maxWords: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
    </div>
  )
}

function RecordingProperties({
  block,
  onUpdate,
}: {
  block: RecordingBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Instrucciones de Grabación</Label>
        <Textarea
          value={block.instruction || ''}
          onChange={(e) => onUpdate({ instruction: e.target.value })}
          placeholder="Explica qué deben grabar..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Límite de Tiempo (segundos)</Label>
        <Input
          type="number"
          value={block.timeLimit || 60}
          onChange={(e) => onUpdate({ timeLimit: parseInt(e.target.value) || 60 })}
        />
        <p className="text-xs text-muted-foreground">
          Recomendado: 60-120 segundos para respuestas cortas.
        </p>
      </div>
    </div>
  )
}

function MultipleChoiceProperties({
  block,
  onUpdate,
}: {
  block: MultipleChoiceBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const options = block.options || []

  const addOption = () => {
    const newId = `opt${Date.now()}`
    onUpdate({
      options: [...options, { id: newId, text: `Opción ${options.length + 1}` }],
    })
  }

  const updateOption = (id: string, text: string) => {
    onUpdate({
      options: options.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    })
  }

  const removeOption = (id: string) => {
    onUpdate({
      options: options.filter((opt) => opt.id !== id),
      correctOptionId: block.correctOptionId === id ? options[0]?.id : block.correctOptionId,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Pregunta</Label>
        <Textarea
          value={block.question || ''}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="Escribe la pregunta..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Opciones de Respuesta</Label>
        <p className="text-xs text-muted-foreground">
          Haz clic en el círculo para marcar la respuesta correcta.
        </p>

        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ correctOptionId: option.id })}
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                  block.correctOptionId === option.id
                    ? 'border-green-500 bg-green-500'
                    : 'border-muted-foreground/30 hover:border-primary'
                )}
              />
              <Input
                value={option.text}
                onChange={(e) => updateOption(option.id, e.target.value)}
                placeholder={`Opción ${index + 1}`}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeOption(option.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Opción
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Puntos</Label>
        <Input
          type="number"
          min={0}
          value={block.points || 10}
          onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 10 })}
        />
      </div>

      <div className="space-y-2">
        <Label>Explicación (opcional)</Label>
        <Textarea
          value={block.explanation || ''}
          onChange={(e) => onUpdate({ explanation: e.target.value })}
          placeholder="Explicación de la respuesta correcta..."
          rows={2}
        />
      </div>
    </div>
  )
}

function ShortAnswerProperties({
  block,
  onUpdate,
}: {
  block: ShortAnswerBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const answers = block.correctAnswers || []

  const addAnswer = () => {
    onUpdate({ correctAnswers: [...answers, ''] })
  }

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers]
    newAnswers[index] = value
    onUpdate({ correctAnswers: newAnswers })
  }

  const removeAnswer = (index: number) => {
    onUpdate({ correctAnswers: answers.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Pregunta</Label>
        <Textarea
          value={block.question || ''}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="Escribe la pregunta..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Respuestas Aceptadas</Label>
        <p className="text-xs text-muted-foreground">
          Agrega todas las variaciones de respuestas correctas.
        </p>

        <div className="space-y-2">
          {answers.map((answer, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={answer}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder={`Respuesta ${index + 1}`}
                className="flex-1"
              />
              {answers.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeAnswer(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addAnswer} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Respuesta Alternativa
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Sensible a Mayúsculas</Label>
          <p className="text-xs text-muted-foreground">Distinguir mayúsculas/minúsculas</p>
        </div>
        <Switch
          checked={block.caseSensitive || false}
          onCheckedChange={(checked) => onUpdate({ caseSensitive: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label>Puntos</Label>
        <Input
          type="number"
          min={0}
          value={block.points || 10}
          onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 10 })}
        />
      </div>
    </div>
  )
}

function OrderingProperties({
  block,
  onUpdate,
}: {
  block: OrderingBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const items = block.items || []

  const addItem = () => {
    const newId = `item${Date.now()}`
    onUpdate({
      items: [...items, { id: newId, text: '', correctPosition: items.length }],
    })
  }

  const updateItem = (id: string, text: string) => {
    onUpdate({
      items: items.map((item) => (item.id === id ? { ...item, text } : item)),
    })
  }

  const removeItem = (id: string) => {
    const newItems = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, correctPosition: index }))
    onUpdate({ items: newItems })
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[newIndex]
    newItems[newIndex] = temp

    onUpdate({
      items: newItems.map((item, i) => ({ ...item, correctPosition: i })),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título (opcional)</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del ejercicio"
        />
      </div>

      <div className="space-y-2">
        <Label>Instrucciones</Label>
        <Textarea
          value={block.instruction || ''}
          onChange={(e) => onUpdate({ instruction: e.target.value })}
          placeholder="Ordena los elementos correctamente..."
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>Elementos a Ordenar</Label>
        <p className="text-xs text-muted-foreground">
          El orden actual es el orden correcto. Usa las flechas para reordenar.
        </p>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0">
                {index + 1}
              </span>
              <Input
                value={item.text}
                onChange={(e) => updateItem(item.id, e.target.value)}
                placeholder={`Elemento ${index + 1}`}
                className="flex-1"
              />
              {items.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Elemento
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Puntos</Label>
        <Input
          type="number"
          min={0}
          value={block.points || 10}
          onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 10 })}
        />
      </div>
    </div>
  )
}

function DragDropProperties({
  block,
  onUpdate,
}: {
  block: DragDropBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const categories = block.categories || []
  const items = block.items || []

  const addCategory = () => {
    const newId = `cat${Date.now()}`
    onUpdate({
      categories: [...categories, { id: newId, name: '' }],
    })
  }

  const updateCategory = (id: string, name: string) => {
    onUpdate({
      categories: categories.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    })
  }

  const removeCategory = (id: string) => {
    onUpdate({
      categories: categories.filter((cat) => cat.id !== id),
      items: items.filter((item) => item.correctCategoryId !== id),
    })
  }

  const addItem = () => {
    const newId = `item${Date.now()}`
    onUpdate({
      items: [...items, { id: newId, text: '', correctCategoryId: categories[0]?.id || '' }],
    })
  }

  const updateItem = (id: string, field: 'text' | 'correctCategoryId', value: string) => {
    onUpdate({
      items: items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    })
  }

  const removeItem = (id: string) => {
    onUpdate({ items: items.filter((item) => item.id !== id) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Título (opcional)</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del ejercicio"
        />
      </div>

      <div className="space-y-2">
        <Label>Instrucciones</Label>
        <Textarea
          value={block.instruction || ''}
          onChange={(e) => onUpdate({ instruction: e.target.value })}
          placeholder="Arrastra cada elemento a la categoría correcta..."
          rows={2}
        />
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <Label>Categorías</Label>
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Input
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, e.target.value)}
                placeholder={`Categoría ${index + 1}`}
                className="flex-1"
              />
              {categories.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeCategory(cat.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addCategory} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Categoría
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <Label>Elementos a Clasificar</Label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Elemento {index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <Input
                value={item.text}
                onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                placeholder="Texto del elemento"
              />
              <select
                value={item.correctCategoryId}
                onChange={(e) => updateItem(item.id, 'correctCategoryId', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name || 'Sin nombre'}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Elemento
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Puntos</Label>
        <Input
          type="number"
          min={0}
          value={block.points || 10}
          onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 10 })}
        />
      </div>
    </div>
  )
}
