'use client'

import { useState } from 'react'
import { 
  Block, 
  TextBlock, 
  VideoBlock, 
  ImageBlock, 
  AudioBlock, 
  QuizBlock, 
  AssignmentBlock, 
  FileBlock, 
  EmbedBlock 
} from '@/types/course-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Edit3,
  Save,
  X,
  Trash2,
  Video,
  Image as LucideImage,
  Music,
  HelpCircle,
  FileText,
  Paperclip,
  Link,
} from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { toast } from 'sonner'
import Image from 'next/image'

interface BlockEditorProps {
  block: Block
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
  onCancel: () => void
}

// Sortable wrapper for blocks
function SortableBlockWrapper({
  block,
  children,
  isEditing,
}: {
  block: Block
  children: React.ReactNode
  isEditing: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={isEditing ? '' : 'group'}>
      {!isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded shadow-sm z-10 hover:bg-muted"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      )}
      {children}
    </div>
  )
}

export function BlockEditor({
  block,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onRemove,
  onCancel,
}: BlockEditorProps) {
  const [localBlock, setLocalBlock] = useState<Block>(block)

  const handleUpdate = (updates: Partial<Block>) => {
    const updated = { ...localBlock, ...updates } as Block
    setLocalBlock(updated)
    onUpdate(updates)
  }

  const handleSave = () => {
    onSave()
  }

  const handleCancel = () => {
    setLocalBlock(block)
    onCancel()
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'text':
        return (
          <div className="h-4 w-4" title="Texto">
            📝
          </div>
        )
      case 'video':
        return <Video className="h-4 w-4" />
      case 'image':
        return <LucideImage className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />
      case 'assignment':
        return <FileText className="h-4 w-4" />
      case 'file':
        return <Paperclip className="h-4 w-4" />
      case 'embed':
        return <Link className="h-4 w-4" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getBlockTitle = (type: string) => {
    switch (type) {
      case 'text':
        return 'Bloque de Texto'
      case 'video':
        return 'Bloque de Video'
      case 'image':
        return 'Bloque de Imagen'
      case 'audio':
        return 'Bloque de Audio'
      case 'quiz':
        return 'Quiz'
      case 'assignment':
        return 'Tarea'
      case 'file':
        return 'Archivo'
      case 'embed':
        return 'Contenido Embebido'
      default:
        return 'Bloque'
    }
  }

  const renderEditingContent = () => {
    switch (block.type) {
      case 'text':
        return <TextBlockEditor block={localBlock as TextBlock} onUpdate={handleUpdate} />
      case 'video':
        return <VideoBlockEditor block={localBlock as VideoBlock} onUpdate={handleUpdate} />
      case 'image':
        return <ImageBlockEditor block={localBlock as ImageBlock} onUpdate={handleUpdate} />
      case 'audio':
        return <AudioBlockEditor block={localBlock as AudioBlock} onUpdate={handleUpdate} />
      case 'quiz':
        return <QuizBlockEditor block={localBlock as QuizBlock} onUpdate={handleUpdate} />
      case 'assignment':
        return <AssignmentBlockEditor block={localBlock as AssignmentBlock} onUpdate={handleUpdate} />
      case 'file':
        return <FileBlockEditor block={localBlock as FileBlock} onUpdate={handleUpdate} />
      case 'embed':
        return <EmbedBlockEditor block={localBlock as EmbedBlock} onUpdate={handleUpdate} />
      default:
        return <div>Tipo de bloque no soportado</div>
    }
  }

  const renderPreviewContent = () => {
    switch (block.type) {
      case 'text':
        return <TextBlockPreview block={block as TextBlock} />
      case 'video':
        return <VideoBlockPreview block={block as VideoBlock} />
      case 'image':
        return <ImageBlockPreview block={block as ImageBlock} />
      case 'audio':
        return <AudioBlockPreview block={block as AudioBlock} />
      case 'quiz':
        return <QuizBlockPreview block={block as QuizBlock} />
      case 'assignment':
        return <AssignmentBlockPreview block={block as AssignmentBlock} />
      case 'file':
        return <FileBlockPreview block={block as FileBlock} />
      case 'embed':
        return <EmbedBlockPreview block={block as EmbedBlock} />
      default:
        return <div>Tipo de bloque no soportado</div>
    }
  }

  return (
    <SortableBlockWrapper block={block} isEditing={isEditing}>
      <Card
        className={`${isEditing ? 'ring-2 ring-primary' : 'hover:shadow-md transition-shadow'} relative`}
      >
        {isEditing ? (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getBlockIcon(block.type)}
                  <span className="font-medium">{getBlockTitle(block.type)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>{renderEditingContent()}</CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getBlockIcon(block.type)}
                  <span className="font-medium">{getBlockTitle(block.type)}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRemove}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>{renderPreviewContent()}</CardContent>
          </>
        )}
      </Card>
    </SortableBlockWrapper>
  )
}

// Text Block Components
function TextBlockEditor({
  block,
  onUpdate,
}: {
  block: TextBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Contenido</label>
        <RichTextEditor
          value={block.content || ''}
          onChange={(content) => onUpdate({ content, format: 'html' })}
          placeholder="Escribe tu contenido aquí..."
        />
      </div>
    </div>
  )
}

function TextBlockPreview({ block }: { block: TextBlock }) {
  const content = block.content || '<p class="text-muted-foreground">Sin contenido</p>'

  return (
    <div className="prose prose-sm max-w-none">
      {block.format === 'html' ? (
        <div dangerouslySetInnerHTML={{ __html: content }} className="text-foreground" />
      ) : (
        <div className="whitespace-pre-wrap">{content}</div>
      )}
    </div>
  )
}

// Video Block Components
function VideoBlockEditor({
  block,
  onUpdate,
}: {
  block: VideoBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL del Video</label>
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      <div>
        <label className="text-sm font-medium">Título</label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del video"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Duración (minutos)</label>
        <Input
          type="number"
          value={block.duration || ''}
          onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>
    </div>
  )
}

function VideoBlockPreview({ block }: { block: VideoBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay URL de video configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {block.title && <p className="font-medium">{block.title}</p>}
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <Video className="h-12 w-12 text-muted-foreground" />
      </div>
      {block.duration && (
        <p className="text-sm text-muted-foreground">Duración: {block.duration} minutos</p>
      )}
    </div>
  )
}

// Image Block Components
function ImageBlockEditor({
  block,
  onUpdate,
}: {
  block: ImageBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL de la Imagen</label>
        <FileUpload
          fileType="image"
          folder="lessons"
          onUploadComplete={(result) => onUpdate({ url: result.secure_url })}
          onUploadError={(error) => {
            console.error('Upload error:', error)
            toast.error('Error al subir la imagen')
          }}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Texto Alternativo</label>
        <Input
          value={block.alt || ''}
          onChange={(e) => onUpdate({ alt: e.target.value })}
          placeholder="Descripción de la imagen para accesibilidad"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Leyenda</label>
        <Input
          value={block.caption || ''}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Leyenda opcional"
        />
      </div>
    </div>
  )
}

function ImageBlockPreview({ block }: { block: ImageBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <LucideImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay imagen configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Image src={block.url} alt={block.alt || 'Imagen del curso'} className="w-full rounded-lg" />
      {block.caption && (
        <p className="text-sm text-muted-foreground text-center">{block.caption}</p>
      )}
    </div>
  )
}

// Audio Block Components
function AudioBlockEditor({
  block,
  onUpdate,
}: {
  block: AudioBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL del Audio</label>
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://example.com/audio.mp3"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Título</label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del audio"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Duración (minutos)</label>
        <Input
          type="number"
          value={block.duration || ''}
          onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>
    </div>
  )
}

function AudioBlockPreview({ block }: { block: AudioBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay URL de audio configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {block.title && <p className="font-medium">{block.title}</p>}
      <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
        <Music className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <div className="bg-background rounded h-2"></div>
        </div>
      </div>
      {block.duration && (
        <p className="text-sm text-muted-foreground">Duración: {block.duration} minutos</p>
      )}
    </div>
  )
}

// Quiz Block Components
function QuizBlockEditor({
  block,
  onUpdate,
}: {
  block: QuizBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Título del Quiz</label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del quiz"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Puntaje Mínimo</label>
        <Input
          type="number"
          value={block.passingScore || ''}
          onChange={(e) => onUpdate({ passingScore: parseInt(e.target.value) || 0 })}
          placeholder="70"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        Las preguntas se configurarán en una vista detallada del quiz
      </div>
    </div>
  )
}

// Quiz Block Components
function QuizBlockPreview({ block }: { block: QuizBlock }) {
  return (
    <div className="space-y-2">
      {block.title && <p className="font-medium">{block.title}</p>}
      <div className="bg-muted rounded-lg p-4 text-center">
        <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {block.questions?.length || 0} preguntas configuradas
        </p>
        {block.passingScore && (
          <p className="text-sm text-muted-foreground">Puntaje mínimo: {block.passingScore}%</p>
        )}
      </div>
    </div>
  )
}

// Assignment Block Components
function AssignmentBlockEditor({
  block,
  onUpdate,
}: {
  block: AssignmentBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Título de la Tarea</label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título de la tarea"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Descripción</label>
        <Textarea
          value={block.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Descripción de la tarea..."
          rows={4}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tipo de Entrega</label>
        <Select
          value={block.submissionType || 'text'}
          onValueChange={(value: 'text' | 'file' | 'link') => onUpdate({ submissionType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="file">Archivo</SelectItem>
            <SelectItem value="link">Enlace</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function AssignmentBlockPreview({ block }: { block: AssignmentBlock }) {
  return (
    <div className="space-y-2">
      {block.title && <p className="font-medium">{block.title}</p>}
      <div className="bg-muted rounded-lg p-4">
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Tipo de entrega: {block.submissionType || 'texto'}
        </p>
        {block.description && <p className="text-sm mt-2">{block.description}</p>}
      </div>
    </div>
  )
}

// File Block Components
function FileBlockEditor({
  block,
  onUpdate,
}: {
  block: FileBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL del Archivo</label>
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://example.com/file.pdf"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Nombre del Archivo</label>
        <Input
          value={block.filename || ''}
          onChange={(e) => onUpdate({ filename: e.target.value })}
          placeholder="documento.pdf"
        />
      </div>
    </div>
  )
}

function FileBlockPreview({ block }: { block: FileBlock }) {
  return (
    <div className="space-y-2">
      <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
        <Paperclip className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium">{block.filename || 'Archivo sin nombre'}</p>
          {block.filesize && (
            <p className="text-sm text-muted-foreground">
              {(block.filesize / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Embed Block Components
function EmbedBlockEditor({
  block,
  onUpdate,
}: {
  block: EmbedBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL a Embeber</label>
        <Input
          value={block.url || ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://example.com/embed"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Título</label>
        <Input
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título del contenido embebido"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Altura (px)</label>
        <Input
          type="number"
          value={block.height || ''}
          onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 400 })}
          placeholder="400"
        />
      </div>
    </div>
  )
}

function EmbedBlockPreview({ block }: { block: EmbedBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay URL para embeber configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {block.title && <p className="font-medium">{block.title}</p>}
      <div
        className="bg-muted rounded-lg flex items-center justify-center"
        style={{ height: block.height || 400 }}
      >
        <Link className="h-12 w-12 text-muted-foreground" />
      </div>
    </div>
  )
}
