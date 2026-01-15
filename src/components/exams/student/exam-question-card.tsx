'use client'

import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuestionType } from '@prisma/client'
import {
  MultipleChoiceBlock,
  TrueFalseBlock,
  FillBlankBlock,
  MatchingBlock,
  EssayBlock,
  ShortAnswerBlock
} from './question-blocks'

export interface ExamQuestionData {
  id: string
  type: QuestionType
  question: string
  options?: string[] | null
  multipleChoiceItems?: { id: string; question: string; options: { id: string; text: string }[] }[] | null
  originalBlockType?: string | null
  blockData?: {
    url?: string
    content?: string
    title?: string
    instruction?: string
    timeLimit?: number
    aiGrading?: boolean
    maxReplays?: number
  } | null
  points: number
  minLength?: number | null
  maxLength?: number | null
  audioUrl?: string | null
}

interface ExamQuestionCardProps {
  questionNumber: number
  question: ExamQuestionData
  answer: unknown
  onAnswerChange: (answer: unknown) => void
  isFlagged: boolean
  onToggleFlag: () => void
  sectionTitle?: string
}

export function ExamQuestionCard({
  questionNumber,
  question,
  answer,
  onAnswerChange,
  isFlagged,
  onToggleFlag,
  sectionTitle
}: ExamQuestionCardProps) {
  // Renderizar bloques no interactivos (contenido informativo)
  const renderNonInteractiveBlock = () => {
    const blockType = question.originalBlockType
    const data = question.blockData

    switch (blockType) {
      case 'title':
        return (
          <div className="py-4">
            <h2 className="text-2xl font-bold text-foreground">
              {data?.title || question.question}
            </h2>
          </div>
        )
      case 'text':
        return (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: data?.content || question.question }}
          />
        )
      case 'audio':
        return (
          <div className="space-y-4">
            {question.question && (
              <p className="text-lg font-medium">{question.question}</p>
            )}
            {data?.url && (
              <audio controls className="w-full">
                <source src={data.url} type="audio/mpeg" />
                Tu navegador no soporta el elemento de audio.
              </audio>
            )}
            {data?.maxReplays && (
              <p className="text-sm text-muted-foreground">
                Máximo de reproducciones: {data.maxReplays}
              </p>
            )}
          </div>
        )
      case 'video':
        return (
          <div className="space-y-4">
            {question.question && (
              <p className="text-lg font-medium">{question.question}</p>
            )}
            {data?.url && (
              <video controls className="w-full rounded-lg">
                <source src={data.url} type="video/mp4" />
                Tu navegador no soporta el elemento de video.
              </video>
            )}
          </div>
        )
      case 'image':
        return (
          <div className="space-y-4">
            {question.question && (
              <p className="text-lg font-medium">{question.question}</p>
            )}
            {data?.url && (
              <img 
                src={data.url} 
                alt={question.question || 'Imagen del examen'}
                className="max-w-full rounded-lg"
              />
            )}
          </div>
        )
      case 'recording':
        return (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="font-semibold">Grabación de Audio</span>
            </div>
            {(data?.instruction || question.question) && (
              <p className="text-foreground">{data?.instruction || question.question}</p>
            )}
            {data?.timeLimit && (
              <p className="text-sm text-muted-foreground">
                Tiempo límite: {data.timeLimit} segundos
              </p>
            )}
            <div className="p-4 bg-background rounded border border-dashed border-muted-foreground/30 text-center text-muted-foreground">
              [Aquí aparecerá el grabador de audio]
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Si es un bloque no interactivo, renderizarlo de forma especial
  if (question.originalBlockType && ['title', 'text', 'audio', 'video', 'image', 'recording'].includes(question.originalBlockType)) {
    const isContentOnly = question.originalBlockType === 'title' || question.originalBlockType === 'text'
    
    return (
      <div className={cn(
        "bg-white dark:bg-[#1a2632] rounded-xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700",
        isContentOnly && "border-dashed border-muted-foreground/30"
      )}>
        {renderNonInteractiveBlock()}
      </div>
    )
  }

  const renderQuestionBlock = () => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <MultipleChoiceBlock
            questionId={question.id}
            options={question.options || []}
            items={question.multipleChoiceItems || undefined}
            selectedOption={answer as string | Record<string, string> | null}
            onSelect={(option) => onAnswerChange(option)}
          />
        )
      case 'TRUE_FALSE':
        return (
          <TrueFalseBlock
            questionId={question.id}
            selectedOption={answer as boolean | null}
            onSelect={(value) => onAnswerChange(value)}
          />
        )
      case 'FILL_BLANK':
        return (
          <FillBlankBlock
            sentence={question.question}
            value={(answer as string) || ''}
            onChange={(value) => onAnswerChange(value)}
          />
        )
      case 'MATCHING':
        return (
          <MatchingBlock
            items={(question.options || []).map((opt, i) => ({ id: `${i}`, term: opt }))}
            options={question.options || []}
            matches={(answer as Record<string, string>) || {}}
            onMatch={(itemId, option) => {
              const currentMatches = (answer as Record<string, string>) || {}
              onAnswerChange({ ...currentMatches, [itemId]: option })
            }}
          />
        )
      case 'ESSAY':
        return (
          <EssayBlock
            value={(answer as string) || ''}
            onChange={(value) => onAnswerChange(value)}
            minWords={question.minLength || undefined}
            maxWords={question.maxLength || undefined}
          />
        )
      case 'SHORT_ANSWER':
        return (
          <ShortAnswerBlock
            value={(answer as string) || ''}
            onChange={(value) => onAnswerChange(value)}
          />
        )
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            Tipo de pregunta no soportado: {question.type}
          </div>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-[#1a2632] rounded-xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700 relative group transition-all hover:shadow-md">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFlag}
          className={cn(
            "h-8 px-2",
            isFlagged && "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
          )}
        >
          <Flag className={cn("h-4 w-4", isFlagged && "fill-yellow-500")} />
        </Button>
        <span className="text-sm font-medium text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
          {question.points} pts
        </span>
      </div>

      <div className="space-y-4">
        {sectionTitle && (
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {sectionTitle}
          </span>
        )}
        <h3 className="text-primary text-sm font-bold uppercase tracking-wider">
          Pregunta {questionNumber}
        </h3>

        {question.type !== 'FILL_BLANK' && (
          <p className="text-lg text-foreground font-medium leading-relaxed">
            {question.question}
          </p>
        )}

        {question.audioUrl && (
          <div className="my-4">
            <audio controls className="w-full">
              <source src={question.audioUrl} type="audio/mpeg" />
              Tu navegador no soporta el elemento de audio.
            </audio>
          </div>
        )}

        <div className="mt-6">
          {renderQuestionBlock()}
        </div>
      </div>
    </div>
  )
}
