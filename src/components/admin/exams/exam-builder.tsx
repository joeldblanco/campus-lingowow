'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Plus, Trash2, FileText, GripVertical } from 'lucide-react'
import { CreateExamSectionData, CreateExamQuestionData, ExamWithDetails } from '@/types/exam'
import { QuestionWidget } from './widgets/question-widget'
import { ExamSettingsSidebar } from './exam-settings-sidebar'
import { ExamPreviewInteractive } from './exam-preview-interactive'
import { createExam, updateExam, getCoursesForExams } from '@/lib/actions/exams'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ExamBuilderProps {
  mode: 'create' | 'edit'
  exam?: ExamWithDetails
}

interface CourseForExam {
  id: string
  title: string
  language: string
  modules: Array<{
    id: string
    title: string
    level: string
    lessons: Array<{
      id: string
      title: string
    }>
  }>
}

// Extended types with IDs for drag-and-drop
type SectionWithId = CreateExamSectionData & { id: string; questions: QuestionWithId[] }
type QuestionWithId = CreateExamQuestionData & { id: string }

// Componente para sección sortable
function SortableSection({
  section,
  isActive,
  onClick,
}: {
  section: CreateExamSectionData & { id: string }
  isActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-colors',
        isActive ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
        isDragging && 'opacity-50'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="font-medium truncate">{section.title}</span>
        </div>
        <Badge variant="secondary" className="ml-2">
          {section.questions.length}
        </Badge>
      </div>
    </div>
  )
}

// Componente para pregunta sortable
function SortableQuestion({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  question: CreateExamQuestionData & { id: string }
  index: number
  onUpdate: (updates: Partial<CreateExamQuestionData>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <QuestionWidget
        question={question}
        index={index}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function ExamBuilder({ mode, exam }: ExamBuilderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')

  // Exam basic info
  const [title, setTitle] = useState(exam?.title || '')
  const [description, setDescription] = useState(exam?.description || '')
  const [instructions, setInstructions] = useState(exam?.instructions || '')

  // Exam settings
  const [timeLimit, setTimeLimit] = useState(exam?.timeLimit || 60)
  const [passingScore, setPassingScore] = useState(exam?.passingScore || 70)
  const [maxAttempts, setMaxAttempts] = useState(exam?.maxAttempts || 3)
  const [isBlocking, setIsBlocking] = useState(exam?.isBlocking || false)
  const [isOptional, setIsOptional] = useState(exam?.isOptional || false)
  const [shuffleQuestions, setShuffleQuestions] = useState(exam?.shuffleQuestions || false)
  const [shuffleOptions, setShuffleOptions] = useState(exam?.shuffleOptions || false)
  const [showResults, setShowResults] = useState(exam?.showResults ?? true)
  const [allowReview, setAllowReview] = useState(exam?.allowReview ?? true)
  const [isPublished, setIsPublished] = useState(exam?.isPublished || false)

  // Course assignment
  const [courseId, setCourseId] = useState(exam?.courseId || '')
  const [moduleId, setModuleId] = useState(exam?.moduleId || '')
  const [lessonId, setLessonId] = useState(exam?.lessonId || '')
  const [courses, setCourses] = useState<CourseForExam[]>([])

  // Sections and questions with IDs for drag-and-drop
  const [sections, setSections] = useState<SectionWithId[]>(
    exam?.sections.map((s, i) => ({
      id: `section-${i}`,
      title: s.title,
      description: s.description || undefined,
      instructions: s.instructions || undefined,
      timeLimit: s.timeLimit || undefined,
      order: s.order,
      questions: s.questions.map((q, qi) => ({
        id: `question-${i}-${qi}`,
        type: q.type as CreateExamQuestionData['type'],
        question: q.question,
        options: (q.options as string[]) || undefined,
        correctAnswer: q.correctAnswer as string | string[],
        explanation: q.explanation || undefined,
        points: q.points,
        order: q.order,
        difficulty: q.difficulty as CreateExamQuestionData['difficulty'],
        tags: (q.tags as string[]) || [],
        caseSensitive: q.caseSensitive,
        partialCredit: q.partialCredit,
        minLength: q.minLength || undefined,
        maxLength: q.maxLength || undefined,
      })),
    })) || []
  )

  const [activeSectionIndex, setActiveSectionIndex] = useState(0)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const coursesData = await getCoursesForExams()
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newSections = arrayMove(items, oldIndex, newIndex)
        // Update order
        return newSections.map((s, i) => ({ ...s, order: i + 1 }))
      })
    }
  }

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const section = sections[activeSectionIndex]
      if (!section) return

      const questions = section.questions as QuestionWithId[]
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      const newQuestions = arrayMove(questions, oldIndex, newIndex)
      // Update order
      const updatedQuestions = newQuestions.map((q, i) => ({ ...q, order: i })) as QuestionWithId[]

      updateSection(activeSectionIndex, { questions: updatedQuestions })
    }
  }

  const addSection = () => {
    const newSection: SectionWithId = {
      id: `section-${Date.now()}`,
      title: `Sección ${sections.length + 1}`,
      description: '',
      instructions: '',
      timeLimit: undefined,
      order: sections.length + 1,
      questions: [],
    }
    setSections([...sections, newSection])
    setActiveSectionIndex(sections.length)
  }

  const updateSection = (index: number, updates: Partial<SectionWithId>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
    if (activeSectionIndex >= sections.length - 1) {
      setActiveSectionIndex(Math.max(0, sections.length - 2))
    }
  }

  const addQuestion = (
    sectionIndex: number,
    type: CreateExamQuestionData['type'] = 'MULTIPLE_CHOICE'
  ) => {
    const section = sections[sectionIndex]
    if (!section) return

    const newQuestion: QuestionWithId = {
      id: `question-${sectionIndex}-${Date.now()}`,
      type,
      question: '¿Nueva pregunta?',
      options:
        type === 'MULTIPLE_CHOICE'
          ? ['Opción A', 'Opción B', 'Opción C', 'Opción D']
          : type === 'TRUE_FALSE'
            ? ['Verdadero', 'Falso']
            : undefined,
      correctAnswer:
        type === 'MULTIPLE_CHOICE' ? 'Opción A' : type === 'TRUE_FALSE' ? 'Verdadero' : '',
      points: 1,
      order: section.questions.length,
      difficulty: 'MEDIUM' as const,
      tags: [],
      caseSensitive: false,
      partialCredit: false,
      explanation: '',
    }

    updateSection(sectionIndex, {
      questions: [...section.questions, newQuestion],
    })
  }

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    updates: Partial<CreateExamQuestionData>
  ) => {
    const section = sections[sectionIndex]
    if (!section) return

    const updatedQuestions = section.questions.map((q, i) =>
      i === questionIndex ? { ...q, ...updates } : q
    ) as QuestionWithId[]
    updateSection(sectionIndex, { questions: updatedQuestions })
  }

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    const updatedQuestions = section.questions.filter(
      (_, i) => i !== questionIndex
    ) as QuestionWithId[]
    updateSection(sectionIndex, { questions: updatedQuestions })
  }

  const duplicateQuestion = (sectionIndex: number, questionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return

    const questionToDuplicate = section.questions[questionIndex]
    const duplicatedQuestion: QuestionWithId = {
      ...questionToDuplicate,
      id: `question-${sectionIndex}-${Date.now()}`,
      order: section.questions.length,
    }

    updateSection(sectionIndex, {
      questions: [...section.questions, duplicatedQuestion],
    })
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Por favor, ingresa un título para el examen')
      return
    }

    if (sections.length === 0) {
      toast.error('Por favor, agrega al menos una sección')
      return
    }

    const hasQuestions = sections.some((s) => s.questions.length > 0)
    if (!hasQuestions) {
      toast.error('Por favor, agrega al menos una pregunta')
      return
    }

    setLoading(true)
    try {
      // Remove IDs before saving
      const sectionsToSave: CreateExamSectionData[] = sections.map(section => {
        const { id, ...rest } = section
        void id // Use the variable to satisfy ESLint
        return {
          ...rest,
          questions: (section.questions as QuestionWithId[]).map(question => {
            const { id: questionId, ...questionRest } = question
            void questionId // Use the variable to satisfy ESLint
            return questionRest
          }) as CreateExamQuestionData[],
        }
      })

      const examData = {
        title,
        description,
        instructions,
        timeLimit,
        passingScore,
        maxAttempts,
        isBlocking,
        isOptional,
        shuffleQuestions,
        shuffleOptions,
        showResults,
        allowReview,
        courseId: courseId || undefined,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        sections: sectionsToSave,
        createdById: session?.user?.id || 'anonymous',
      }

      let result
      if (mode === 'create') {
        result = await createExam(examData)
      } else {
        result = await updateExam(exam!.id, {
          ...examData,
          isPublished,
        })
      }

      if (result.success) {
        toast.success(
          mode === 'create' ? 'Examen creado exitosamente' : 'Examen actualizado exitosamente'
        )
        router.push('/admin/exams')
      } else {
        toast.error(result.error || 'Error al guardar el examen')
      }
    } catch (error) {
      console.error('Error saving exam:', error)
      toast.error('Error al guardar el examen')
    } finally {
      setLoading(false)
    }
  }

  const activeSection: SectionWithId | undefined = sections[activeSectionIndex]
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)
  const totalPoints = sections.reduce(
    (sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.points, 0),
    0
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/exams')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">
                  {mode === 'create' ? 'Crear Examen' : 'Editar Examen'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {totalQuestions} preguntas · {totalPoints} puntos totales
                </p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar - Sections */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Secciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSectionDragEnd}
                    >
                      <SortableContext
                        items={sections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sections.map((section, index) => (
                          <SortableSection
                            key={section.id}
                            section={section}
                            isActive={activeSectionIndex === index}
                            onClick={() => setActiveSectionIndex(index)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    <Button variant="outline" className="w-full" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva sección
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Main Editor Area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Exam Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Información del examen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Título del examen</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Examen Final - Inglés Nivel B1"
                        className="text-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Descripción</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe brevemente el contenido del examen..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Instrucciones (opcional)
                      </label>
                      <Textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Instrucciones especiales para los estudiantes..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Section Editor */}
                {activeSection && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Input
                            value={activeSection.title}
                            onChange={(e) =>
                              updateSection(activeSectionIndex, { title: e.target.value })
                            }
                            className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
                            placeholder="Título de la sección"
                          />
                          <Input
                            value={activeSection.description || ''}
                            onChange={(e) =>
                              updateSection(activeSectionIndex, { description: e.target.value })
                            }
                            className="text-sm text-muted-foreground border-none px-0 focus-visible:ring-0 mt-1"
                            placeholder="Descripción de la sección (opcional)"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSection(activeSectionIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Questions with Drag and Drop */}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleQuestionDragEnd}
                      >
                        <SortableContext
                          items={(activeSection.questions as QuestionWithId[]).map((q) => q.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {(activeSection.questions as QuestionWithId[]).map((question, qIndex) => (
                            <SortableQuestion
                              key={question.id}
                              question={question}
                              index={qIndex}
                              onUpdate={(updates) =>
                                updateQuestion(activeSectionIndex, qIndex, updates)
                              }
                              onDelete={() => deleteQuestion(activeSectionIndex, qIndex)}
                              onDuplicate={() => duplicateQuestion(activeSectionIndex, qIndex)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>

                      {/* Add Question Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => addQuestion(activeSectionIndex, 'MULTIPLE_CHOICE')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Opción múltiple
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => addQuestion(activeSectionIndex, 'TRUE_FALSE')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Verdadero/Falso
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => addQuestion(activeSectionIndex, 'SHORT_ANSWER')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Respuesta corta
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => addQuestion(activeSectionIndex, 'ESSAY')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ensayo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {sections.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay secciones</h3>
                      <p className="text-muted-foreground mb-4">
                        Comienza agregando una sección para organizar tus preguntas
                      </p>
                      <Button onClick={addSection}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear primera sección
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <ExamPreviewInteractive
              title={title}
              description={description}
              sections={sections}
              timeLimit={timeLimit}
              totalPoints={totalPoints}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <ExamSettingsSidebar
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              passingScore={passingScore}
              setPassingScore={setPassingScore}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
              isBlocking={isBlocking}
              setIsBlocking={setIsBlocking}
              isOptional={isOptional}
              setIsOptional={setIsOptional}
              shuffleQuestions={shuffleQuestions}
              setShuffleQuestions={setShuffleQuestions}
              shuffleOptions={shuffleOptions}
              setShuffleOptions={setShuffleOptions}
              showResults={showResults}
              setShowResults={setShowResults}
              allowReview={allowReview}
              setAllowReview={setAllowReview}
              isPublished={isPublished}
              setIsPublished={setIsPublished}
              courseId={courseId}
              setCourseId={setCourseId}
              moduleId={moduleId}
              setModuleId={setModuleId}
              lessonId={lessonId}
              setLessonId={setLessonId}
              courses={courses}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
