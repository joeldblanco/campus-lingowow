'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FileSignature, Sparkles, Send, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveBlockResponse } from '@/lib/actions/block-responses'
import { EssayAIGrading as EssayAIGradingButton } from '@/components/lessons/essay-ai-grading'
import { toast } from 'sonner'

interface EssayBlockData {
  prompt?: string
  minWords?: number
  maxWords?: number
  aiGrading?: boolean
  aiGradingConfig?: {
    language?: string
    targetLevel?: string
  }
}

interface SavedResponse {
  response: string
  score?: number | null
  feedback?: string | null
  isCorrect?: boolean | null
  gradedAt?: string | null
}

interface InteractiveEssayBlockProps {
  blockId: string
  contentId: string
  block: EssayBlockData
  initialResponse?: SavedResponse
  onResponseSaved?: () => void
}

export function InteractiveEssayBlock({
  blockId,
  contentId,
  block,
  initialResponse,
  onResponseSaved
}: InteractiveEssayBlockProps) {
  const [text, setText] = useState(initialResponse?.response || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!initialResponse)
  const [feedback, setFeedback] = useState(initialResponse?.feedback || null)
  const [score, setScore] = useState(initialResponse?.score || null)

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
  const meetsMinWords = !block.minWords || wordCount >= block.minWords
  const exceedsMaxWords = block.maxWords && wordCount > block.maxWords

  useEffect(() => {
    if (initialResponse?.response) {
      setText(initialResponse.response)
      setFeedback(initialResponse.feedback || null)
      setScore(initialResponse.score || null)
      setIsSaved(true)
    }
  }, [initialResponse])

  const handleSave = useCallback(async () => {
    if (!meetsMinWords || !text.trim()) {
      toast.error('El ensayo no cumple con los requisitos mínimos')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveBlockResponse({
        contentId,
        blockId,
        blockType: 'essay',
        response: text,
        maxScore: 100
      })

      if (result.success) {
        setIsSaved(true)
        toast.success('Ensayo guardado correctamente')
        onResponseSaved?.()
      } else {
        toast.error(result.error || 'Error al guardar el ensayo')
      }
    } catch (error) {
      console.error('Error saving essay:', error)
      toast.error('Error al guardar el ensayo')
    } finally {
      setIsSaving(false)
    }
  }, [contentId, blockId, text, meetsMinWords, onResponseSaved])

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <FileSignature className="h-5 w-5" />
          <span>Ensayo</span>
        </div>
        <div className="flex items-center gap-2">
          {block.aiGrading && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              <span>Corrección con IA</span>
            </div>
          )}
          {isSaved && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
              <CheckCircle className="h-3 w-3" />
              <span>Guardado</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg text-foreground">{block.prompt || 'Escribe tu respuesta aquí...'}</h3>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {block.minWords && <span>Mínimo {block.minWords} palabras</span>}
          {block.maxWords && <span>Máximo {block.maxWords} palabras</span>}
          {block.aiGradingConfig?.targetLevel && (
            <span className="px-1.5 py-0.5 rounded bg-muted">Nivel: {block.aiGradingConfig.targetLevel}</span>
          )}
        </div>
      </div>

      <textarea
        className={cn(
          "w-full p-4 rounded-lg border bg-background min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y",
          exceedsMaxWords && "border-red-500 focus:ring-red-500/20"
        )}
        placeholder="Escribe tu respuesta..."
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setIsSaved(false)
        }}
      />

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className={cn(
          block.minWords && wordCount < block.minWords ? "text-red-500" : 
          exceedsMaxWords ? "text-red-500" : "text-green-600"
        )}>
          {wordCount} palabras
          {block.minWords && wordCount < block.minWords && ` (faltan ${block.minWords - wordCount})`}
          {exceedsMaxWords && ` (excede por ${wordCount - block.maxWords!})`}
        </span>
      </div>

      {feedback && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Retroalimentación
            {score !== null && <span className="ml-auto text-sm">Puntaje: {score}/100</span>}
          </h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">{feedback}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {block.aiGrading && isSaved && (
          <EssayAIGradingButton
            essayText={text}
            prompt={block.prompt || ''}
            language={block.aiGradingConfig?.language as 'english' | 'spanish' | undefined}
            targetLevel={block.aiGradingConfig?.targetLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | undefined}
            disabled={!meetsMinWords || !text.trim()}
          />
        )}
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={!meetsMinWords || exceedsMaxWords || isSaving || !text.trim()}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {isSaved ? 'Actualizar Ensayo' : 'Enviar Ensayo'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
