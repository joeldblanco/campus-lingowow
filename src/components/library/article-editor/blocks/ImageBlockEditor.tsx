'use client'

import { ImageBlock } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageBlockEditorProps {
  block: ImageBlock
  onUpdate: (updates: Partial<ImageBlock>) => void
  isActive: boolean
}

export function ImageBlockEditor({ block, onUpdate }: ImageBlockEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>URL de la Imagen</Label>
          <Input
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label>Texto alternativo</Label>
          <Input
            value={block.alt}
            onChange={(e) => onUpdate({ alt: e.target.value })}
            placeholder="Descripcion de la imagen..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pie de imagen (opcional)</Label>
          <Input
            value={block.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Titulo o descripcion..."
          />
        </div>
        <div className="space-y-2">
          <Label>Alineacion</Label>
          <Select
            value={block.alignment || 'center'}
            onValueChange={(value) => onUpdate({ alignment: value as ImageBlock['alignment'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Izquierda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Derecha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {block.url ? (
        <div className={`flex ${
          block.alignment === 'left' ? 'justify-start' :
          block.alignment === 'right' ? 'justify-end' :
          'justify-center'
        }`}>
          <figure className="max-w-lg">
            <div className="rounded-lg overflow-hidden border relative h-64">
              <Image
                src={block.url}
                alt={block.alt || 'Imagen del articulo'}
                className="object-contain"
                fill
                unoptimized
              />
            </div>
            {block.caption && (
              <figcaption className="text-sm text-muted-foreground text-center mt-2">
                {block.caption}
              </figcaption>
            )}
          </figure>
        </div>
      ) : (
        <div className="h-48 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p className="text-sm">Ingresa una URL para ver la imagen</p>
        </div>
      )}
    </div>
  )
}
