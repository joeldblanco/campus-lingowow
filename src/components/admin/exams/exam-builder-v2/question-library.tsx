'use client'

import { Card } from '@/components/ui/card'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Trash2, CircleDot, CheckCircle2, MessageSquare, FileSignature, Edit3, Shuffle, ArrowUpDown, GripHorizontal, Mic, Image as ImageIcon } from 'lucide-react'

export interface QuestionTemplate {
  type: string
  label: string
  icon: React.ElementType
  description: string
  category: 'standard' | 'interactive' | 'media'
  defaultData: Record<string, unknown>
}

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Standard Types
  {
    type: 'multiple_choice',
    label: 'Opción Múltiple',
    icon: CircleDot,
    description: 'Pregunta con opciones de respuesta',
    category: 'standard',
    defaultData: {
      type: 'multiple_choice',
      question: '¿Cuál es la respuesta correcta?',
      options: [
        { id: 'opt1', text: 'Opción A' },
        { id: 'opt2', text: 'Opción B' },
        { id: 'opt3', text: 'Opción C' },
        { id: 'opt4', text: 'Opción D' },
      ],
      correctOptionId: 'opt1',
      points: 10,
      explanation: '',
    },
  },
  {
    type: 'true_false',
    label: 'Verdadero / Falso',
    icon: CheckCircle2,
    description: 'Pregunta de verdadero o falso',
    category: 'standard',
    defaultData: {
      type: 'true_false',
      question: 'Esta afirmación es verdadera o falsa.',
      correctAnswer: true,
      points: 5,
      explanation: '',
    },
  },
  {
    type: 'short_answer',
    label: 'Respuesta Corta',
    icon: MessageSquare,
    description: 'Pregunta con respuesta de texto breve',
    category: 'standard',
    defaultData: {
      type: 'short_answer',
      question: 'Escribe tu respuesta:',
      correctAnswers: ['respuesta'],
      caseSensitive: false,
      points: 10,
      explanation: '',
    },
  },
  {
    type: 'essay',
    label: 'Ensayo',
    icon: FileSignature,
    description: 'Pregunta de desarrollo o ensayo',
    category: 'standard',
    defaultData: {
      type: 'essay',
      question: 'Desarrolla tu respuesta sobre el siguiente tema:',
      minWords: 50,
      maxWords: 500,
      points: 20,
      rubric: '',
    },
  },
  // Interactive
  {
    type: 'fill_blanks',
    label: 'Rellenar Espacios',
    icon: Edit3,
    description: 'Completar oraciones con palabras faltantes',
    category: 'interactive',
    defaultData: {
      type: 'fill_blanks',
      instruction: 'Completa las oraciones con las palabras correctas.',
      content: 'El cielo es [azul] y el pasto es [verde].',
      points: 10,
      caseSensitive: false,
    },
  },
  {
    type: 'matching',
    label: 'Emparejar',
    icon: Shuffle,
    description: 'Conectar elementos relacionados',
    category: 'interactive',
    defaultData: {
      type: 'matching',
      instruction: 'Une cada elemento con su pareja correcta.',
      pairs: [
        { id: 'pair1', left: 'Elemento A', right: 'Pareja A' },
        { id: 'pair2', left: 'Elemento B', right: 'Pareja B' },
        { id: 'pair3', left: 'Elemento C', right: 'Pareja C' },
      ],
      points: 10,
    },
  },
  {
    type: 'ordering',
    label: 'Ordenar',
    icon: ArrowUpDown,
    description: 'Ordenar elementos en secuencia',
    category: 'interactive',
    defaultData: {
      type: 'ordering',
      instruction: 'Ordena los elementos en la secuencia correcta.',
      items: [
        { id: 'item1', text: 'Primero', correctPosition: 0 },
        { id: 'item2', text: 'Segundo', correctPosition: 1 },
        { id: 'item3', text: 'Tercero', correctPosition: 2 },
      ],
      points: 10,
    },
  },
  {
    type: 'drag_drop',
    label: 'Arrastrar y Soltar',
    icon: GripHorizontal,
    description: 'Clasificar elementos en categorías',
    category: 'interactive',
    defaultData: {
      type: 'drag_drop',
      instruction: 'Arrastra cada elemento a la categoría correcta.',
      categories: [
        { id: 'cat1', name: 'Categoría A' },
        { id: 'cat2', name: 'Categoría B' },
      ],
      items: [
        { id: 'item1', text: 'Elemento 1', correctCategoryId: 'cat1' },
        { id: 'item2', text: 'Elemento 2', correctCategoryId: 'cat2' },
      ],
      points: 10,
    },
  },
  // Media Questions
  {
    type: 'audio_question',
    label: 'Audio',
    icon: Mic,
    description: 'Pregunta con audio adjunto',
    category: 'media',
    defaultData: {
      type: 'audio_question',
      question: 'Escucha el audio y responde:',
      audioUrl: '',
      maxPlays: 2,
      questionType: 'multiple_choice',
      options: [
        { id: 'opt1', text: 'Opción A' },
        { id: 'opt2', text: 'Opción B' },
      ],
      correctOptionId: 'opt1',
      points: 10,
    },
  },
  {
    type: 'image_question',
    label: 'Imagen',
    icon: ImageIcon,
    description: 'Pregunta con imagen adjunta',
    category: 'media',
    defaultData: {
      type: 'image_question',
      question: 'Observa la imagen y responde:',
      imageUrl: '',
      questionType: 'multiple_choice',
      options: [
        { id: 'opt1', text: 'Opción A' },
        { id: 'opt2', text: 'Opción B' },
      ],
      correctOptionId: 'opt1',
      points: 10,
    },
  },
]

export function QuestionLibrary() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'cancel-zone',
    data: {
      accepts: ['sortable-question'],
    },
  })

  const standardTypes = QUESTION_TEMPLATES.filter((t) => t.category === 'standard')
  const interactiveTypes = QUESTION_TEMPLATES.filter((t) => t.category === 'interactive')
  const mediaTypes = QUESTION_TEMPLATES.filter((t) => t.category === 'media')

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-64 border-r bg-background flex flex-col shrink-0 z-10 h-full transition-colors relative',
        isOver && 'bg-destructive/10 border-destructive'
      )}
    >
      {isOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-[1px] text-destructive animate-in fade-in duration-200">
          <Trash2 className="w-12 h-12 mb-2" />
          <span className="font-bold text-lg">Soltar para eliminar</span>
        </div>
      )}

      <div className="p-4 border-b">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Biblioteca de Preguntas
        </h2>
        <p className="text-xs text-muted-foreground">Arrastra preguntas al lienzo</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Standard Types */}
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
            Tipos Estándar
          </h3>
          <div className="flex flex-col gap-2">
            {standardTypes.map((template) => (
              <DraggableQuestion key={template.type} template={template} />
            ))}
          </div>
        </div>

        {/* Interactive */}
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
            Interactivo
          </h3>
          <div className="flex flex-col gap-2">
            {interactiveTypes.map((template) => (
              <DraggableQuestion key={template.type} template={template} />
            ))}
          </div>
        </div>

        {/* Media Questions */}
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
            Preguntas con Medios
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {mediaTypes.map((template) => (
              <DraggableQuestion key={template.type} template={template} variant="grid" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DraggableQuestion({
  template,
  variant = 'list',
  onClick,
  disableDrag,
}: {
  template: QuestionTemplate
  variant?: 'grid' | 'list'
  onClick?: () => void
  disableDrag?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${template.type}`,
    data: {
      type: 'new-question',
      template,
    },
    disabled: disableDrag,
  })

  const IconComponent = template.icon

  if (variant === 'grid') {
    return (
      <Card
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={cn(
          'p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-primary hover:shadow-md transition-all active:cursor-grabbing',
          isDragging && 'opacity-50',
          disableDrag && 'cursor-pointer active:cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className="text-muted-foreground group-hover:text-primary">
          <IconComponent className="size-6" />
        </div>
        <span className="text-xs font-medium text-center">{template.label}</span>
      </Card>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50',
        disableDrag && 'cursor-pointer active:cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="text-muted-foreground">
        <IconComponent className="size-5" />
      </div>
      <span className="text-sm font-medium">{template.label}</span>
    </div>
  )
}
