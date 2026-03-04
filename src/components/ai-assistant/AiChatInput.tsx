'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_CHARS = 1000

interface AiChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
}

export function AiChatInput({ onSend, isLoading }: AiChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Re-focus textarea when loading finishes
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus()
    }
  }, [isLoading])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = value.length
  const nearLimit = charCount > MAX_CHARS * 0.9
  const overLimit = charCount > MAX_CHARS

  return (
    <div className="p-4 pt-2">
      <div
        className={cn(
          'rounded-2xl border bg-background transition-all duration-150',
          'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary',
          isLoading ? 'opacity-60 border-border' : 'border-border'
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          disabled={isLoading}
          rows={2}
          className={cn(
            'w-full resize-none bg-transparent',
            'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
            'text-sm px-4 pt-3 pb-2 min-h-[60px] max-h-[120px] overflow-y-auto',
          )}
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
          <span className="text-xs text-muted-foreground select-none hidden sm:block">
            Shift+Enter para nueva línea
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span
              className={cn(
                'text-xs tabular-nums select-none',
                overLimit
                  ? 'text-destructive font-medium'
                  : nearLimit
                    ? 'text-amber-500'
                    : 'text-muted-foreground'
              )}
            >
              {charCount}/{MAX_CHARS}
            </span>
            <Button
              onClick={handleSend}
              disabled={isLoading || !value.trim() || overLimit}
              size="icon"
              className="h-7 w-7 rounded-lg shrink-0"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
