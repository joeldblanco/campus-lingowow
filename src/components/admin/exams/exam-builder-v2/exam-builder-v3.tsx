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

import { Block, BlockTemplate, isInteractiveBlock, MultipleChoiceBlock } from '@/types/course-builder'
import { BlockLibrary, BlockCanvas, DraggableBlock } from '@/components/shared/content-builder'
import { BlockValidationError } from '@/components/shared/content-builder/types'
import { PropertiesPanel } from '@/components/admin/course-builder/lesson-builder/properties-panel'
import { ExamSettings, DEFAULT_EXAM_SETTINGS } from '@/components/admin/exams/exam-builder-v2/types'
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

// Helper function to parse options and extract groupId
function parseOptionsData(options: unknown): { parsed: Record<string, unknown> | string[] | null; groupId: string | null } {
  if (!options) return { parsed: null, groupId: null }
  
  // Si ya es un objeto, usarlo directamente
  if (typeof options === 'object' && options !== null) {
    if (Array.isArray(options)) {
      return { parsed: options, groupId: null }
    }
    const obj = options as Record<string, unknown>
    return { parsed: obj, groupId: (obj.groupId as string) || null }
  }
  
  // Si es un string, intentar parsear como JSON
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      if (Array.isArray(parsed)) {
        return { parsed, groupId: null }
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return { parsed, groupId: (parsed.groupId as string) || null }
      }
    } catch {
      // No es JSON válido, ignorar
    }
  }
  
  return { parsed: null, groupId: null }
}

// Convert old ExamQuestion format to Block format
function convertExamToBlocks(exam: ExamWithDetails): Block[] {
  if (!exam?.sections) return []

  let order = 0
  const flatBlocks: (Block & { _groupId?: string | null })[] = exam.sections.flatMap((section) =>
    section.questions.map((q): Block & { _groupId?: string | null } => {
      const qType = q.type.toLowerCase()
      const { parsed: optionsData, groupId } = parseOptionsData(q.options)

      // Base block data
      const baseBlock: Partial<Block> & { _groupId?: string | null } = {
        id: `block-${order++}-${Date.now()}`,
        order: order,
        points: q.points,
        explanation: q.explanation || undefined,
        required: true,
        _groupId: groupId,
      }

      // Handle type-specific conversion
      switch (qType) {
        case 'multiple_choice': {
          const opts = optionsData as { originalBlockType?: string; multipleChoiceItems?: MultipleChoiceBlock['items'] } | null
          return {
            ...baseBlock,
            type: 'multiple_choice',
            question: q.question,
            options: [],
            correctOptionId: '',
            items: opts?.multipleChoiceItems || []
          } as Block
        }

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
          // First check if options contains originalBlockType to restore non-standard blocks
          if (optionsData && typeof optionsData === 'object' && !Array.isArray(optionsData)) {
            const opts = optionsData as {
              originalBlockType?: string;
              url?: string;
              content?: string;
              instruction?: string;
              timeLimit?: number;
              aiGrading?: boolean;
              maxReplays?: number;
              multipleChoiceItems?: { id: string; question: string; options: { id: string; text: string }[]; correctOptionId: string }[]
            }
            if (opts.originalBlockType === 'audio') {
              return {
                ...baseBlock,
                type: 'audio',
                title: q.question,
                url: opts.url || q.audioUrl || '',
                maxReplays: opts.maxReplays || q.maxAudioPlays || 3,
              } as Block
            }
            if (opts.originalBlockType === 'image') {
              return {
                ...baseBlock,
                type: 'image',
                url: opts.url || '',
                alt: q.question,
              } as Block
            }
            if (opts.originalBlockType === 'video') {
              return {
                ...baseBlock,
                type: 'video',
                url: opts.url || '',
                title: q.question,
              } as Block
            }
            if (opts.originalBlockType === 'text') {
              return {
                ...baseBlock,
                type: 'text',
                content: opts.content || q.question,
                format: 'html',
              } as Block
            }
            if (opts.originalBlockType === 'recording') {
              return {
                ...baseBlock,
                type: 'recording',
                instruction: opts.instruction || q.question,
                timeLimit: opts.timeLimit,
                aiGrading: opts.aiGrading,
              } as Block
            }
            if (opts.originalBlockType === 'multiple_choice' && opts.multipleChoiceItems) {
              return {
                ...baseBlock,
                type: 'multiple_choice',
                question: q.question,
                options: [], // Empty for multi-step
                correctOptionId: '',
                items: opts.multipleChoiceItems
              } as Block
            }
            if (opts.originalBlockType === 'multi_select') {
              const multiSelectOpts = optionsData as { correctOptions?: Array<{ id: string; text: string }>; incorrectOptions?: Array<{ id: string; text: string }>; instruction?: string }
              return {
                ...baseBlock,
                type: 'multi_select',
                title: q.question,
                instruction: multiSelectOpts.instruction,
                correctOptions: multiSelectOpts.correctOptions || [],
                incorrectOptions: multiSelectOpts.incorrectOptions || [],
              } as Block
            }
            if (opts.originalBlockType === 'title') {
              const titleOpts = optionsData as { title?: string }
              return {
                ...baseBlock,
                type: 'title',
                title: titleOpts.title || q.question,
              } as Block
            }
          }
          // Fallback: Check if this is actually an audio block saved before the originalBlockType fix
          // Audio blocks have audioUrl set but essay blocks don't
          if (q.audioUrl && !q.minLength && !q.maxLength) {
            return {
              ...baseBlock,
              type: 'audio',
              title: q.question,
              url: q.audioUrl,
              maxReplays: q.maxAudioPlays || 3,
            } as Block
          }
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
          } as Block & { _groupId?: string | null }
      }
    })
  )

  // Reconstruir grupos a partir de _groupId
  const groupedBlocks: Block[] = []
  const processedGroupIds = new Set<string>()
  
  for (let i = 0; i < flatBlocks.length; i++) {
    const block = flatBlocks[i]
    const groupId = block._groupId
    
    if (groupId && !processedGroupIds.has(groupId)) {
      // Encontrar todos los bloques con el mismo groupId
      const groupChildren = flatBlocks.filter(b => b._groupId === groupId)
      
      // Crear bloque de grupo
      const groupBlock: Block = {
        id: groupId,
        type: 'block_group',
        order: groupedBlocks.length,
        title: 'Grupo de bloques',
        children: groupChildren.map((child) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _groupId, ...rest } = child
          return rest as Block
        }),
        points: groupChildren.reduce((sum, b) => sum + (b.points || 0), 0),
      } as Block
      
      groupedBlocks.push(groupBlock)
      processedGroupIds.add(groupId)
    } else if (!groupId) {
      // Bloque sin grupo, añadir directamente
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _groupId, ...blockWithoutGroupId } = block
      groupedBlocks.push(blockWithoutGroupId as Block)
    }
    // Si tiene groupId pero ya fue procesado, saltarlo
  }
  
  // Reordenar
  return groupedBlocks.map((b, i) => ({ ...b, order: i }))
}

// Flatten blocks, expanding block_group into its children with a groupId
function flattenBlocks(blocks: Block[]): (Block & { groupId?: string })[] {
  const result: (Block & { groupId?: string })[] = []
  
  for (const block of blocks) {
    if (block.type === 'block_group' && block.children) {
      // Add children with groupId to link them together
      for (const child of block.children) {
        result.push({ ...child, groupId: block.id })
      }
    } else {
      result.push(block)
    }
  }
  
  return result
}

// Convert Block[] back to exam question format for saving
function convertBlocksToExamFormat(blocks: Block[]) {
  // Flatten groups first
  const flatBlocks = flattenBlocks(blocks)
  
  return flatBlocks.map((block, index) => {
    const groupId = (block as Block & { groupId?: string }).groupId || null
    const blockOptions = getBlockOptions(block)
    
    // Incluir groupId en las opciones para que se pueda recuperar al cargar
    const optionsWithGroup = blockOptions 
      ? { ...blockOptions, groupId }
      : groupId ? { groupId } : undefined
    
    const baseQuestion = {
      type: mapBlockTypeToExamType(block.type),
      question: getBlockQuestion(block),
      options: optionsWithGroup,
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
    'multiple_choice': 'MULTIPLE_CHOICE', // Will be overridden in logic if needed, but here we just return default mapping. IMPORTANT: Logic in component decides if it's ESSAY based on content.
    // Actually this function only takes type string. We handle the split logic in the caller usually, OR we need to accept the block itself.
    // However, looking at usage: const examQuestion = { type: mapBlockTypeToExamType(block.type) ... }
    // If we want to map "multiple_choice" to "ESSAY" strictly when it's multi-step, we need to handle that in the loop where this is called.
    // But since this function is simple, let's keep it and handle exception where it's used.
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
    'recording': 'ESSAY',
    'multi_select': 'ESSAY',
    'title': 'ESSAY',
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
    case 'multi_select':
      return block.instruction || block.title || ''
    case 'title':
      return block.title || ''
    case 'recording':
      return block.instruction || block.prompt || 'Grabación de audio/video'
    case 'video':
      return block.title || 'Video'
    default:
      return ''
  }
}

function getBlockOptions(block: Block): string[] | Record<string, unknown> | undefined {
  switch (block.type) {
    case 'multiple_choice':
      if ((block as MultipleChoiceBlock).items?.length) {
        return {
          originalBlockType: 'multiple_choice',
          multipleChoiceItems: (block as MultipleChoiceBlock).items
        }
      }
      return block.options?.map(opt => opt.text)
    // Store original block type and data for non-standard blocks so they can be restored on reload
    case 'audio':
      return {
        originalBlockType: 'audio',
        url: block.url,
        maxReplays: block.maxReplays,
      }
    case 'image':
      return {
        originalBlockType: 'image',
        url: block.url,
      }
    case 'video':
      return {
        originalBlockType: 'video',
        url: block.url,
      }
    case 'text':
      return {
        originalBlockType: 'text',
        content: block.content,
      }
    case 'recording':
      return {
        originalBlockType: 'recording',
        instruction: block.instruction || block.prompt,
        timeLimit: block.timeLimit,
        aiGrading: block.aiGrading,
      }
    case 'multi_select':
      return {
        originalBlockType: 'multi_select',
        instruction: block.instruction,
        correctOptions: block.correctOptions,
        incorrectOptions: block.incorrectOptions,
      }
    case 'title':
      return {
        originalBlockType: 'title',
        title: block.title,
      }
    default:
      return undefined
  }
}

function getBlockCorrectAnswer(block: Block): string | string[] | null {
  switch (block.type) {
    case 'multiple_choice':
      if ((block as MultipleChoiceBlock).items?.length) {
        // For multi-step, extract correct answers from items
        const items = (block as MultipleChoiceBlock).items || []
        const joinedIds = items.map(item => item.correctOptionId).join(',')
        // Only use fallback when the joined string is empty
        return joinedIds || 'multi-step'
      }
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
    case 'multi_select':
      return block.correctOptions?.map(opt => opt.text) || []
    case 'essay':
    case 'recording':
    case 'text':
    case 'image':
    case 'audio':
    case 'video':
    case 'title':
      // These types don't have a correct answer - they're manually graded
      return null
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
    examType: exam?.examType || DEFAULT_EXAM_SETTINGS.examType,
    isGuestAccessible: exam?.isGuestAccessible ?? DEFAULT_EXAM_SETTINGS.isGuestAccessible,
    targetLanguage: exam?.targetLanguage || DEFAULT_EXAM_SETTINGS.targetLanguage,
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
