'use client'

import { VideoBlock } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Video } from 'lucide-react'

interface VideoBlockEditorProps {
  block: VideoBlock
  onUpdate: (updates: Partial<VideoBlock>) => void
  isActive: boolean
}

function getVideoEmbedUrl(url: string, provider?: string): string | null {
  if (!url) return null
  
  if (provider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  
  if (provider === 'vimeo' || url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) return `https://player.vimeo.com/video/${match[1]}`
  }
  
  return url
}

export function VideoBlockEditor({ block, onUpdate }: VideoBlockEditorProps) {
  const embedUrl = getVideoEmbedUrl(block.url, block.provider)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>URL del Video</Label>
          <Input
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        <div className="space-y-2">
          <Label>Plataforma</Label>
          <Select
            value={block.provider || 'youtube'}
            onValueChange={(value) => onUpdate({ provider: value as VideoBlock['provider'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="custom">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pie de video (opcional)</Label>
        <Input
          value={block.caption || ''}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Descripcion del video..."
        />
      </div>

      {embedUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <Video className="h-12 w-12 mb-2" />
          <p className="text-sm">Ingresa una URL de video para ver la vista previa</p>
        </div>
      )}
    </div>
  )
}
