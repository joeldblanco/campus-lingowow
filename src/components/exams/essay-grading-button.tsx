'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { EssayFeedbackDisplay } from './essay-feedback-display'
import type { EssayGradingResult } from '@/lib/services/essay-grading'

interface EssayGradingButtonProps {
  answerId: string
  essayText: string
  question: string
  maxPoints: number
  language?: 'english' | 'spanish'
  targetLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  onGraded?: (result: {
    pointsEarned: number
    feedback: string
  }) => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function EssayGradingButton({
  answerId,
  essayText,
  question,
  maxPoints,
  language = 'english',
  targetLevel = 'B1',
  onGraded,
  disabled = false,
  variant = 'default',
  size = 'default',
}: EssayGradingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [gradingResult, setGradingResult] = useState<{
    pointsEarned: number
    feedback: string
    detailedResult: EssayGradingResult
  } | null>(null)

  const handleGrade = async () => {
    if (!essayText.trim()) {
      toast.error('El ensayo está vacío')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/exams/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerId,
          essayText,
          question,
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
      setGradingResult(data.gradingResult)
      setShowResult(true)
      
      if (onGraded) {
        onGraded({
          pointsEarned: data.gradingResult.pointsEarned,
          feedback: data.gradingResult.feedback,
        })
      }

      toast.success('Ensayo calificado exitosamente')
    } catch (error) {
      console.error('Error grading essay:', error)
      toast.error(error instanceof Error ? error.message : 'Error al calificar el ensayo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleGrade}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Calificando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Calificar con IA
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
