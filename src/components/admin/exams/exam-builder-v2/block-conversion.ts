import { Block, MultipleChoiceBlock, TrueFalseBlock } from '@/types/course-builder'
import { ExamWithDetails } from '@/types/exam'

// Helper function to parse options and extract groupId
export function parseOptionsData(options: unknown): { parsed: Record<string, unknown> | string[] | null; groupId: string | null } {
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
export function convertExamToBlocks(exam: ExamWithDetails): Block[] {
  if (!exam?.questions) return []

  let order = 0
  const flatBlocks: (Block & { _groupId?: string | null })[] = exam.questions.map((q: ExamWithDetails['questions'][number]): Block & { _groupId?: string | null } => {
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

        case 'true_false': {
          // Multiple statements are persisted in options.trueFalseItems. Fall back to the
          // single-statement legacy shape (question + correctAnswer) when they are absent.
          const opts = optionsData as { trueFalseItems?: TrueFalseBlock['items'] } | null
          return {
            ...baseBlock,
            type: 'true_false',
            title: 'Verdadero o Falso',
            items: opts?.trueFalseItems?.length
              ? opts.trueFalseItems
              : [{
                  id: 'item1',
                  statement: q.question,
                  correctAnswer: q.correctAnswer === 'Verdadero',
                }],
          } as Block
        }

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
            if (q.type === 'RECORDING') {
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

        case 'recording': {
          const recOpts = optionsData as { instruction?: string; timeLimit?: number; aiGrading?: boolean; aiGradingConfig?: { language: string; targetLevel: string } } | null
          return {
            ...baseBlock,
            type: 'recording',
            instruction: recOpts?.instruction || q.question,
            timeLimit: recOpts?.timeLimit || 60,
            aiGrading: recOpts?.aiGrading,
            aiGradingConfig: recOpts?.aiGradingConfig,
          } as Block
        }

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
export function flattenBlocks(blocks: Block[]): (Block & { groupId?: string })[] {
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
export function convertBlocksToExamFormat(blocks: Block[]) {
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

export function mapBlockTypeToExamType(type: string): 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'RECORDING' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP' {
  const typeMap: Record<string, 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'RECORDING' | 'FILL_BLANK' | 'MATCHING' | 'ORDERING' | 'DRAG_DROP'> = {
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
    'recording': 'RECORDING',
    'multi_select': 'ESSAY',
    'title': 'ESSAY',
    'quiz': 'MULTIPLE_CHOICE',
  }
  return typeMap[type.toLowerCase()] || 'SHORT_ANSWER'
}

export function getBlockQuestion(block: Block): string {
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

export function getBlockOptions(block: Block): string[] | Record<string, unknown> | undefined {
  switch (block.type) {
    case 'multiple_choice':
      if ((block as MultipleChoiceBlock).items?.length) {
        return {
          originalBlockType: 'multiple_choice',
          multipleChoiceItems: (block as MultipleChoiceBlock).items
        }
      }
      return block.options?.map(opt => opt.text)
    // Store all statements so they survive a save/reload round-trip. Previously only
    // items[0] was persisted (via question/correctAnswer), losing extra statements.
    // No `originalBlockType` here: TRUE_FALSE is a native question type, so the student
    // viewer and the exam API must keep using their native TRUE_FALSE rendering path.
    case 'true_false':
      return {
        trueFalseItems: (block as TrueFalseBlock).items,
      }
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

export function getBlockCorrectAnswer(block: Block): string | string[] | null {
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
