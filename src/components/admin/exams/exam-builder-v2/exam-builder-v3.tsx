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
  Loader2,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Block, BlockTemplate, isInteractiveBlock } from '@/types/course-builder'
import { BlockLibrary, BlockCanvas, DraggableBlock } from '@/components/shared/content-builder'
import { BlockValidationError } from '@/components/shared/content-builder/types'
import { PropertiesPanel } from '@/components/admin/course-builder/lesson-builder/properties-panel'
import { ExamSettings, DEFAULT_EXAM_SETTINGS } from './types'
import { createExam, updateExam, getCoursesForExams, updateExamQuestions } from '@/lib/actions/exams'
import { ExamWithDetails } from '@/types/exam'

interface ExamBuilderV3Props {
  mode: 'create' | 'edit'
  exam?: ExamWithDetails
  backUrl?: string
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

// Convert old ExamQuestion format to Block format
function convertExamToBlocks(exam: ExamWithDetails): Block[] {
  if (!exam?.sections) return []

  let order = 0
  return exam.sections.flatMap((section) =>
    section.questions.map((q): Block => {
      const qType = q.type.toLowerCase()
      const optionsData = q.options as Record<string, unknown> | string[] | null

      // Base block data
      const baseBlock: Partial<Block> = {
        id: `block-${order++}-${Date.now()}`,
        order: order,
        points: q.points,
        explanation: q.explanation || undefined,
        required: true,
      }

      // Handle type-specific conversion
      switch (qType) {
        case 'multiple_choice':
          return {
            ...baseBlock,
            type: 'multiple_choice',
            question: q.question,
            options: Array.isArray(optionsData)
              ? optionsData.map((text, i) => ({ id: `opt${i}`, text: text as string }))
              : [],
            correctOptionId: Array.isArray(optionsData)
              ? `opt${optionsData.indexOf(q.correctAnswer as string)}`
              : '',
          } as Block

        case 'true_false':
          return {
            ...baseBlock,
            type: 'true_false',
            title: 'Verdadero o Falso',
            items: [{
              id: 'item1',
              statement: q.question,
              correctAnswer: q.correctAnswer === 'Verdadero',
            }],
          } as Block

        case 'short_answer':
          return {
            ...baseBlock,
            type: 'short_answer',
            items: [{
              id: 'item1',
              question: q.question,
              correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : (q.correctAnswer as string) || '',
            }],
            caseSensitive: q.caseSensitive || false,
          } as Block

        case 'essay':
          return {
            ...baseBlock,
            type: 'essay',
            prompt: q.question,
            minWords: q.minLength || undefined,
            maxWords: q.maxLength || undefined,
          } as Block

        case 'fill_blank':
        case 'fill_blanks':
          return {
            ...baseBlock,
            type: 'fill_blanks',
            title: 'Rellenar Espacios',
            items: [{
              id: 'item1',
              content: optionsData && typeof optionsData === 'object' && !Array.isArray(optionsData)
                ? (optionsData as { content?: string }).content || q.question
                : q.question,
            }],
          } as Block

        case 'matching':
          return {
            ...baseBlock,
            type: 'match',
            title: q.question,
            pairs: optionsData && typeof optionsData === 'object' && !Array.isArray(optionsData)
              ? ((optionsData as { pairs?: Array<{ left: string; right: string }> }).pairs || []).map((p, i) => ({
                  id: `pair${i}`,
                  left: p.left,
                  right: p.right,
                }))
              : [],
          } as Block

        case 'ordering':
          return {
            ...baseBlock,
            type: 'ordering',
            title: q.question,
            items: optionsData && typeof optionsData === 'object' && !Array.isArray(optionsData)
              ? ((optionsData as { items?: Array<{ text: string; correctPosition: number }> }).items || []).map((item, i) => ({
                  id: `item${i}`,
                  text: item.text,
                  correctPosition: item.correctPosition,
                }))
              : [],
          } as Block

        case 'drag_drop':
          const ddData = optionsData as {
            categories?: Array<{ id: string; name: string }>
            dragItems?: Array<{ text: string; correctCategoryId: string }>
          } | null
          return {
            ...baseBlock,
            type: 'drag_drop',
            title: q.question,
            categories: ddData?.categories?.map((c, i) => ({ id: c.id || `cat${i}`, name: c.name })) || [],
            items: ddData?.dragItems?.map((d, i) => ({
              id: `item${i}`,
              text: d.text,
              correctCategoryId: d.correctCategoryId,
            })) || [],
          } as Block

        // Informative blocks (audio/image)
        case 'audio_question':
          return {
            ...baseBlock,
            type: 'audio',
            title: q.question,
            url: q.audioUrl || '',
            maxReplays: q.maxAudioPlays || 3,
            points: 0, // Informative, no points
          } as Block

        case 'image_question':
          return {
            ...baseBlock,
            type: 'image',
            url: optionsData && typeof optionsData === 'object' && !Array.isArray(optionsData)
              ? (optionsData as { imageUrl?: string }).imageUrl || ''
              : '',
            alt: q.question,
            points: 0, // Informative, no points
          } as Block

        default:
          // Default to text block for unknown types
          return {
            ...baseBlock,
            type: 'text',
            content: q.question,
            format: 'html',
          } as Block
      }
    })
  )
}

// Convert Block[] back to exam question format for saving
function convertBlocksToExamFormat(blocks: Block[]) {
  return blocks.map((block, index) => {
    const baseQuestion = {
      type: mapBlockTypeToExamType(block.type),
      question: getBlockQuestion(block),
      options: getBlockOptions(block),
      correctAnswer: getBlockCorrectAnswer(block),
      explanation: block.explanation || '',
      points: block.points || 0,
      order: index,
      difficulty: 'MEDIUM' as const,
      tags: [] as string[],
      caseSensitive: (block as { caseSensitive?: boolean }).caseSensitive || false,
      partialCredit: block.partialCredit || false,
    }

    return baseQuestion
  })
}

function mapBlockTypeToExamType(type: string): 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP' {
  const typeMap: Record<string, 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP'> = {
    'multiple_choice': 'MULTIPLE_CHOICE',
    'true_false': 'TRUE_FALSE',
    'short_answer': 'SHORT_ANSWER',
    'essay': 'ESSAY',
    'fill_blanks': 'FILL_BLANK',
    'match': 'MATCHING',
    'ordering': 'ORDERING',
    'drag_drop': 'DRAG_DROP',
    // Non-interactive blocks default to ESSAY (manually graded)
    'text': 'ESSAY',
    'image': 'ESSAY',
    'audio': 'ESSAY',
    'video': 'ESSAY',
    'quiz': 'MULTIPLE_CHOICE',
  }
  return typeMap[type.toLowerCase()] || 'SHORT_ANSWER'
}

function getBlockQuestion(block: Block): string {
  switch (block.type) {
    case 'multiple_choice':
      return block.question || ''
    case 'true_false':
      return block.items?.[0]?.statement || block.title || ''
    case 'short_answer':
      return block.items?.[0]?.question || block.context || ''
    case 'essay':
      return block.prompt || ''
    case 'fill_blanks':
      return block.items?.[0]?.content || block.title || ''
    case 'match':
      return block.title || ''
    case 'ordering':
      return block.instruction || block.title || ''
    case 'drag_drop':
      return block.instruction || block.title || ''
    case 'text':
      return block.content || ''
    case 'image':
      return block.alt || block.caption || ''
    case 'audio':
      return block.title || ''
    default:
      return ''
  }
}

function getBlockOptions(block: Block): string[] | undefined {
  switch (block.type) {
    case 'multiple_choice':
      return block.options?.map(opt => opt.text)
    default:
      return undefined
  }
}

function getBlockCorrectAnswer(block: Block): string | string[] | null {
  switch (block.type) {
    case 'multiple_choice':
      return block.options?.find(opt => opt.id === block.correctOptionId)?.text || ''
    case 'true_false':
      return block.items?.[0]?.correctAnswer ? 'Verdadero' : 'Falso'
    case 'short_answer':
      return block.items?.[0]?.correctAnswer || ''
    case 'fill_blanks':
      const content = block.items?.[0]?.content || ''
      const matches = content.match(/\[([^\]]+)\]/g)
      return matches ? matches.map(m => m.slice(1, -1)) : ''
    case 'match':
      return JSON.stringify(block.pairs?.map(p => ({ left: p.left, right: p.right })) || [])
    case 'ordering':
      return block.items?.map(i => i.text) || []
    case 'drag_drop':
      return JSON.stringify(block.items?.map(i => ({ item: i.text, category: i.correctCategoryId })) || [])
    default:
      return null
  }
}

export function ExamBuilderV3({ mode, exam, backUrl = '/admin/exams' }: ExamBuilderV3Props) {
  const router = useRouter()
  const { data: session } = useSession()

  // Exam data - now using Block[] instead of ExamQuestion[]
  const [title, setTitle] = useState(exam?.title || '')
  const [description, setDescription] = useState(exam?.description || '')
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (exam) {
      return convertExamToBlocks(exam)
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
    proctoringEnabled: exam?.proctoringEnabled ?? DEFAULT_EXAM_SETTINGS.proctoringEnabled,
    requireFullscreen: exam?.requireFullscreen ?? DEFAULT_EXAM_SETTINGS.requireFullscreen,
    blockCopyPaste: exam?.blockCopyPaste ?? DEFAULT_EXAM_SETTINGS.blockCopyPaste,
    blockRightClick: exam?.blockRightClick ?? DEFAULT_EXAM_SETTINGS.blockRightClick,
    maxWarnings: exam?.maxWarnings ?? DEFAULT_EXAM_SETTINGS.maxWarnings,
  })

  const [isPublished, setIsPublished] = useState(exam?.isPublished || false)

  // Course assignment
  const [courseId, setCourseId] = useState(exam?.courseId || '')
  const [moduleId, setModuleId] = useState(exam?.moduleId || '')
  const [lessonId, setLessonId] = useState(exam?.lessonId || '')
  const [courses, setCourses] = useState<CourseForExam[]>([])

  // UI State
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<BlockValidationError[]>([])

  // Helper to get single selected block (for properties panel)
  const selectedBlockId = selectedBlockIds.size === 1 ? Array.from(selectedBlockIds)[0] : null

  // Handle block selection with Ctrl support for multi-select
  const handleBlockSelect = (blockId: string | null, event?: React.MouseEvent) => {
    if (!blockId) {
      setSelectedBlockIds(new Set())
      return
    }

    if (event?.ctrlKey || event?.metaKey) {
      // Toggle selection with Ctrl/Cmd
      setSelectedBlockIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(blockId)) {
          newSet.delete(blockId)
        } else {
          newSet.add(blockId)
        }
        return newSet
      })
    } else {
      // Single selection
      setSelectedBlockIds(new Set([blockId]))
    }
  }

  // Delete selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    if (selectedBlockIds.size === 0) return
    
    setBlocks(prev => prev.filter(b => !selectedBlockIds.has(b.id)))
    setSelectedBlockIds(new Set())
    toast.success(`${selectedBlockIds.size} bloque(s) eliminado(s)`)
  }, [selectedBlockIds])

  // Keyboard shortcut for Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement
      const isEditing = activeElement instanceof HTMLInputElement ||
                        activeElement instanceof HTMLTextAreaElement ||
                        activeElement?.getAttribute('contenteditable') === 'true'
      
      if (e.key === 'Delete' && selectedBlockIds.size > 0 && !isPreviewMode && !isEditing) {
        e.preventDefault()
        deleteSelectedBlocks()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedBlocks, selectedBlockIds.size, isPreviewMode])

  // DnD State
  const [activeDragItem, setActiveDragItem] = useState<{
    type: string
    template?: BlockTemplate
    block?: Block
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Auto-save refs
  const blocksSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstBlocksRender = useRef(true)

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

  // Auto-save blocks
  const debouncedBlocksSave = useCallback(
    (blocksToSave: Block[]) => {
      if (!exam?.id) return

      setSaveStatus('saving')
      if (blocksSaveTimeoutRef.current) {
        clearTimeout(blocksSaveTimeoutRef.current)
      }

      blocksSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const questionsData = convertBlocksToExamFormat(blocksToSave)
          const result = await updateExamQuestions(exam.id, questionsData)
          if (result.success) {
            setSaveStatus('saved')
          } else {
            setSaveStatus('error')
            toast.error('Error al guardar los bloques')
          }
        } catch {
          setSaveStatus('error')
        }
      }, 2000)
    },
    [exam?.id]
  )

  useEffect(() => {
    if (isFirstBlocksRender.current) {
      isFirstBlocksRender.current = false
      return
    }
    debouncedBlocksSave(blocks)
  }, [blocks, debouncedBlocksSave])

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'new-block') {
      setActiveDragItem({ type: 'new-block', template: active.data.current.template })
    } else {
      const block = blocks.find((b) => b.id === active.id)
      if (block) {
        setActiveDragItem({ type: 'sortable-block', block })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    // Handle cancel zone (remove block)
    if (over.id === 'cancel-zone') {
      if (active.data.current?.type !== 'new-block') {
        setBlocks((prev) => prev.filter((b) => b.id !== active.id))
        if (selectedBlockIds.has(active.id as string)) {
          setSelectedBlockIds(new Set())
        }
      }
      return
    }

    // Handle new block from library
    if (active.data.current?.type === 'new-block') {
      const template = active.data.current.template as BlockTemplate
      const newBlock: Block = {
        ...template.defaultData,
        id: `block-${Date.now()}`,
        order: blocks.length,
        points: isInteractiveBlock(template.type) ? 10 : 0,
        required: true,
      } as Block

      let insertIndex = blocks.length
      if (over.id !== 'canvas-droppable') {
        const overIndex = blocks.findIndex((b) => b.id === over.id)
        if (overIndex !== -1) {
          insertIndex = overIndex + 1
        }
      }

      const newBlocks = [...blocks]
      newBlocks.splice(insertIndex, 0, newBlock)
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })))
      setSelectedBlockIds(new Set([newBlock.id]))
      return
    }

    // Handle reordering
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        setBlocks(
          arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }))
        )
      }
    }
  }

  // Block handlers
  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? ({ ...b, ...updates } as Block) : b))
    )
    // Clear validation errors for this block
    setValidationErrors((errors) => errors.filter((e) => e.blockId !== blockId))
  }

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
    if (selectedBlockIds.has(blockId)) {
      setSelectedBlockIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(blockId)
        return newSet
      })
    }
  }

  // Save handler
  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('Por favor, ingresa un título para el examen')
      return
    }

    if (!description.trim()) {
      toast.error('Por favor, ingresa una descripción para el examen')
      return
    }

    if (blocks.length === 0) {
      toast.error('Por favor, agrega al menos un bloque')
      return
    }

    setLoading(true)
    try {
      const questionsData = convertBlocksToExamFormat(blocks)

      const sectionsData = [
        {
          title: 'Sección Principal',
          description: '',
          order: 1,
          questions: questionsData,
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
        proctoringEnabled: settings.proctoringEnabled,
        requireFullscreen: settings.requireFullscreen,
        blockCopyPaste: settings.blockCopyPaste,
        blockRightClick: settings.blockRightClick,
        maxWarnings: settings.maxWarnings,
        courseId: courseId || undefined,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        sections: sectionsData,
        createdById: session?.user?.id || 'anonymous',
        isPublished: publish || isPublished,
      }

      let result
      if (mode === 'create') {
        result = await createExam(examData)
      } else {
        result = await updateExam(exam!.id, examData)
      }

      if (result.success) {
        setValidationErrors([])
        if (publish && !isPublished) {
          setIsPublished(true)
          toast.success('Examen publicado exitosamente')
        } else {
          toast.success(
            mode === 'create' ? 'Examen creado exitosamente' : 'Examen actualizado exitosamente'
          )
        }
        router.push(backUrl)
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

  const totalPoints = blocks.reduce((sum, b) => {
    if (isInteractiveBlock(b.type)) {
      return sum + (b.points || 0)
    }
    return sum
  }, 0)

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null
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
            <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
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
            {/* Multi-select indicator */}
            {!isPreviewMode && selectedBlockIds.size > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
                <span className="text-sm font-medium text-primary">
                  {selectedBlockIds.size} seleccionados
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={deleteSelectedBlocks}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </div>
            )}

            {/* Save Status */}
            {!isPreviewMode && exam?.id && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Error al guardar</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Guardado</span>
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
                setSelectedBlockIds(new Set())
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
              onClick={() => handleSave(true)}
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
          {/* Left Sidebar: Block Library */}
          {!isPreviewMode && <BlockLibrary mode="exam" />}

          {/* Center: Canvas */}
          <BlockCanvas
            blocks={blocks}
            title={title}
            description={description}
            selectedBlockId={isPreviewMode ? null : selectedBlockId}
            selectedBlockIds={isPreviewMode ? new Set() : selectedBlockIds}
            onSelectBlock={!isPreviewMode ? handleBlockSelect : () => {}}
            onUpdateTitle={setTitle}
            onUpdateDescription={setDescription}
            onUpdateBlock={updateBlock}
            onRemoveBlock={removeBlock}
            readOnly={isPreviewMode}
            mode="exam"
            validationErrors={validationErrors}
          />

          {/* Right Sidebar: Properties Panel */}
          {!isPreviewMode && selectedBlock && (
            <PropertiesPanel
              block={selectedBlock}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
              onRemove={() => removeBlock(selectedBlock.id)}
              onClose={() => setSelectedBlockIds(new Set())}
              mode="exam"
            />
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem?.type === 'new-block' && activeDragItem.template ? (
          <div className="p-3 bg-background border rounded shadow-lg w-48 flex items-center gap-3 cursor-grabbing opacity-90">
            <DraggableBlock template={activeDragItem.template} disableDrag />
          </div>
        ) : null}
        {activeDragItem?.type === 'sortable-block' ? (
          <div className="p-4 bg-background border border-primary rounded-lg shadow-xl w-64 opacity-90">
            Arrastra para reordenar
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Settings Form Component (same as v2)
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
  selectedModule?: { id: string; title: string; level: string; lessons: { id: string; title: string }[] }
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
