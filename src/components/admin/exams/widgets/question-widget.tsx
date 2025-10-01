'use client'

import { CreateExamQuestionData } from '@/types/exam'
import { QuestionWidgetBase } from './question-widget-base'
import { MultipleChoiceWidget } from './multiple-choice-widget'
import { TrueFalseWidget } from './true-false-widget'
import { ShortAnswerWidget } from './short-answer-widget'
import { EssayWidget } from './essay-widget'

interface QuestionWidgetProps {
  question: CreateExamQuestionData
  index: number
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
  onDelete: () => void
  onDuplicate: () => void
  dragHandleProps?: Record<string, unknown>
}

export function QuestionWidget({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: QuestionWidgetProps) {
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceWidget question={question} onUpdate={onUpdate} />
      case 'TRUE_FALSE':
        return <TrueFalseWidget question={question} onUpdate={onUpdate} />
      case 'SHORT_ANSWER':
        return <ShortAnswerWidget question={question} onUpdate={onUpdate} />
      case 'ESSAY':
        return <EssayWidget question={question} onUpdate={onUpdate} />
      case 'FILL_BLANK':
        return <ShortAnswerWidget question={question} onUpdate={onUpdate} />
      default:
        return (
          <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
            Tipo de pregunta no soportado: {question.type}
          </div>
        )
    }
  }

  return (
    <QuestionWidgetBase
      question={question}
      index={index}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
    >
      {renderQuestionContent()}
    </QuestionWidgetBase>
  )
}
