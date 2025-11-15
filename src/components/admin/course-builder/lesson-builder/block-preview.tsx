'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AssignmentBlock,
  AudioBlock,
  Block,
  EmbedBlock,
  FileBlock,
  ImageBlock,
  QuizBlock,
  TextBlock,
  VideoBlock,
} from '@/types/course-builder'
import {
  Download,
  FileText,
  HelpCircle,
  Link,
  Image as LucideImage,
  Music,
  Play,
  Video,
} from 'lucide-react'
import Image from 'next/image'

interface BlockPreviewProps {
  block: Block
}

export function BlockPreview({ block }: BlockPreviewProps) {
  const renderBlockContent = () => {
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
    <Card className="overflow-hidden">
      <CardContent className="p-6">{renderBlockContent()}</CardContent>
    </Card>
  )
}

// Text Block Preview
function TextBlockPreview({ block }: { block: TextBlock }) {
  const content = block.content || '<p class="text-muted-foreground italic">Sin contenido</p>'

  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <Badge variant="secondary" className="text-xs">
          <FileText className="h-3 w-3 mr-1" />
          Texto
        </Badge>
      </div>
      <div className="prose prose-sm max-w-none text-foreground pt-6">
        {block.format === 'html' ? (
          <div 
            dangerouslySetInnerHTML={{ __html: content }} 
            className="leading-relaxed"
          />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        )}
      </div>
    </div>
  )
}

// Video Block Preview
function VideoBlockPreview({ block }: { block: VideoBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Video no configurado</p>
      </div>
    )
  }

  // Extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
  }

  const thumbnail = getYouTubeThumbnail(block.url)

  return (
    <div className="space-y-4">
      {block.title && (
        <div>
          <h3 className="text-lg font-semibold">{block.title}</h3>
        </div>
      )}
      <div className="relative group">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={block.title || 'Video thumbnail'}
              className="w-full h-full object-cover"
              width={800}
              height={450}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Play className="h-12 w-12 text-white" />
        </div>
      </div>
      {block.duration && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="h-4 w-4" />
          <span>{block.duration} minutos</span>
        </div>
      )}
    </div>
  )
}

// Image Block Preview
function ImageBlockPreview({ block }: { block: ImageBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <LucideImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Imagen no configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Image
          src={block.url}
          alt={block.alt || ''}
          className="w-full rounded-lg shadow-sm"
          width={800}
          height={600}
        />
      </div>
      {block.caption && (
        <p className="text-sm text-muted-foreground text-center italic">{block.caption}</p>
      )}
    </div>
  )
}

// Audio Block Preview
function AudioBlockPreview({ block }: { block: AudioBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Audio no configurado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {block.title && (
        <div>
          <h3 className="text-lg font-semibold">{block.title}</h3>
        </div>
      )}
      <div className="bg-muted rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background rounded-full">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="bg-background rounded-full h-2 mb-2"></div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0:00</span>
              <span>{block.duration ? `${block.duration}:00` : '--:--'}</span>
            </div>
          </div>
          <button className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
            <Play className="h-5 w-5" />
          </button>
        </div>
      </div>
      {block.duration && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music className="h-4 w-4" />
          <span>{block.duration} minutos</span>
        </div>
      )}
    </div>
  )
}

// Quiz Block Preview
function QuizBlockPreview({ block }: { block: QuizBlock }) {
  const questionCount = block.questions?.length || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {block.title && (
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {block.title}
          </h3>
        )}
        <Badge variant="secondary" className="text-xs">
          Quiz
        </Badge>
      </div>
      
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">{questionCount}</p>
              <p className="text-sm text-muted-foreground">
                {questionCount === 1 ? 'Pregunta' : 'Preguntas'}
              </p>
            </div>
            {block.passingScore && (
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{block.passingScore}%</p>
                <p className="text-xs text-muted-foreground">Puntaje mínimo</p>
              </div>
            )}
          </div>
          
          {questionCount > 0 && (
            <div className="space-y-2 pt-4 border-t border-primary/20">
              <p className="text-sm font-medium">Vista previa de preguntas:</p>
              {block.questions.slice(0, 3).map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                  <p className="line-clamp-1">{q.question}</p>
                </div>
              ))}
              {questionCount > 3 && (
                <p className="text-xs text-muted-foreground italic">
                  +{questionCount - 3} preguntas más...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
          <Play className="h-4 w-4" />
          Comenzar Quiz
        </button>
      </div>
    </div>
  )
}

// Assignment Block Preview
function AssignmentBlockPreview({ block }: { block: AssignmentBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {block.title && (
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {block.title}
          </h3>
        )}
        <Badge variant="secondary" className="text-xs">
          Tarea
        </Badge>
      </div>
      
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              📝 Instrucciones
            </h4>
            {block.description ? (
              <p className="text-sm leading-relaxed">{block.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No hay instrucciones proporcionadas
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3 pt-3 border-t border-orange-200 dark:border-orange-800">
            <Badge variant="outline" className="bg-background">
              📤 Tipo: {' '}
              {block.submissionType === 'text'
                ? 'Texto'
                : block.submissionType === 'file'
                  ? 'Archivo'
                  : 'Enlace'}
            </Badge>
            {block.maxScore && (
              <Badge variant="outline" className="bg-background">
                🎯 Puntos: {block.maxScore}
              </Badge>
            )}
            {block.dueDate && (
              <Badge variant="outline" className="bg-background">
                📅 Fecha límite
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
          <FileText className="h-4 w-4" />
          Entregar Tarea
        </button>
      </div>
    </div>
  )
}

// File Block Preview
function FileBlockPreview({ block }: { block: FileBlock }) {
  const getFileIcon = (filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'xls':
      case 'xlsx':
        return '📊'
      case 'ppt':
      case 'pptx':
        return '📋'
      default:
        return '📎'
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-6 border hover:bg-muted transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="text-3xl">{getFileIcon(block.filename || '')}</div>
          <div className="flex-1">
            <h4 className="font-medium">{block.filename || 'Archivo sin nombre'}</h4>
            {block.filesize && (
              <p className="text-sm text-muted-foreground">
                {(block.filesize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            {block.fileType && <p className="text-xs text-muted-foreground">{block.fileType}</p>}
          </div>
          <Download className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}

// Embed Block Preview
function EmbedBlockPreview({ block }: { block: EmbedBlock }) {
  if (!block.url) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Contenido embebido no configurado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {block.title && (
        <div>
          <h3 className="text-lg font-semibold">{block.title}</h3>
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <div
          className="bg-muted flex items-center justify-center"
          style={{ height: block.height || 400 }}
        >
          <div className="text-center space-y-4">
            <Link className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm text-muted-foreground">Contenido embebido</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">{block.url}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
