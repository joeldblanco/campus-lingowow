'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CircleDot,
  CheckCircle2,
  MessageSquare,
  FileSignature,
  Edit3,
  Shuffle,
  ArrowUpDown,
  GripHorizontal,
  Mic,
  Image as ImageIcon,
  GripVertical,
  Check,
} from 'lucide-react'
import Image from 'next/image'
import { ExamQuestion, QUESTION_TYPE_LABELS, QuestionValidationError } from './types'

const QUESTION_ICONS: Record<string, React.ElementType> = {
  multiple_choice: CircleDot,
  true_false: CheckCircle2,
  short_answer: MessageSquare,
  essay: FileSignature,
  fill_blanks: Edit3,
  matching: Shuffle,
  ordering: ArrowUpDown,
  drag_drop: GripHorizontal,
  audio_question: Mic,
  image_question: ImageIcon,
}

interface QuestionCanvasProps {
  title: string
  description: string
  questions: ExamQuestion[]
  selectedQuestionId: string | null
  onSelectQuestion: (id: string | null) => void
  onUpdateTitle: (title: string) => void
  onUpdateDescription: (description: string) => void
  readOnly?: boolean
  validationErrors?: QuestionValidationError[]
}

export function QuestionCanvas({
  title,
  description,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onUpdateTitle,
  onUpdateDescription,
  readOnly = false,
  validationErrors = [],
}: QuestionCanvasProps) {
  const { setNodeRef } = useDroppable({
    id: 'canvas-droppable',
  })

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)

  return (
    <div className="flex-1 h-full overflow-y-auto bg-muted/30">
      <div className="max-w-3xl mx-auto py-8 px-6">
        {/* Draft Mode Badge */}
        <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200">
          MODO BORRADOR
        </Badge>

        {/* Exam Header */}
        <div className="mb-8">
          {readOnly ? (
            <>
              <h1 className="text-3xl font-bold mb-2">{title || 'Sin título'}</h1>
              <p className="text-muted-foreground">{description || 'Sin descripción'}</p>
            </>
          ) : (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder="Título del Examen"
                className="text-3xl font-bold w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50"
              />
              <textarea
                value={description}
                onChange={(e) => onUpdateDescription(e.target.value)}
                placeholder="Descripción del examen..."
                className="w-full mt-2 bg-transparent border-none outline-none focus:ring-0 text-muted-foreground resize-none placeholder:text-muted-foreground/50"
                rows={2}
              />
            </>
          )}
        </div>

        {/* Questions List */}
        <div ref={setNodeRef} className="space-y-4 min-h-[200px]">
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((question, index) => (
              <SortableQuestionCard
                key={question.id}
                question={question}
                index={index}
                isSelected={selectedQuestionId === question.id}
                onSelect={() => onSelectQuestion(question.id)}
                readOnly={readOnly}
                errors={validationErrors.filter(e => e.questionIndex === index)}
              />
            ))}
          </SortableContext>

          {questions.length === 0 && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
              <p className="text-muted-foreground">
                Arrastra preguntas desde la biblioteca para comenzar
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        {questions.length > 0 && (
          <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
            {questions.length} pregunta{questions.length !== 1 ? 's' : ''} · {totalPoints} puntos
            totales
          </div>
        )}
      </div>
    </div>
  )
}

interface SortableQuestionCardProps {
  question: ExamQuestion
  index: number
  isSelected: boolean
  onSelect: () => void
  readOnly?: boolean
  errors?: QuestionValidationError[]
}

function SortableQuestionCard({
  question,
  index,
  isSelected,
  onSelect,
  readOnly,
  errors = [],
}: SortableQuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = QUESTION_ICONS[question.type] || CircleDot
  const typeLabel = QUESTION_TYPE_LABELS[question.type] || question.type

  const hasErrors = errors.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-question-index={index}
      className={cn(
        'bg-background rounded-lg border transition-all',
        isSelected && 'ring-2 ring-primary border-primary',
        isDragging && 'opacity-50 shadow-lg',
        !readOnly && 'cursor-pointer',
        hasErrors && !isSelected && 'border-red-500 ring-2 ring-red-200'
      )}
      onClick={onSelect}
    >
      {/* Question Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b bg-muted/30",
        hasErrors && "bg-red-50"
      )}>
        <div className="flex items-center gap-3">
          {!readOnly && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <span className="font-semibold text-primary">Q{index + 1}</span>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{typeLabel}</span>
          </div>
          {question.required !== false && (
            <span className="text-xs text-muted-foreground">Requerida</span>
          )}
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          {question.points} pts
        </Badge>
      </div>

      {/* Question Content Preview */}
      <div className="p-4">
        {isSelected && !readOnly && (
          <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-700 border-blue-200">
            EDITANDO
          </Badge>
        )}

        <p className="font-medium mb-4">
          {question.question || question.instruction || 'Sin pregunta definida'}
        </p>

        {/* Preview based on question type */}
        <QuestionPreview question={question} />

        {!readOnly && !hasErrors && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Vista previa del estudiante
          </p>
        )}

        {/* Validation Errors */}
        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            {errors.map((error, i) => (
              <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error.message}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionPreview({ question }: { question: ExamQuestion }) {
  switch (question.type) {
    case 'multiple_choice':
      // Use multipleChoiceItems if available, otherwise fall back to legacy options
      const items = question.multipleChoiceItems
      if (items && items.length > 0) {
        return (
          <div className="space-y-4">
            {items.map((item, itemIndex) => (
              <div key={item.id} className="space-y-2">
                {items.length > 1 && (
                  <p className="text-sm font-medium text-muted-foreground">
                    Pregunta {itemIndex + 1}: {item.question || 'Sin pregunta'}
                  </p>
                )}
                {items.length === 1 && item.question && (
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {item.question}
                  </p>
                )}
                {item.options?.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      option.id === item.correctOptionId
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2',
                        option.id === item.correctOptionId
                          ? 'border-green-500 bg-green-500'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {option.id === item.correctOptionId && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span>{option.text}</span>
                    {option.id === item.correctOptionId && (
                      <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Correcta
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      }
      // Legacy format fallback
      return (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                option.id === question.correctOptionId
                  ? 'bg-green-50 border-green-200'
                  : 'bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2',
                  option.id === question.correctOptionId
                    ? 'border-green-500 bg-green-500'
                    : 'border-muted-foreground/30'
                )}
              >
                {option.id === question.correctOptionId && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <span>{option.text}</span>
              {option.id === question.correctOptionId && (
                <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                  <Check className="h-3 w-3 mr-1" />
                  Correcta
                </Badge>
              )}
            </div>
          ))}
        </div>
      )

    case 'true_false':
      return (
        <div className="space-y-2">
          {['Verdadero', 'Falso'].map((option) => {
            const isCorrect =
              (option === 'Verdadero' && question.correctAnswer === true) ||
              (option === 'Falso' && question.correctAnswer === false)
            return (
              <div
                key={option}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  isCorrect ? 'bg-green-50 border-green-200' : 'bg-muted/30'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2',
                    isCorrect ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'
                  )}
                />
                <span>{option}</span>
                {isCorrect && (
                  <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                    <Check className="h-3 w-3 mr-1" />
                    Correcta
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )

    case 'short_answer':
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/30">
            <input
              type="text"
              placeholder="Escribe tu respuesta aquí..."
              className="w-full bg-transparent border-none outline-none"
              disabled
            />
          </div>
          {question.correctAnswers && question.correctAnswers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Respuestas aceptadas: {question.correctAnswers.join(', ')}
            </p>
          )}
        </div>
      )

    case 'essay':
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/30 min-h-[100px]">
            <p className="text-muted-foreground text-sm">Área de respuesta del estudiante...</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {question.minWords && <span>Mínimo: {question.minWords} palabras</span>}
            {question.maxWords && <span>Máximo: {question.maxWords} palabras</span>}
          </div>
        </div>
      )

    case 'fill_blanks':
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="leading-relaxed">
            {question.content?.split(/\[([^\]]+)\]/).map((part, i) =>
              i % 2 === 0 ? (
                <span key={i}>{part}</span>
              ) : (
                <span
                  key={i}
                  className="inline-block px-3 py-1 mx-1 bg-primary/10 text-primary rounded border border-primary/30 font-medium"
                >
                  {part}
                </span>
              )
            )}
          </p>
        </div>
      )

    case 'matching':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {question.pairs?.map((pair) => (
              <div key={pair.id} className="p-2 rounded border bg-muted/30 text-sm">
                {pair.left}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {question.pairs?.map((pair) => (
              <div key={pair.id} className="p-2 rounded border bg-primary/10 text-sm">
                {pair.right}
              </div>
            ))}
          </div>
        </div>
      )

    case 'ordering':
      return (
        <div className="space-y-2">
          {question.items?.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )

    case 'drag_drop':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {question.categories?.map((cat) => (
              <div key={cat.id} className="p-3 rounded-lg border-2 border-dashed min-h-[80px]">
                <p className="font-medium text-sm mb-2">{cat.name}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {question.dragItems?.map((item) => (
              <div key={item.id} className="px-3 py-1.5 rounded bg-primary/10 text-sm">
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )

    case 'audio_question':
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-lg border bg-muted/30 flex items-center gap-3">
            <Mic className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Audio adjunto</p>
              <p className="text-xs text-muted-foreground">
                {question.maxPlays ? `Máximo ${question.maxPlays} reproducciones` : 'Sin límite'}
              </p>
            </div>
          </div>
        </div>
      )

    case 'image_question':
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-center min-h-[120px]">
            {question.imageUrl ? (
              <Image
                src={question.imageUrl}
                alt="Imagen de la pregunta"
                width={300}
                height={200}
                className="max-h-[200px] rounded object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Sin imagen</p>
              </div>
            )}
          </div>
        </div>
      )

    default:
      return <p className="text-muted-foreground text-sm">Vista previa no disponible</p>
  }
}
