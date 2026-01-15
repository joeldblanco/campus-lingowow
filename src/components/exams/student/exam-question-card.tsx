'use client'

import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuestionType } from '@prisma/client'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import type { Block } from '@/types/course-builder'
import {
  TrueFalseBlock as TrueFalseBlockComponent,
  FillBlankBlock,
  MatchingBlock,
  EssayBlock as EssayBlockComponent,
  ShortAnswerBlock as ShortAnswerBlockComponent,
  MultipleChoiceBlock as MultipleChoiceBlockComponent,
} from './question-blocks'

export interface ExamQuestionData {
  id: string
  type: QuestionType
  question: string
  options?: string[] | null
  multipleChoiceItems?: { id: string; question: string; options: { id: string; text: string }[]; correctOptionId?: string }[] | null
  originalBlockType?: string | null
  blockData?: {
    url?: string
    content?: string
    title?: string
    instruction?: string
    timeLimit?: number
    aiGrading?: boolean
    maxReplays?: number
    correctOptions?: { id: string; text: string }[]
    incorrectOptions?: { id: string; text: string }[]
  } | null
  points: number
  minLength?: number | null
  maxLength?: number | null
  audioUrl?: string | null
  groupId?: string | null
}

// Reconstruir un Block a partir de ExamQuestionData para usar BlockPreview
function reconstructBlock(question: ExamQuestionData): Block | null {
  const blockType = question.originalBlockType
  const data = question.blockData
  const baseBlock = {
    id: question.id,
    order: 0,
    points: question.points,
  }

  switch (blockType) {
    case 'title':
      return {
        ...baseBlock,
        type: 'title',
        title: data?.title || question.question,
      } as Block

    case 'text':
      return {
        ...baseBlock,
        type: 'text',
        content: data?.content || question.question,
      } as Block

    case 'audio':
      return {
        ...baseBlock,
        type: 'audio',
        url: data?.url || '',
        title: question.question,
        maxReplays: data?.maxReplays,
      } as Block

    case 'video':
      return {
        ...baseBlock,
        type: 'video',
        url: data?.url || '',
        title: question.question,
      } as Block

    case 'image':
      return {
        ...baseBlock,
        type: 'image',
        url: data?.url || '',
        alt: question.question,
      } as Block

    case 'recording':
      return {
        ...baseBlock,
        type: 'recording',
        instruction: data?.instruction || question.question,
        prompt: data?.instruction || question.question,
        timeLimit: data?.timeLimit || 60,
        aiGrading: data?.aiGrading,
      } as Block

    case 'multiple_choice':
      return {
        ...baseBlock,
        type: 'multiple_choice',
        items: question.multipleChoiceItems || [],
      } as Block

    case 'multi_select':
      return {
        ...baseBlock,
        type: 'multi_select',
        instruction: data?.instruction || question.question,
        correctOptions: data?.correctOptions || [],
        incorrectOptions: data?.incorrectOptions || [],
      } as Block

    case 'essay':
      return {
        ...baseBlock,
        type: 'essay',
        prompt: question.question,
        minWords: question.minLength || undefined,
        maxWords: question.maxLength || undefined,
      } as Block

    default:
      return null
  }
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
  // Si hay originalBlockType, usar BlockPreview para renderizar igual que en el Exam Builder
  if (question.originalBlockType) {
    const block = reconstructBlock(question)
    
    if (block) {
      const isContentOnly = ['title', 'text'].includes(question.originalBlockType)
      const isNonInteractive = ['title', 'text', 'audio', 'video', 'image'].includes(question.originalBlockType)
      
      return (
        <div className={cn(
          "bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700",
          isContentOnly && "border-dashed border-muted-foreground/30"
        )}>
          {!isNonInteractive && (
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
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
          )}
          <BlockPreview block={block} isExamMode={true} answer={answer} onAnswerChange={onAnswerChange} />
        </div>
      )
    }
  }

  const renderQuestionBlock = () => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <MultipleChoiceBlockComponent
            questionId={question.id}
            options={question.options || []}
            items={question.multipleChoiceItems || undefined}
            selectedOption={answer as string | Record<string, string> | null}
            onSelect={(option) => onAnswerChange(option)}
          />
        )
      case 'TRUE_FALSE':
        return (
          <TrueFalseBlockComponent
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
          <EssayBlockComponent
            value={(answer as string) || ''}
            onChange={(value) => onAnswerChange(value)}
            minWords={question.minLength || undefined}
            maxWords={question.maxLength || undefined}
          />
        )
      case 'SHORT_ANSWER':
        return (
          <ShortAnswerBlockComponent
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
