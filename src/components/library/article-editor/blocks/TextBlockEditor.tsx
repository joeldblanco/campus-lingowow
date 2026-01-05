'use client'

import { TextBlock } from '@/lib/types/article-blocks'
import { Textarea } from '@/components/ui/textarea'

interface TextBlockEditorProps {
  block: TextBlock
  onUpdate: (updates: Partial<TextBlock>) => void
  isActive: boolean
}

export function TextBlockEditor({ block, onUpdate }: TextBlockEditorProps) {
  return (
    <div className="space-y-2">
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="Escribe el contenido del párrafo..."
        className="min-h-[100px] resize-y"
        rows={4}
      />
      <p className="text-xs text-muted-foreground">
        Puedes usar formato básico: **negrita**, *cursiva*, [enlace](url)
      </p>
    </div>
  )
}
