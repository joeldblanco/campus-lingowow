import { Prisma } from '@prisma/client'
import { z } from 'zod'

// =============================================
// VALIDATION SCHEMAS
// =============================================

export const ExamBlockSchema = z.discriminatedUnion('type', [
  // --- Informative blocks (no points, no correct answer) ---
  z.object({
    type: z.literal('title'),
    title: z.string().min(1, 'El título es requerido'),
    points: z.number().default(0),
  }),
  z.object({
    type: z.literal('text'),
    content: z.string().min(1, 'El contenido es requerido'),
    format: z.enum(['plain', 'markdown', 'html']).default('html'),
    points: z.number().default(0),
  }),
  z.object({
    type: z.literal('audio'),
    url: z.string().url('URL de audio inválida'),
    title: z.string().optional(),
    maxReplays: z.number().min(0).optional(),
    points: z.number().default(0),
  }),
  z.object({
    type: z.literal('video'),
    url: z.string().url('URL de video inválida'),
    title: z.string().optional(),
    points: z.number().default(0),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().url('URL de imagen inválida'),
    alt: z.string().optional(),
    points: z.number().default(0),
  }),
  // --- Interactive blocks (scored) ---
  z.object({
    type: z.literal('multiple_choice'),
    question: z.string().optional(),
    items: z.array(z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.object({ id: z.string(), text: z.string() })),
      correctOptionId: z.string(),
    })).min(1, 'Debe tener al menos un item'),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('true_false'),
    items: z.array(z.object({
      id: z.string(),
      statement: z.string(),
      correctAnswer: z.boolean(),
    })).min(1),
    title: z.string().optional(),
    points: z.number().min(0).default(5),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('short_answer'),
    items: z.array(z.object({
      id: z.string(),
      question: z.string(),
      correctAnswer: z.string(),
    })).min(1),
    context: z.string().optional(),
    caseSensitive: z.boolean().default(false),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('essay'),
    prompt: z.string().min(1, 'El prompt es requerido'),
    minWords: z.number().optional(),
    maxWords: z.number().optional(),
    aiGrading: z.boolean().optional(),
    aiGradingConfig: z.object({
      language: z.enum(['english', 'spanish']),
      targetLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    }).optional(),
    points: z.number().min(0).default(20),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('recording'),
    instruction: z.string().min(1, 'La instrucción es requerida'),
    timeLimit: z.number().min(10).default(60),
    aiGrading: z.boolean().optional(),
    aiGradingConfig: z.object({
      language: z.enum(['english', 'spanish']),
      targetLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    }).optional(),
    points: z.number().min(0).default(20),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('fill_blanks'),
    title: z.string().optional(),
    items: z.array(z.object({
      id: z.string(),
      content: z.string(), // Use [word] for blanks
    })).min(1),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('match'),
    title: z.string().optional(),
    pairs: z.array(z.object({
      id: z.string(),
      left: z.string(),
      right: z.string(),
    })).min(1),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('ordering'),
    title: z.string().optional(),
    instruction: z.string().optional(),
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      correctPosition: z.number(),
    })).min(2),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('drag_drop'),
    title: z.string().optional(),
    instruction: z.string().optional(),
    categories: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })).min(2),
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      correctCategoryId: z.string(),
    })).min(1),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal('multi_select'),
    title: z.string().optional(),
    instruction: z.string().optional(),
    correctOptions: z.array(z.object({ id: z.string(), text: z.string() })).min(1),
    incorrectOptions: z.array(z.object({ id: z.string(), text: z.string() })).min(1),
    points: z.number().min(0).default(10),
    explanation: z.string().optional(),
  }),
])

export const BlockGroupSchema = z.object({
  type: z.literal('block_group'),
  title: z.string().optional(),
  children: z.array(ExamBlockSchema).min(1, 'Un grupo debe tener al menos un bloque'),
})

export const ExamBlockOrGroupSchema = z.union([ExamBlockSchema, BlockGroupSchema])

export const ExamTypeEnum = z.enum(['COURSE_EXAM', 'PLACEMENT_TEST', 'DIAGNOSTIC', 'PRACTICE'])

export const CreateExamApiSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  instructions: z.string().optional(),
  
  // Configuration
  timeLimit: z.number().min(1).optional(),
  passingScore: z.number().min(0).max(100).default(70),
  maxAttempts: z.number().min(1).default(3),
  isBlocking: z.boolean().default(false),
  isOptional: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  
  // Proctoring
  proctoringEnabled: z.boolean().default(true),
  requireFullscreen: z.boolean().default(true),
  blockCopyPaste: z.boolean().default(true),
  blockRightClick: z.boolean().default(true),
  maxWarnings: z.number().min(1).max(20).default(5),
  
  // Nivel CEFR del examen
  level: z.string().default('B1'),
  
  // Exam type
  examType: ExamTypeEnum.default('COURSE_EXAM'),
  targetLanguage: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  isPublicAccess: z.boolean().default(false),
  isGuestAccessible: z.boolean().default(false),
  
  // Context (optional)
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  lessonId: z.string().optional(),
  
  // Blocks
  blocks: z.array(ExamBlockOrGroupSchema).min(1, 'Debe tener al menos un bloque'),
})

export const UpdateExamApiSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().nullable().optional(),
  
  // Configuration
  timeLimit: z.number().min(1).nullable().optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).optional(),
  isBlocking: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  allowReview: z.boolean().optional(),
  
  // Proctoring
  proctoringEnabled: z.boolean().optional(),
  requireFullscreen: z.boolean().optional(),
  blockCopyPaste: z.boolean().optional(),
  blockRightClick: z.boolean().optional(),
  maxWarnings: z.number().min(1).max(20).optional(),
  
  // Nivel CEFR del examen
  level: z.string().optional(),
  
  // Exam type
  examType: ExamTypeEnum.optional(),
  targetLanguage: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  isPublicAccess: z.boolean().optional(),
  isGuestAccessible: z.boolean().optional(),
  
  // Context (optional)
  courseId: z.string().nullable().optional(),
  moduleId: z.string().nullable().optional(),
  lessonId: z.string().nullable().optional(),
  
  // Blocks (if provided, replaces all existing blocks)
  blocks: z.array(ExamBlockOrGroupSchema).min(1).optional(),
})

// =============================================
// BLOCK → EXAM QUESTION CONVERSION
// =============================================

export type ExamBlock = z.infer<typeof ExamBlockSchema>

export interface ConvertedQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'RECORDING' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP'
  question: string
  options: Prisma.InputJsonValue | null
  correctAnswer: Prisma.InputJsonValue | typeof Prisma.JsonNull
  explanation: string
  points: number
  order: number
  difficulty: 'MEDIUM'
  tags: string[]
  caseSensitive: boolean
  partialCredit: boolean
  minLength?: number
  maxLength?: number
  audioUrl?: string
  maxAudioPlays?: number
}

function convertBlockToQuestion(block: ExamBlock, order: number, groupId: string | null): ConvertedQuestion {
  const base: Omit<ConvertedQuestion, 'type' | 'question' | 'options' | 'correctAnswer'> = {
    explanation: ('explanation' in block ? block.explanation : '') || '',
    points: block.points || 0,
    order,
    difficulty: 'MEDIUM' as const,
    tags: [],
    caseSensitive: false,
    partialCredit: false,
  }

  const addGroupId = (opts: Record<string, unknown> | null): Prisma.InputJsonValue | null => {
    if (!groupId && !opts) return null
    if (!groupId) return opts as Prisma.InputJsonValue
    return { ...(opts || {}), groupId } as Prisma.InputJsonValue
  }

  switch (block.type) {
    case 'title':
      return {
        ...base,
        type: 'ESSAY',
        question: block.title,
        options: addGroupId({ originalBlockType: 'title', title: block.title }),
        correctAnswer: Prisma.JsonNull,
      }

    case 'text':
      return {
        ...base,
        type: 'ESSAY',
        question: block.content,
        options: addGroupId({ originalBlockType: 'text', content: block.content }),
        correctAnswer: Prisma.JsonNull,
      }

    case 'audio':
      return {
        ...base,
        type: 'ESSAY',
        question: block.title || 'Audio',
        options: addGroupId({ originalBlockType: 'audio', url: block.url, maxReplays: block.maxReplays || 3 }),
        correctAnswer: Prisma.JsonNull,
        audioUrl: block.url,
        maxAudioPlays: block.maxReplays,
      }

    case 'video':
      return {
        ...base,
        type: 'ESSAY',
        question: block.title || 'Video',
        options: addGroupId({ originalBlockType: 'video', url: block.url }),
        correctAnswer: Prisma.JsonNull,
      }

    case 'image':
      return {
        ...base,
        type: 'ESSAY',
        question: block.alt || 'Imagen',
        options: addGroupId({ originalBlockType: 'image', url: block.url }),
        correctAnswer: Prisma.JsonNull,
      }

    case 'multiple_choice': {
      const items = block.items
      const correctAnswerStr = items.map(item => item.correctOptionId).join(',')
      return {
        ...base,
        type: 'MULTIPLE_CHOICE',
        question: block.question || items[0]?.question || '',
        options: addGroupId({ originalBlockType: 'multiple_choice', multipleChoiceItems: items }),
        correctAnswer: correctAnswerStr || 'multi-step',
      }
    }

    case 'true_false': {
      const statement = block.items[0]?.statement || ''
      const correct = block.items[0]?.correctAnswer ? 'Verdadero' : 'Falso'
      return {
        ...base,
        type: 'TRUE_FALSE',
        question: statement,
        options: addGroupId(null),
        correctAnswer: correct,
      }
    }

    case 'short_answer': {
      const item = block.items[0]
      return {
        ...base,
        type: 'SHORT_ANSWER',
        question: item?.question || '',
        options: addGroupId(null),
        correctAnswer: item?.correctAnswer || '',
        caseSensitive: block.caseSensitive || false,
      }
    }

    case 'essay':
      return {
        ...base,
        type: 'ESSAY',
        question: block.prompt,
        options: addGroupId(null),
        correctAnswer: Prisma.JsonNull,
        minLength: block.minWords,
        maxLength: block.maxWords,
      }

    case 'recording':
      return {
        ...base,
        type: 'RECORDING',
        question: block.instruction,
        options: addGroupId({
          originalBlockType: 'recording',
          instruction: block.instruction,
          timeLimit: block.timeLimit || 60,
          aiGrading: block.aiGrading,
          aiGradingConfig: block.aiGradingConfig,
        }),
        correctAnswer: Prisma.JsonNull,
      }

    case 'fill_blanks': {
      const content = block.items[0]?.content || ''
      const matches = content.match(/\[([^\]]+)\]/g)
      return {
        ...base,
        type: 'FILL_BLANK',
        question: content,
        options: addGroupId({ content }),
        correctAnswer: matches ? matches.map(m => m.slice(1, -1)) : '',
      }
    }

    case 'match':
      return {
        ...base,
        type: 'MATCHING',
        question: block.title || 'Emparejar',
        options: addGroupId({ pairs: block.pairs }),
        correctAnswer: JSON.stringify(block.pairs.map(p => ({ left: p.left, right: p.right }))),
      }

    case 'ordering':
      return {
        ...base,
        type: 'ORDERING',
        question: block.instruction || block.title || 'Ordenar',
        options: addGroupId({ items: block.items }),
        correctAnswer: block.items.map(i => i.text),
      }

    case 'drag_drop':
      return {
        ...base,
        type: 'DRAG_DROP',
        question: block.instruction || block.title || 'Clasificar',
        options: addGroupId({ categories: block.categories, dragItems: block.items }),
        correctAnswer: JSON.stringify(block.items.map(i => ({ item: i.text, category: i.correctCategoryId }))),
      }

    case 'multi_select':
      return {
        ...base,
        type: 'ESSAY',
        question: block.instruction || block.title || 'Selección múltiple',
        options: addGroupId({
          originalBlockType: 'multi_select',
          instruction: block.instruction,
          correctOptions: block.correctOptions,
          incorrectOptions: block.incorrectOptions,
        }),
        correctAnswer: block.correctOptions.map(opt => opt.text),
      }

    default:
      return {
        ...base,
        type: 'ESSAY',
        question: '',
        options: addGroupId(null),
        correctAnswer: Prisma.JsonNull,
      }
  }
}

export function convertBlocksToQuestions(blocks: z.infer<typeof ExamBlockOrGroupSchema>[]): ConvertedQuestion[] {
  const questions: ConvertedQuestion[] = []
  let order = 0

  for (const block of blocks) {
    if ('children' in block && block.type === 'block_group') {
      const groupId = `group-${Date.now()}-${order}`
      for (const child of block.children) {
        questions.push(convertBlockToQuestion(child, order++, groupId))
      }
    } else {
      questions.push(convertBlockToQuestion(block as ExamBlock, order++, null))
    }
  }

  return questions
}
