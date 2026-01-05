'use client'

import { HeadingBlock } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface HeadingBlockEditorProps {
  block: HeadingBlock
  onUpdate: (updates: Partial<HeadingBlock>) => void
  isActive: boolean
}

export function HeadingBlockEditor({ block, onUpdate }: HeadingBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Select
          value={block.level}
          onValueChange={(value: 'h2' | 'h3' | 'h4') => onUpdate({ level: value })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h2">H2</SelectItem>
            <SelectItem value="h3">H3</SelectItem>
            <SelectItem value="h4">H4</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Texto del encabezado..."
          className={
            block.level === 'h2' ? 'text-2xl font-bold' :
            block.level === 'h3' ? 'text-xl font-semibold' :
            'text-lg font-medium'
          }
        />
      </div>
    </div>
  )
}
