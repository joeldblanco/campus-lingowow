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
import { RecordingFeedbackDisplay } from '@/components/lessons/recording-feedback-display'
import type { RecordingGradingResult } from '@/lib/services/recording-grading'
import { canUseAIGrading, recordAIGradingUsage } from '@/lib/actions/ai-grading-limits'

interface RecordingAIGradingProps {
  audioUrl: string
  instruction: string
  blockId?: string
  maxPoints?: number
  language?: 'english' | 'spanish'
  targetLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  onGraded?: (result: {
    pointsEarned: number
    feedback: string
    transcription: string
    detailedResult: RecordingGradingResult
  }) => void
  onSyncResponse?: (blockId: string, blockType: string, response: unknown, isCorrect?: boolean, score?: number) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  entityId?: string
}

export function RecordingAIGrading({
  audioUrl,
  instruction,
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
  entityId,
}: RecordingAIGradingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [gradingResult, setGradingResult] = useState<{
    pointsEarned: number
    feedback: string
    transcription: string
    detailedResult: RecordingGradingResult
  } | null>(null)
  const [usageInfo, setUsageInfo] = useState<{ allowed: boolean; remaining: number; limit: number } | null>(null)

  useEffect(() => {
    const checkUsage = async () => {
      const info = await canUseAIGrading('recording')
      setUsageInfo(info)
    }
    checkUsage()
  }, [])

  const handleGrade = async () => {
    if (!audioUrl) {
      toast.error('No hay grabación para evaluar')
      return
    }

    if (usageInfo && !usageInfo.allowed) {
      toast.error(`Has alcanzado el límite de ${usageInfo.limit} correcciones de audio este mes`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/lessons/grade-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          instruction,
          maxPoints,
          language,
          targetLevel,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al calificar la grabación')
      }

      const data = await response.json()
      
      await recordAIGradingUsage('recording', entityId, 'block')
      
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

      if (onSyncResponse && blockId) {
        const score = data.gradingResult.pointsEarned
        const isCorrect = score >= (maxPoints * 0.6)
        onSyncResponse(blockId, 'recording', {
          audioUrl,
          score,
          feedback: data.gradingResult.feedback,
          transcription: data.gradingResult.transcription,
        }, isCorrect, score)
      }

      toast.success('Grabación evaluada exitosamente')
    } catch (error) {
      console.error('Error grading recording:', error)
      toast.error(error instanceof Error ? error.message : 'Error al calificar la grabación')
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = disabled || isLoading || !audioUrl || (usageInfo !== null && !usageInfo.allowed)

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
            Evaluando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Evaluar con IA
          </>
        )}
      </Button>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resultado de la Evaluación
            </DialogTitle>
          </DialogHeader>
          {gradingResult?.detailedResult && (
            <RecordingFeedbackDisplay result={gradingResult.detailedResult} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
