'use client'

import { DividerBlock } from '@/lib/types/article-blocks'

interface DividerBlockEditorProps {
  block: DividerBlock
  onUpdate: (updates: Partial<DividerBlock>) => void
  isActive: boolean
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DividerBlockEditor(props: DividerBlockEditorProps) {
  return (
    <div className="py-4">
      <hr className="border-t-2 border-muted" />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Separador de secciones
      </p>
    </div>
  )
}
