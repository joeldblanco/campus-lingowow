'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Settings,
  Eye,
  Cloud,
  Loader2,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { QuestionLibrary, QuestionTemplate, DraggableQuestion } from './question-library'
import { QuestionCanvas } from './question-canvas'
import { QuestionProperties } from './question-properties'
import { ExamQuestion, ExamSettings, DEFAULT_EXAM_SETTINGS } from './types'
import { createExam, updateExam, getCoursesForExams } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'

interface ExamBuilderV2Props {
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
    level: number
    lessons: Array<{
      id: string
      title: string
    }>
  }>
}

export function ExamBuilderV2({ mode, exam }: ExamBuilderV2Props) {
  const router = useRouter()
  const { data: session } = useSession()

  // Exam data
  const [title, setTitle] = useState(exam?.title || '')
  const [description, setDescription] = useState(exam?.description || '')
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => {
    if (exam?.sections) {
      // Convert old section-based format to flat questions
      let order = 0
      return exam.sections.flatMap((section) =>
        section.questions.map((q): ExamQuestion => ({
          id: `q-${order++}-${Date.now()}`,
          type: q.type.toLowerCase(),
          order: order,
          points: q.points,
          question: q.question,
          options: q.options
            ? (q.options as string[]).map((text, i) => ({ id: `opt${i}`, text }))
            : undefined,
          correctOptionId:
            q.type === 'MULTIPLE_CHOICE'
              ? `opt${(q.options as string[])?.indexOf(q.correctAnswer as string)}`
              : undefined,
          correctAnswer:
            q.type === 'TRUE_FALSE' ? q.correctAnswer === 'Verdadero' : undefined,
          correctAnswers:
            q.type === 'SHORT_ANSWER'
              ? Array.isArray(q.correctAnswer)
                ? (q.correctAnswer as string[])
                : [q.correctAnswer as string]
              : undefined,
          explanation: q.explanation || undefined,
          caseSensitive: q.caseSensitive,
          partialCredit: q.partialCredit,
          minWords: q.minLength || undefined,
          maxWords: q.maxLength || undefined,
        }))
      )
    }
    return []
  })

  // Settings
  const [settings, setSettings] = useState<ExamSettings>({
    timeLimit: exam?.timeLimit || DEFAULT_EXAM_SETTINGS.timeLimit,
    passingScore: exam?.passingScore || DEFAULT_EXAM_SETTINGS.passingScore,
    maxAttempts: exam?.maxAttempts || DEFAULT_EXAM_SETTINGS.maxAttempts,
    shuffleQuestions: exam?.shuffleQuestions || DEFAULT_EXAM_SETTINGS.shuffleQuestions,
    shuffleOptions: exam?.shuffleOptions || DEFAULT_EXAM_SETTINGS.shuffleOptions,
    showResults: exam?.showResults ?? DEFAULT_EXAM_SETTINGS.showResults,
    allowReview: exam?.allowReview ?? DEFAULT_EXAM_SETTINGS.allowReview,
    isBlocking: exam?.isBlocking || DEFAULT_EXAM_SETTINGS.isBlocking,
    isOptional: exam?.isOptional || DEFAULT_EXAM_SETTINGS.isOptional,
  })

  const [isPublished] = useState(exam?.isPublished || false)

  // Course assignment
  const [courseId, setCourseId] = useState(exam?.courseId || '')
  const [moduleId, setModuleId] = useState(exam?.moduleId || '')
  const [lessonId, setLessonId] = useState(exam?.lessonId || '')
  const [courses, setCourses] = useState<CourseForExam[]>([])

  // UI State
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [loading, setLoading] = useState(false)

  // DnD State
  const [activeDragItem, setActiveDragItem] = useState<{
    type: string
    template?: QuestionTemplate
    question?: ExamQuestion
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = useRef(true)

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

  const debouncedSave = useCallback(() => {
    if (mode === 'edit' && exam?.id) {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Auto-save logic would go here
          setSaveStatus('saved')
        } catch {
          setSaveStatus('error')
        }
      }, 2000)
    }
  }, [mode, exam?.id])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    debouncedSave()
  }, [questions, title, description, debouncedSave])

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'new-question') {
      setActiveDragItem({ type: 'new-question', template: active.data.current.template })
    } else {
      const question = questions.find((q) => q.id === active.id)
      if (question) {
        setActiveDragItem({ type: 'sortable-question', question })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    // Handle cancel zone (remove question)
    if (over.id === 'cancel-zone') {
      if (active.data.current?.type !== 'new-question') {
        setQuestions((prev) => prev.filter((q) => q.id !== active.id))
        if (selectedQuestionId === active.id) {
          setSelectedQuestionId(null)
        }
      }
      return
    }

    // Handle new question from library
    if (active.data.current?.type === 'new-question') {
      const template = active.data.current.template as QuestionTemplate
      const newQuestion: ExamQuestion = {
        id: `q-${Date.now()}`,
        type: template.type,
        order: questions.length,
        points: (template.defaultData.points as number) || 10,
        ...template.defaultData,
      }

      let insertIndex = questions.length
      if (over.id !== 'canvas-droppable') {
        const overIndex = questions.findIndex((q) => q.id === over.id)
        if (overIndex !== -1) {
          insertIndex = overIndex + 1
        }
      }

      const newQuestions = [...questions]
      newQuestions.splice(insertIndex, 0, newQuestion)
      setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
      setSelectedQuestionId(newQuestion.id)
      return
    }

    // Handle reordering
    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        setQuestions(
          arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }))
        )
      }
    }
  }

  // Question handlers
  const updateQuestion = (updates: Partial<ExamQuestion>) => {
    if (!selectedQuestionId) return
    setQuestions((prev) =>
      prev.map((q) => (q.id === selectedQuestionId ? { ...q, ...updates } : q))
    )
  }

  // Save handler
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Por favor, ingresa un título para el examen')
      return
    }

    if (!description.trim()) {
      toast.error('Por favor, ingresa una descripción para el examen')
      return
    }

    if (questions.length === 0) {
      toast.error('Por favor, agrega al menos una pregunta')
      return
    }

    setLoading(true)
    try {
      // Convert questions to old section format for compatibility
      const sectionsData = [
        {
          title: 'Sección Principal',
          description: '',
          order: 1,
          questions: questions.map((q, index) => ({
            type: q.type.toUpperCase() as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP',
            question: q.question || q.instruction || '',
            options: q.options?.map((opt) => opt.text),
            correctAnswer:
              q.type === 'multiple_choice'
                ? q.options?.find((opt) => opt.id === q.correctOptionId)?.text || ''
                : q.type === 'true_false'
                  ? q.correctAnswer
                    ? 'Verdadero'
                    : 'Falso'
                  : q.type === 'short_answer'
                    ? q.correctAnswers?.[0] || ''
                    : '',
            explanation: q.explanation || '',
            points: q.points,
            order: index,
            difficulty: 'MEDIUM' as const,
            tags: [],
            caseSensitive: q.caseSensitive || false,
            partialCredit: q.partialCredit || false,
            minLength: q.minWords,
            maxLength: q.maxWords,
          })),
        },
      ]

      const examData = {
        title,
        description,
        instructions: '',
        timeLimit: settings.timeLimit,
        passingScore: settings.passingScore,
        maxAttempts: settings.maxAttempts,
        isBlocking: settings.isBlocking,
        isOptional: settings.isOptional,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleOptions: settings.shuffleOptions,
        showResults: settings.showResults,
        allowReview: settings.allowReview,
        courseId: courseId || undefined,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        sections: sectionsData,
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

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId) || null

  const selectedCourse = courses.find((c) => c.id === courseId)
  const selectedModule = selectedCourse?.modules.find((m) => m.id === moduleId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4 shrink-0 bg-background z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/exams')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <span className="font-semibold">Exam Builder</span>
            </div>
          </div>

          {/* Center Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">PUNTOS:</span>
              <span className="font-semibold">{totalPoints}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">TIEMPO:</span>
              <span className="font-semibold">{settings.timeLimit}m</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                  <DialogTitle>Configuración del Examen</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                  <ExamSettingsForm
                    settings={settings}
                    onUpdate={setSettings}
                    courses={courses}
                    courseId={courseId}
                    setCourseId={setCourseId}
                    moduleId={moduleId}
                    setModuleId={setModuleId}
                    lessonId={lessonId}
                    setLessonId={setLessonId}
                    selectedCourse={selectedCourse}
                    selectedModule={selectedModule}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Save Status */}
            {!isPreviewMode && mode === 'edit' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Error</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    <span>Borrador guardado</span>
                  </>
                )}
              </div>
            )}

            <Button
              variant={isPreviewMode ? 'secondary' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => {
                setIsPreviewMode(!isPreviewMode)
                setSelectedQuestionId(null)
              }}
            >
              <Eye className="h-4 w-4" />
              {isPreviewMode ? 'Salir' : 'Vista Previa'}
            </Button>

            <Button
              size="sm"
              className={cn(
                'gap-2',
                isPublished ? 'bg-green-600 hover:bg-green-700' : ''
              )}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isPublished ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Publicado
                </>
              ) : (
                'Publicar Examen'
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Question Library */}
          {!isPreviewMode && <QuestionLibrary />}

          {/* Center: Canvas */}
          <QuestionCanvas
            title={title}
            description={description}
            questions={questions}
            selectedQuestionId={isPreviewMode ? null : selectedQuestionId}
            onSelectQuestion={!isPreviewMode ? setSelectedQuestionId : () => {}}
            onUpdateTitle={setTitle}
            onUpdateDescription={setDescription}
            readOnly={isPreviewMode}
          />

          {/* Right Sidebar: Properties Panel */}
          {!isPreviewMode && selectedQuestion && (
            <QuestionProperties
              question={selectedQuestion}
              onUpdate={updateQuestion}
              onClose={() => setSelectedQuestionId(null)}
              onDelete={() => {
                setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestionId))
                setSelectedQuestionId(null)
              }}
            />
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem?.type === 'new-question' && activeDragItem.template ? (
          <div className="p-3 bg-background border rounded shadow-lg w-48 flex items-center gap-3 cursor-grabbing opacity-90">
            <DraggableQuestion template={activeDragItem.template} disableDrag />
          </div>
        ) : null}
        {activeDragItem?.type === 'sortable-question' ? (
          <div className="p-4 bg-background border border-primary rounded-lg shadow-xl w-64 opacity-90">
            Arrastra para reordenar
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Settings Form Component
function ExamSettingsForm({
  settings,
  onUpdate,
  courses,
  courseId,
  setCourseId,
  moduleId,
  setModuleId,
  lessonId,
  setLessonId,
  selectedCourse,
  selectedModule,
}: {
  settings: ExamSettings
  onUpdate: (settings: ExamSettings) => void
  courses: CourseForExam[]
  courseId: string
  setCourseId: (id: string) => void
  moduleId: string
  setModuleId: (id: string) => void
  lessonId: string
  setLessonId: (id: string) => void
  selectedCourse?: CourseForExam
  selectedModule?: { id: string; title: string; level: number; lessons: { id: string; title: string }[] }
}) {
  return (
    <div className="space-y-6 py-4">
      {/* Time & Scoring */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tiempo Límite (minutos)</Label>
          <Input
            type="number"
            min={1}
            value={settings.timeLimit}
            onChange={(e) => onUpdate({ ...settings, timeLimit: parseInt(e.target.value) || 60 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Puntaje para Aprobar (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={settings.passingScore}
            onChange={(e) => onUpdate({ ...settings, passingScore: parseInt(e.target.value) || 70 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Intentos Máximos</Label>
        <Input
          type="number"
          min={1}
          value={settings.maxAttempts}
          onChange={(e) => onUpdate({ ...settings, maxAttempts: parseInt(e.target.value) || 3 })}
        />
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Mezclar Preguntas</Label>
            <p className="text-xs text-muted-foreground">Orden aleatorio de preguntas</p>
          </div>
          <Switch
            checked={settings.shuffleQuestions}
            onCheckedChange={(checked) => onUpdate({ ...settings, shuffleQuestions: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Mezclar Opciones</Label>
            <p className="text-xs text-muted-foreground">Orden aleatorio de opciones</p>
          </div>
          <Switch
            checked={settings.shuffleOptions}
            onCheckedChange={(checked) => onUpdate({ ...settings, shuffleOptions: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Mostrar Resultados</Label>
            <p className="text-xs text-muted-foreground">Al finalizar el examen</p>
          </div>
          <Switch
            checked={settings.showResults}
            onCheckedChange={(checked) => onUpdate({ ...settings, showResults: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Permitir Revisión</Label>
            <p className="text-xs text-muted-foreground">Ver respuestas después</p>
          </div>
          <Switch
            checked={settings.allowReview}
            onCheckedChange={(checked) => onUpdate({ ...settings, allowReview: checked })}
          />
        </div>
      </div>

      {/* Course Assignment */}
      <Separator />
      <div className="space-y-4">
        <Label className="text-base font-semibold">Asignar a Curso</Label>

        <div className="space-y-2">
          <Label>Curso</Label>
          <Select value={courseId || '__none__'} onValueChange={(v) => { setCourseId(v === '__none__' ? '' : v); setModuleId(''); setLessonId('') }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin asignar</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourse && (
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select value={moduleId || '__none__'} onValueChange={(v) => { setModuleId(v === '__none__' ? '' : v); setLessonId('') }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {selectedCourse.modules.map((mod) => (
                  <SelectItem key={mod.id} value={mod.id}>
                    {mod.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedModule && (
          <div className="space-y-2">
            <Label>Lección</Label>
            <Select value={lessonId || '__none__'} onValueChange={(v) => setLessonId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {selectedModule.lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
