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
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Block, BlockTemplate, isInteractiveBlock } from '@/types/course-builder'
import { convertExamToBlocks, convertBlocksToExamFormat } from '@/components/admin/exams/exam-builder-v2/block-conversion'
import { BlockLibrary, BlockCanvas, DraggableBlock } from '@/components/shared/content-builder'
import { BlockValidationError } from '@/components/shared/content-builder/types'
import { PropertiesPanel } from '@/components/admin/course-builder/lesson-builder/properties-panel'
import { ExamSettings, DEFAULT_EXAM_SETTINGS } from '@/components/admin/exams/exam-builder-v2/types'
import { createExam, updateExam, getCoursesForExams, updateExamQuestions, updateExamDraft } from '@/lib/actions/exams'
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
    level: exam?.level || DEFAULT_EXAM_SETTINGS.level,
    isPlacementTest: exam?.examType === 'PLACEMENT_TEST',
    targetLanguage: exam?.targetLanguage || DEFAULT_EXAM_SETTINGS.targetLanguage,
    slug: exam?.slug || '',
    isPublicAccess: exam?.isPublicAccess ?? DEFAULT_EXAM_SETTINGS.isPublicAccess,
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

  // Group selected blocks
  const groupSelectedBlocks = useCallback(() => {
    if (selectedBlockIds.size < 2) {
      toast.error('Selecciona al menos 2 bloques para agrupar (Ctrl+Click)')
      return
    }

    setBlocks(prev => {
      // Find the indices of selected blocks
      const selectedIndices = prev
        .map((b, i) => selectedBlockIds.has(b.id) ? i : -1)
        .filter(i => i !== -1)
        .sort((a, b) => a - b)

      // Get the selected blocks in order
      const selectedBlocks = selectedIndices.map(i => prev[i])
      
      // Create the group block at the position of the first selected block
      const groupBlock: Block = {
        id: `group-${Date.now()}`,
        type: 'block_group',
        order: selectedIndices[0],
        title: 'Grupo de bloques',
        children: selectedBlocks,
        points: selectedBlocks.reduce((sum, b) => sum + (b.points || 0), 0),
      } as Block

      // Create new array without selected blocks, then insert group
      const newBlocks = prev.filter(b => !selectedBlockIds.has(b.id))
      newBlocks.splice(selectedIndices[0], 0, groupBlock)
      
      // Reorder
      return newBlocks.map((b, i) => ({ ...b, order: i }))
    })

    setSelectedBlockIds(new Set())
    toast.success(`${selectedBlockIds.size} bloques agrupados`)
  }, [selectedBlockIds])

  // Ungroup a block group
  const ungroupBlock = useCallback((groupId: string) => {
    setBlocks(prev => {
      const groupIndex = prev.findIndex(b => b.id === groupId)
      if (groupIndex === -1) return prev

      const groupBlock = prev[groupIndex]
      if (groupBlock.type !== 'block_group' || !groupBlock.children) return prev

      // Replace group with its children
      const newBlocks = [...prev]
      newBlocks.splice(groupIndex, 1, ...groupBlock.children)
      
      // Reorder
      return newBlocks.map((b, i) => ({ ...b, order: i }))
    })

    setSelectedBlockIds(new Set())
    toast.success('Grupo desagrupado')
  }, [])

  // Keyboard shortcuts for Delete and Ctrl+G (group)
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

      // Ctrl+G to group selected blocks
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedBlockIds.size >= 2 && !isPreviewMode && !isEditing) {
        e.preventDefault()
        groupSelectedBlocks()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedBlocks, groupSelectedBlocks, selectedBlockIds.size, isPreviewMode])

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
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstBlocksRender = useRef(true)
  const isFirstTitleRender = useRef(true)

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
          const result = await updateExamQuestions(exam.id, questionsData) as { 
            success: boolean; 
            error?: string; 
            hasExistingAnswers?: boolean; 
            answersCount?: number 
          }
          if (result.success) {
            setSaveStatus('saved')
          } else if (result.hasExistingAnswers) {
            setSaveStatus('error')
            toast.error(
              `⚠️ No se pueden modificar las preguntas: hay ${result.answersCount} respuesta(s) de estudiantes que se perderían permanentemente.`,
              { 
                duration: 10000,
                description: 'Para editar este examen, primero debe eliminar los intentos de estudiantes desde la sección de resultados.'
              }
            )
          } else {
            setSaveStatus('error')
            toast.error(result.error || 'Error al guardar los bloques')
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

  // Auto-save title and description
  const debouncedTitleSave = useCallback(
    (newTitle: string, newDescription: string) => {
      if (!exam?.id) return

      setSaveStatus('saving')
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current)
      }

      titleSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await updateExamDraft(exam.id, { 
            title: newTitle,
            description: newDescription 
          })
          if (result.success) {
            setSaveStatus('saved')
          } else {
            setSaveStatus('error')
            toast.error('Error al guardar el título')
          }
        } catch {
          setSaveStatus('error')
        }
      }, 1500)
    },
    [exam?.id]
  )

  useEffect(() => {
    if (isFirstTitleRender.current) {
      isFirstTitleRender.current = false
      return
    }
    debouncedTitleSave(title, description)
  }, [title, description, debouncedTitleSave])

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
        level: settings.level,
        // Placement test fields
        examType: settings.isPlacementTest ? 'PLACEMENT_TEST' as const : 'COURSE_EXAM' as const,
        targetLanguage: settings.isPlacementTest ? settings.targetLanguage : null,
        slug: settings.isPlacementTest 
          ? (settings.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `test-${Date.now()}`)
          : null,
        isPublicAccess: settings.isPlacementTest ? settings.isPublicAccess : false,
        isGuestAccessible: settings.isPlacementTest ? settings.isPublicAccess : false,
        // Course assignment (only for non-placement tests)
        courseId: settings.isPlacementTest ? undefined : (courseId || undefined),
        moduleId: settings.isPlacementTest ? undefined : (moduleId || undefined),
        lessonId: settings.isPlacementTest ? undefined : (lessonId || undefined),
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
        // Mostrar mensaje especial si hay respuestas de estudiantes
        if (result.error?.includes('respuesta(s) de estudiantes')) {
          toast.error(
            '⚠️ No se pueden modificar las preguntas de este examen',
            { 
              duration: 10000,
              description: result.error
            }
          )
        } else {
          toast.error(result.error || 'Error al guardar el examen')
        }
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
                <div className="p-4 border-t bg-muted/30">
                  <Button 
                    className="w-full" 
                    onClick={async () => {
                      await handleSave()
                      setSettingsOpen(false)
                      toast.success('Configuración guardada')
                    }}
                  >
                    Guardar Configuración
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Single block group selected - show ungroup button */}
            {!isPreviewMode && selectedBlockIds.size === 1 && (() => {
              const selectedId = Array.from(selectedBlockIds)[0]
              const selectedBlock = blocks.find(b => b.id === selectedId)
              if (selectedBlock?.type === 'block_group') {
                return (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-200 rounded-md">
                    <span className="text-sm font-medium text-orange-700">
                      Grupo seleccionado
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => ungroupBlock(selectedId)}
                      title="Desagrupar bloques"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Desagrupar
                    </Button>
                  </div>
                )
              }
              return null
            })()}

            {/* Multi-select indicator */}
            {!isPreviewMode && selectedBlockIds.size > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
                <span className="text-sm font-medium text-primary">
                  {selectedBlockIds.size} seleccionados
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={groupSelectedBlocks}
                  title="Agrupar bloques (Ctrl+G)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Agrupar
                </Button>
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
            onSelectBlock={!isPreviewMode ? handleBlockSelect : () => { }}
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
  const TARGET_LANGUAGES = [
    { value: 'en', label: '🇺🇸 Inglés' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Francés' },
    { value: 'de', label: '🇩🇪 Alemán' },
    { value: 'pt', label: '🇧🇷 Portugués' },
    { value: 'it', label: '🇮🇹 Italiano' },
  ]

  return (
    <div className="space-y-6 py-4">
      {/* Placement Test Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base font-semibold">Test de Clasificación</Label>
              <p className="text-xs text-muted-foreground">Examen para determinar el nivel del estudiante</p>
            </div>
          </div>
          <Switch
            checked={settings.isPlacementTest}
            onCheckedChange={(checked) => onUpdate({ 
              ...settings, 
              isPlacementTest: checked,
              isPublicAccess: checked ? settings.isPublicAccess : false,
            })}
          />
        </div>

        {settings.isPlacementTest && (
          <div className="space-y-4 p-4 border rounded-lg border-primary/20 bg-primary/5">
            <div className="space-y-2">
              <Label>Idioma Objetivo</Label>
              <Select
                value={settings.targetLanguage || ''}
                onValueChange={(value) => onUpdate({ ...settings, targetLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar idioma" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL del Test (slug)</Label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center">
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">/test/</span>
                  <Input
                    value={settings.slug}
                    onChange={(e) => onUpdate({ ...settings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="mi-test-ingles"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                URL única para acceder al test. Solo letras, números y guiones.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Acceso Público</Label>
                <p className="text-xs text-muted-foreground">Cualquiera con el link puede tomar el test</p>
              </div>
              <Switch
                checked={settings.isPublicAccess}
                onCheckedChange={(checked) => onUpdate({ ...settings, isPublicAccess: checked })}
              />
            </div>

            {!settings.isPublicAccess && (
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 dark:text-amber-300 p-2 rounded border border-amber-200 dark:border-amber-800">
                ⚠️ Solo usuarios asignados podrán tomar este test
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* CEFR Level */}
      <div className="space-y-2">
        <Label>Nivel CEFR del Examen</Label>
        <Select
          value={settings.level || 'B1'}
          onValueChange={(value) => onUpdate({ ...settings, level: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A1">A1 - Principiante</SelectItem>
            <SelectItem value="A2">A2 - Elemental</SelectItem>
            <SelectItem value="B1">B1 - Intermedio</SelectItem>
            <SelectItem value="B2">B2 - Intermedio Alto</SelectItem>
            <SelectItem value="C1">C1 - Avanzado</SelectItem>
            <SelectItem value="C2">C2 - Maestría</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Nivel del Marco Común Europeo de Referencia para las Lenguas
        </p>
      </div>

      <Separator />

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

      {/* Course progression (#92) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <Label>Bloquear avance hasta aprobar</Label>
            <p className="text-xs text-muted-foreground">
              El estudiante no podrá acceder a los módulos siguientes del curso hasta aprobar este
              examen. Requiere asignar el examen a un módulo (sección &quot;Asignar a Curso&quot;).
            </p>
          </div>
          <Switch
            checked={settings.isBlocking}
            onCheckedChange={(checked) => onUpdate({ ...settings, isBlocking: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <Label>Examen opcional</Label>
            <p className="text-xs text-muted-foreground">No es obligatorio para completar el curso.</p>
          </div>
          <Switch
            checked={settings.isOptional}
            onCheckedChange={(checked) => onUpdate({ ...settings, isOptional: checked })}
          />
        </div>
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

      {/* Course Assignment - Only show for non-placement tests */}
      {!settings.isPlacementTest && (
        <>
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
        </>
      )}
    </div>
  )
}
