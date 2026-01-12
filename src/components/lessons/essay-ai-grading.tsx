'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { EssayFeedbackDisplay } from '@/components/exams/essay-feedback-display'
import type { EssayGradingResult } from '@/lib/services/essay-grading'
import { canUseAIGrading, recordAIGradingUsage } from '@/lib/actions/ai-grading-limits'

interface EssayAIGradingProps {
  essayText: string
  prompt: string
  blockId?: string // Block ID for classroom sync
  maxPoints?: number
  language?: 'english' | 'spanish'
  targetLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  onGraded?: (result: {
    pointsEarned: number
    feedback: string
    detailedResult: EssayGradingResult
  }) => void
  onSyncResponse?: (blockId: string, blockType: string, response: unknown, isCorrect?: boolean, score?: number) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  usageType?: 'essay_lesson' | 'essay_exam'
  entityId?: string
}

export function EssayAIGrading({
  essayText,
  prompt,
  blockId,
  maxPoints = 100,
  language = 'spanish',
  targetLevel = 'B1',
  onGraded,
  onSyncResponse,
  disabled = false,
  variant = 'default',
  size = 'default',
  className,
  usageType = 'essay_lesson',
  entityId,
}: EssayAIGradingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [gradingResult, setGradingResult] = useState<{
    pointsEarned: number
    feedback: string
    detailedResult: EssayGradingResult
  } | null>(null)
  const [usageInfo, setUsageInfo] = useState<{ allowed: boolean; remaining: number; limit: number } | null>(null)

  useEffect(() => {
    const checkUsage = async () => {
      const info = await canUseAIGrading(usageType)
      setUsageInfo(info)
    }
    checkUsage()
  }, [usageType])

  const handleGrade = async () => {
    if (!essayText.trim()) {
      toast.error('El ensayo está vacío')
      return
    }

    if (essayText.trim().split(/\s+/).length < 5) {
      toast.error('El ensayo es demasiado corto para ser evaluado')
      return
    }

    if (usageInfo && !usageInfo.allowed) {
      toast.error(`Has alcanzado el límite de ${usageInfo.limit} correcciones con IA este mes`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/lessons/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayText,
          prompt,
          maxPoints,
          language,
          targetLevel,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al calificar el ensayo')
      }

      const data = await response.json()
      
      await recordAIGradingUsage(usageType, entityId, 'block')
      
      if (usageInfo) {
        setUsageInfo({
          ...usageInfo,
          remaining: usageInfo.limit === -1 ? -1 : usageInfo.remaining - 1
        })
      }

      setGradingResult(data.gradingResult)
      setShowResult(true)
      
      if (onGraded) {
        onGraded(data.gradingResult)
      }

      // Sync response to teacher in classroom mode
      if (onSyncResponse && blockId) {
        const score = data.gradingResult.pointsEarned
        const isCorrect = score >= (maxPoints * 0.6) // 60% threshold for "correct"
        onSyncResponse(blockId, 'essay', {
          text: essayText,
          score,
          feedback: data.gradingResult.feedback,
        }, isCorrect, score)
      }

      toast.success('Ensayo calificado exitosamente')
    } catch (error) {
      console.error('Error grading essay:', error)
      toast.error(error instanceof Error ? error.message : 'Error al calificar el ensayo')
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = disabled || isLoading || !essayText.trim() || (usageInfo !== null && !usageInfo.allowed)

  return (
    <>
      <Button
        onClick={handleGrade}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Corrigiendo...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Enviar
          </>
        )}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resultado de la Calificación
            </DialogTitle>
          </DialogHeader>
          {gradingResult?.detailedResult && (
            <EssayFeedbackDisplay result={gradingResult.detailedResult} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
