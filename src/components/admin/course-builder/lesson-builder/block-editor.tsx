'use client'

import { StructuredContentBlockPreview } from './block-preview'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AssignmentBlock,
  AudioBlock,
  Block,
  BLOCK_TEMPLATES,
  ColumnBlock,
  DownloadableFile,
  EmbedBlock,
  FileBlock,
  GrammarVisualizerBlock,
  ImageBlock,
  LayoutBlock,
  QuizBlock,
  StructuredContentBlock,
  TabGroupBlock,
  TabItemBlock,
  TextBlock,
  VideoBlock,
} from '@/types/course-builder'
import {
  Edit3,
  FileText,
  HelpCircle,
  Link,
  Image as LucideImage,
  Music,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Video,
  X,
  Blocks,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import { NestedBlockList } from './nested-block-list'
import { StructuredContentEditor } from './structured-content-editor'
import { GrammarVisualizerEditor } from './grammar-visualizer-editor'
import { GrammarVisualizerBlockPreview } from './block-preview'

interface BlockEditorProps {
  block: Block
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
  onCancel: () => void
}

// Exported component for use in other parts of the builder (e.g. Canvas)
export function BlockContentEditor({
  block,
  onUpdate,
}: {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
}) {
  switch (block.type) {
    case 'text':
      return <TextBlockEditor block={block as TextBlock} onUpdate={onUpdate} />
    case 'video':
      return <VideoBlockEditor block={block as VideoBlock} onUpdate={onUpdate} />
    case 'image':
      return <ImageBlockEditor block={block as ImageBlock} onUpdate={onUpdate} />
    case 'audio':
      return <AudioBlockEditor block={block as AudioBlock} onUpdate={onUpdate} />
    case 'quiz':
      return <QuizBlockEditor block={block as QuizBlock} onUpdate={onUpdate} />
    case 'assignment':
      return <AssignmentBlockEditor block={block as AssignmentBlock} onUpdate={onUpdate} />
    case 'file':
      return <FileBlockEditor block={block as FileBlock} onUpdate={onUpdate} />
    case 'embed':
      return <EmbedBlockEditor block={block as EmbedBlock} onUpdate={onUpdate} />
    case 'tab_group':
      return <TabGroupBlockEditor block={block as TabGroupBlock} onUpdate={onUpdate} />
    case 'layout':
      return <LayoutBlockEditor block={block as LayoutBlock} onUpdate={onUpdate} />
    case 'structured-content':
      return <StructuredContentEditor block={block as StructuredContentBlock} onUpdate={onUpdate} />
    case 'grammar-visualizer':
      return <GrammarVisualizerEditor block={block as GrammarVisualizerBlock} onUpdate={onUpdate} />
    default:
      return <div>Tipo de bloque no soportado</div>
  }
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
      case 'tab_group':
        return (
          <div className="h-4 w-4" title="Pestañas">
            📑
          </div>
        )
      case 'structured-content':
        return (
          <div className="h-4 w-4" title="Tabla">
            📊
          </div>
        )
      case 'grammar-visualizer':
        return <Blocks className="h-4 w-4" />
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
      case 'tab_group':
        return 'Grupo de Pestañas'
      case 'layout':
        return 'Estructura de Columnas'
      case 'structured-content':
        return 'Contenido Estructurado'
      case 'grammar-visualizer':
        return 'Visualizador Gramatical'
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
        return (
          <AssignmentBlockEditor block={localBlock as AssignmentBlock} onUpdate={handleUpdate} />
        )
      case 'file':
        return <FileBlockEditor block={localBlock as FileBlock} onUpdate={handleUpdate} />
      case 'embed':
        return <EmbedBlockEditor block={localBlock as EmbedBlock} onUpdate={handleUpdate} />
      case 'tab_group':
        return <TabGroupBlockEditor block={localBlock as TabGroupBlock} onUpdate={handleUpdate} />
      case 'layout':
        return <LayoutBlockEditor block={localBlock as LayoutBlock} onUpdate={handleUpdate} />
      case 'structured-content':
        return (
          <StructuredContentEditor
            block={localBlock as StructuredContentBlock}
            onUpdate={handleUpdate}
          />
        )
      case 'grammar-visualizer':
        return (
          <GrammarVisualizerEditor
            block={localBlock as GrammarVisualizerBlock}
            onUpdate={handleUpdate}
          />
        )
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
      case 'tab_group':
        return <TabGroupBlockPreview block={block as TabGroupBlock} />
      case 'layout':
        return <LayoutBlockPreview block={block as LayoutBlock} />
      case 'structured-content':
        return <StructuredContentBlockPreview block={block as StructuredContentBlock} />
      case 'grammar-visualizer':
        return <GrammarVisualizerBlockPreview block={block as GrammarVisualizerBlock} />
      default:
        return <div>Tipo de bloque no soportado</div>
    }
  }

  return (
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
  const firstFile = block.files?.[0] || { title: '', url: '', size: 0, fileType: '', id: '' }

  const updateFile = (updates: Partial<DownloadableFile>) => {
    const updatedFile = { ...firstFile, ...updates }
    // If it's a new file (no ID), give it one
    if (!updatedFile.id) updatedFile.id = `file-${Date.now()}`

    // Replace the first file or add it
    const newFiles = block.files?.length ? [updatedFile, ...block.files.slice(1)] : [updatedFile]
    onUpdate({ files: newFiles })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">URL del Archivo</label>
        <Input
          value={firstFile.url || ''}
          onChange={(e) => updateFile({ url: e.target.value })}
          placeholder="https://example.com/file.pdf"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Nombre del Archivo</label>
        <Input
          value={firstFile.title || ''}
          onChange={(e) => updateFile({ title: e.target.value })}
          placeholder="documento.pdf"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        * Actualmente este editor solo soporta gestionar el primer archivo.
      </div>
    </div>
  )
}

function FileBlockPreview({ block }: { block: FileBlock }) {
  const firstFile = block.files?.[0]

  return (
    <div className="space-y-2">
      <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
        <Paperclip className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium">{firstFile?.title || 'Archivo sin nombre'}</p>
          {firstFile?.size ? (
            <p className="text-sm text-muted-foreground">
              {(firstFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          ) : null}
        </div>
      </div>
      {block.files?.length > 1 && (
        <p className="text-xs text-muted-foreground pl-2">
          + {block.files.length - 1} archivo(s) más
        </p>
      )}
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

// Tab Group Block Components
function TabGroupBlockEditor({
  block,
  onUpdate,
}: {
  block: TabGroupBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const handleTabTitleChange = (tabId: string, newTitle: string) => {
    const updatedChildren = block.children?.map((child) =>
      child.id === tabId ? { ...child, title: newTitle } : child
    )
    onUpdate({ children: updatedChildren as Block[] })
  }

  const addTab = () => {
    const newTab: TabItemBlock = {
      id: `tab-${Date.now()}`,
      type: 'tab_item',
      order: block.children?.length || 0,
      title: `Nueva Pestaña`,
      children: [],
    }
    onUpdate({ children: [...(block.children || []), newTab] })
  }

  const removeTab = (tabId: string) => {
    const updatedChildren = block.children?.filter((child) => child.id !== tabId)
    onUpdate({ children: updatedChildren })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Pestañas</label>
        <Button size="sm" variant="outline" onClick={addTab}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Pestaña
        </Button>
      </div>
      <div className="space-y-2">
        {block.children?.map((tab) => (
          <div key={tab.id} className="flex items-center gap-2">
            <Input
              value={(tab as TabItemBlock).title}
              onChange={(e) => handleTabTitleChange(tab.id, e.target.value)}
              placeholder="Título de la pestaña"
            />
            <Button size="icon" variant="ghost" onClick={() => removeTab(tab.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="text-sm text-muted-foreground mt-4 p-4 bg-muted rounded-md">
        Nota: El contenido de cada pestaña se edita en la vista de detalle de la lección o guardando
        este bloque primero. (Actualmente simplificado para gestión de estructura).
      </div>
    </div>
  )
}

function TabGroupBlockPreview({ block }: { block: TabGroupBlock }) {
  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <div className="flex bg-muted border-b">
          {block.children?.map((tab) => (
            <div
              key={tab.id}
              className="px-4 py-2 text-sm font-medium border-r bg-background first:rounded-tl-lg"
            >
              {(tab as TabItemBlock).title}
            </div>
          ))}
        </div>
        <div className="p-8 text-center text-muted-foreground">
          Contenido de pestañas (Vista Previa)
        </div>
      </div>
    </div>
  )
}

// Layout Block Components
function LayoutBlockEditor({
  block,
  onUpdate,
}: {
  block: LayoutBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const handleColumnsChange = (num: number) => {
    let newChildren = [...(block.children || [])]
    const currentCount = newChildren.length

    if (num > currentCount) {
      // Add columns
      for (let i = currentCount; i < num; i++) {
        newChildren.push({
          id: `col-${Date.now()}-${i}`,
          type: 'column',
          order: i,
          children: [],
        })
      }
    } else if (num < currentCount) {
      // Remove columns (simple truncation for now, might need confirmation if content exists)
      newChildren = newChildren.slice(0, num)
    }
    onUpdate({ columns: num, children: newChildren })
  }

  const handleColumnUpdate = (colId: string, updates: Partial<Block>) => {
    const newChildren = block.children?.map((child) =>
      child.id === colId ? { ...child, ...updates } : child
    )
    onUpdate({ children: newChildren as Block[] })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Número de Columnas</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={block.columns === num ? 'default' : 'outline'}
              onClick={() => handleColumnsChange(num)}
              size="sm"
            >
              {num} Columna{num > 1 ? 's' : ''}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="grid gap-4 mt-6"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {block.children?.map((col) => (
          <ColumnBlockEditor
            key={col.id}
            block={col as ColumnBlock}
            onUpdate={(updates) => handleColumnUpdate(col.id, updates)}
          />
        ))}
      </div>
    </div>
  )
}

function ColumnBlockEditor({
  block,
  onUpdate,
}: {
  block: ColumnBlock
  onUpdate: (updates: Partial<Block>) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  // We need a mini "add block" function for this column
  const handleAddBlock = () => {
    setShowMenu(true)
  }

  const insertBlock = (template: (typeof BLOCK_TEMPLATES)[0]) => {
    const newBlock: Block = {
      ...template.defaultData,
      id: `nested-${Date.now()}`,
      order: block.children?.length || 0,
    }
    // Deep clone to avoid reference issues
    const clonedBlock = JSON.parse(JSON.stringify(newBlock))

    const newChildren = [...(block.children || []), clonedBlock]
    onUpdate({ children: newChildren })
    setShowMenu(false)
  }

  const handleChildUpdate = (childId: string, updates: Partial<Block>) => {
    const newChildren = block.children?.map((child) =>
      child.id === childId ? { ...child, ...updates } : child
    ) as Block[]
    onUpdate({ children: newChildren })
  }

  const handleChildRemove = (childId: string) => {
    const newChildren = block.children?.filter((child) => child.id !== childId)
    onUpdate({ children: newChildren })
  }

  return (
    <div className="border rounded-md p-2 min-h-[100px] bg-slate-50/50 dark:bg-slate-900/20 relative">
      <div className="text-xs text-muted-foreground mb-2 px-1">Columna</div>

      <NestedBlockList
        blocks={block.children || []}
        onBlocksChange={(blocks) => onUpdate({ children: blocks })}
        onAddBlock={handleAddBlock}
        editingBlockId={editingId}
        setEditingBlockId={setEditingId}
        onUpdateBlock={handleChildUpdate}
        onRemoveBlock={handleChildRemove}
      />

      {/* Mini Menu for Column */}
      {showMenu && (
        <div className="absolute top-10 left-0 z-50 bg-popover border rounded shadow-lg p-2 grid grid-cols-2 gap-2 w-64">
          {BLOCK_TEMPLATES.filter((t) => t.type !== 'layout' && t.type !== 'tab_group').map((t) => {
            const Icon = t.icon
            return (
              <Button
                key={t.type}
                variant="ghost"
                size="sm"
                className="justify-start h-auto"
                onClick={() => insertBlock(t)}
              >
                <span className="mr-2">
                  <Icon className="h-4 w-4" />
                </span>{' '}
                <span className="text-xs">{t.label}</span>
              </Button>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 text-xs"
            onClick={() => setShowMenu(false)}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

function LayoutBlockPreview({ block }: { block: LayoutBlock }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}>
      {block.children?.map((col) => (
        <div key={col.id} className="min-h-[50px]">
          {col.children?.map((child) => (
            <div key={child.id} className="mb-4 last:mb-0">
              {/* We call a helper that dispatches to specific previews */}
              <SimpleBlockPreview block={child} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function SimpleBlockPreview({ block }: { block: Block }) {
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
    case 'tab_group':
      return <TabGroupBlockPreview block={block as TabGroupBlock} />
    case 'layout':
      return <LayoutBlockPreview block={block as LayoutBlock} />
    default:
      return <div>Unknown</div>
  }
}
