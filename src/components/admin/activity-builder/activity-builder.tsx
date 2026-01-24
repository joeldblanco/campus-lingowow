'use client'

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { AlertCircle, ArrowLeft, ArrowRightLeft, ArrowUpDown, CheckCircle, Eye, EyeOff, Loader2, Plus, Type } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ActivityRenderer } from '@/components/activities/activity-renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ActivitySettingsSidebar } from './activity-settings-sidebar'
import { QuestionBlock } from './question-block'
import {
  ActivityQuestion,
  ActivitySettings,
  createDefaultQuestion,
  DEFAULT_ACTIVITY_SETTINGS,
  QUESTION_TYPES,
  QuestionType,
} from './types'

interface ActivityBuilderProps {
  activityId: string
  initialData?: {
    title: string
    description: string
    questions: ActivityQuestion[]
    settings: ActivitySettings
    isPublished?: boolean
  }
}

export function ActivityBuilder({ activityId, initialData }: ActivityBuilderProps) {
  const { data: session } = useSession()
  const router = useRouter()

  // Activity data
  const [title, setTitle] = useState(initialData?.title || '')
  const [questions, setQuestions] = useState<ActivityQuestion[]>(initialData?.questions || [])
  const [settings, setSettings] = useState<ActivitySettings>(
    initialData?.settings || DEFAULT_ACTIVITY_SETTINGS
  )

  // UI State
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [isQuestionTypeModalOpen, setIsQuestionTypeModalOpen] = useState(false)
  const [isPublished, setIsPublished] = useState(initialData?.isPublished || false)
  const isFirstRender = useRef(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save logic
  const debouncedSave = useCallback(
    async (activityData: {
      title: string
      description: string
      activityType: string
      level: number
      points: number
      duration: number
      isPublished: boolean
      tags: string[]
      questions: ActivityQuestion[]
      createdById?: string
    }) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/activities/${activityId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activityData),
          })

          if (!response.ok) {
            throw new Error('Error al guardar la actividad')
          }

          setLastSaved(new Date())
          setSaveStatus('saved')
        } catch (error) {
          console.error('Error saving activity:', error)
          setSaveStatus('error')
          toast.error('Error al guardar automáticamente')
        }
      }, 1500)
    },
    [activityId]
  )

  // Auto-save on data changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Only auto-save if we have a title and at least one question
    if (title.trim() && questions.length > 0) {
      const activityData = {
        title,
        description: settings.description,
        activityType: 'VOCABULARY',
        level:
          settings.difficulty === 'beginner' ? 1 : settings.difficulty === 'intermediate' ? 2 : 3,
        points: questions.length * 10,
        duration: Math.max(5, questions.length * 2),
        isPublished, // Preserve current published status during auto-save
        tags: settings.tags,
        questions: questions.map((q, index) => ({
          ...q,
          order: index,
        })),
        createdById: session?.user?.id,
      }
      debouncedSave(activityData)
    }
  }, [title, questions, settings, debouncedSave, session?.user?.id, isPublished])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for reordering questions
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id)
        const newIndex = questions.findIndex((q) => q.id === over.id)

        const newQuestions = arrayMove(questions, oldIndex, newIndex).map((q, index) => ({
          ...q,
          order: index,
        }))

        setQuestions(newQuestions)
      }
    },
    [questions]
  )

  // Add a new question
  const handleAddQuestion = useCallback(
    (type: QuestionType = 'multiple_choice') => {
      const newQuestion = createDefaultQuestion(type, questions.length)
      setQuestions((prev) => [...prev, newQuestion])
    },
    [questions.length]
  )

  // Update a question
  const handleUpdateQuestion = useCallback((updatedQuestion: ActivityQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)))
  }, [])

  // Delete a question
  const handleDeleteQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }, [])

  // Duplicate a question
  const handleDuplicateQuestion = useCallback(
    (question: ActivityQuestion) => {
      const duplicated: ActivityQuestion = {
        ...question,
        id: `q-${Date.now()}-dup`,
        order: questions.length,
      }
      setQuestions((prev) => [...prev, duplicated])
    },
    [questions.length]
  )

  // Change question type
  const handleTypeChange = useCallback((questionId: string, newType: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return createDefaultQuestion(newType, q.order)
        }
        return q
      })
    )
  }, [])

  // Handle question type selection from modal
  const handleQuestionTypeSelect = useCallback(
    (type: QuestionType) => {
      handleAddQuestion(type)
      setIsQuestionTypeModalOpen(false)
    },
    [handleAddQuestion]
  )

  // Validate if a question is complete
  const isQuestionComplete = (question: ActivityQuestion): boolean => {
    switch (question.type) {
      case 'multiple_choice': {
        const hasQuestionText = Boolean(question.questionText?.trim())
        const hasOptions = Boolean(question.options && question.options.length >= 2)
        const hasCorrectAnswer = Boolean(question.options?.some((opt) => opt.isCorrect))
        const allOptionsHaveText = Boolean(question.options?.every((opt) => opt.text.trim()))
        return hasQuestionText && hasOptions && hasCorrectAnswer && allOptionsHaveText
      }

      case 'fill_blanks': {
        const hasSentence = !!question.sentenceWithBlanks?.trim()
        const hasBlanks = !!(question.blanks && question.blanks.length > 0)
        return hasSentence && hasBlanks
      }

      case 'matching_pairs': {
        const hasPairs = !!(question.pairs && question.pairs.length >= 2)
        const allPairsComplete = !!question.pairs?.every(
          (pair) => pair.left.trim() && pair.right.trim()
        )
        return hasPairs && allPairsComplete
      }

      case 'sentence_unscramble':
        return !!question.correctSentence?.trim()

      default:
        return false
    }
  }

  // Get incomplete questions
  const getIncompleteQuestions = (): number[] => {
    return questions
      .map((q, index) => ({ question: q, index }))
      .filter(({ question }) => !isQuestionComplete(question))
      .map(({ index }) => index + 1)
  }

  // Save activity
  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('Por favor ingresa un nombre para la actividad')
      return
    }

    if (questions.length === 0) {
      toast.error('Por favor agrega al menos una pregunta')
      return
    }

    // Validate incomplete questions
    const incompleteQuestions = getIncompleteQuestions()
    if (incompleteQuestions.length > 0) {
      if (incompleteQuestions.length === 1) {
        toast.error(
          `La pregunta ${incompleteQuestions[0]} está incompleta. Por favor completa todos los campos requeridos.`
        )
      } else {
        toast.error(
          `Las preguntas ${incompleteQuestions.join(', ')} están incompletas. Por favor completa todos los campos requeridos.`
        )
      }
      return
    }

    setIsSaving(true)

    try {
      const activityData = {
        title,
        description: settings.description,
        activityType: 'VOCABULARY', // Default type
        level:
          settings.difficulty === 'beginner' ? 1 : settings.difficulty === 'intermediate' ? 2 : 3,
        points: questions.length * 10,
        duration: Math.max(5, questions.length * 2),
        isPublished: publish,
        tags: settings.tags,
        questions: questions.map((q, index) => ({
          ...q,
          order: index,
        })),
        createdById: session?.user?.id,
      }

      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      })

      if (!response.ok) {
        throw new Error('Error al guardar la actividad')
      }

      setLastSaved(new Date())
      toast.success(
        publish ? 'Actividad publicada exitosamente' : 'Actividad despublicada exitosamente'
      )

      // Actualizar estado de publicación
      setIsPublished(publish)

      // En modo edición, mantenerse en la página actual
    } catch (error) {
      console.error('Error saving activity:', error)
      toast.error('Error al guardar la actividad')
    } finally {
      setIsSaving(false)
    }
  }

  const formatLastSaved = () => {
    if (saveStatus === 'saving') return 'Guardando...'
    if (saveStatus === 'error') return 'Error al guardar'
    if (!lastSaved) return 'Borrador'
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 60000)
    if (diff < 1) return 'Guardado hace un momento'
    return `Guardado hace ${diff} min`
  }
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => router.back()}
                title="Volver atrás"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* Logo Icon */}
              <div className="flex items-center justify-center size-9 rounded-lg bg-primary text-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                    Activity Builder
                  </h1>
                  {saveStatus === 'saving' && (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  )}
                  {saveStatus === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {saveStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatLastSaved()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Preview Button */}
              <Button
                variant={showPreview ? 'default' : 'ghost'}
                size="icon"
                className="size-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                title={showPreview ? 'Editar' : 'Vista Previa'}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-600" />
                )}
              </Button>

              {/* Publish Button */}
              <Button
                onClick={() => handleSave(!isPublished)}
                disabled={isSaving}
                className={`h-9 px-4 text-sm font-medium rounded-lg ${
                  isPublished
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }`}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isPublished ? 'Despublicar Actividad' : 'Publicar Actividad'}
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      {showPreview ? (
        <div className="flex-1 max-w-[900px] mx-auto w-full p-4 sm:p-6 lg:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Modo Vista Previa — Así es como los estudiantes verán la actividad
              </p>
            </div>
            {questions.length > 0 ? (
              <ActivityRenderer
                activity={{
                  id: 'preview',
                  title: title || 'Untitled Activity',
                  description: settings.description,
                  questions: questions,
                  difficulty: settings.difficulty,
                  tags: settings.tags,
                  points: questions.length * 10,
                }}
                onClose={() => setShowPreview(false)}
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400">
                  Agrega algunas preguntas para previsualizar la actividad
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Sidebar: Settings */}
            <ActivitySettingsSidebar settings={settings} onUpdateSettings={setSettings} />

            {/* Main Canvas: Question Builder */}
            <main className="flex-1 min-w-0 space-y-5">
              {/* Activity Name Section */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Nombre de la Actividad
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Basic Introduction: Greetings & Introductions"
                  className="w-full text-xl sm:text-2xl lg:text-[28px] font-bold border-0 focus:ring-0 px-0 bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white h-auto py-1"
                />
              </div>

              {/* Questions List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-5">
                    {questions.map((question, index) => (
                      <QuestionBlock
                        key={question.id}
                        question={question}
                        index={index}
                        onUpdate={handleUpdateQuestion}
                        onDelete={() => handleDeleteQuestion(question.id)}
                        onDuplicate={() => handleDuplicateQuestion(question)}
                        onTypeChange={(type) => handleTypeChange(question.id, type)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Question Block Button */}
              <div className="py-4">
                <Popover open={isQuestionTypeModalOpen} onOpenChange={setIsQuestionTypeModalOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full group flex flex-col items-center justify-center py-8 px-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer"
                    >
                      <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                        <Plus className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Agregar Bloque de Pregunta
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Opción Múltiple, Completar Espacios, Relacionar, etc.
                      </p>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="center" side="top">
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Tipo de Pregunta
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Selecciona el tipo a agregar
                        </p>
                      </div>
                      <div className="space-y-2">
                        {QUESTION_TYPES.map((questionType) => {
                          const IconComponent = {
                            multiple_choice: CheckCircle,
                            fill_blanks: Type,
                            matching_pairs: ArrowRightLeft,
                            sentence_unscramble: ArrowUpDown,
                          }[questionType.type]

                          return (
                            <button
                              key={questionType.type}
                              onClick={() => handleQuestionTypeSelect(questionType.type)}
                              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm group-hover:text-primary">
                                    {questionType.label}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {questionType.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  )
}
