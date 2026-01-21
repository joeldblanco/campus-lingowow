import { z } from 'zod'

// Base block schema
const baseBlockSchema = z.object({
  id: z.string().optional(), // Optional for creation, will be generated if not provided
  order: z.number().int().min(0).optional(),
  children: z.lazy(() => z.array(blockSchema)).optional(),
  data: z.record(z.unknown()).optional(),
})

// Block type enum
export const blockTypeSchema = z.enum([
  'text',
  'video',
  'image',
  'audio',
  'quiz',
  'assignment',
  'file',
  'embed',
  'tab_group',
  'tab_item',
  'layout',
  'column',
  'container',
  'grammar',
  'vocabulary',
  'title',
  'fill_blanks',
  'match',
  'true_false',
  'essay',
  'recording',
  'structured-content',
  'grammar-visualizer',
  'multiple_choice',
  'short_answer',
  'ordering',
  'drag_drop',
])

// Individual block type schemas
const titleBlockSchema = baseBlockSchema.extend({
  type: z.literal('title'),
  title: z.string(),
})

const textBlockSchema = baseBlockSchema.extend({
  type: z.literal('text'),
  content: z.string(),
  format: z.enum(['plain', 'markdown', 'html']).optional(),
})

const videoBlockSchema = baseBlockSchema.extend({
  type: z.literal('video'),
  url: z.string().url(),
  title: z.string().optional(),
  duration: z.number().optional(),
  thumbnail: z.string().optional(),
})

const imageBlockSchema = baseBlockSchema.extend({
  type: z.literal('image'),
  url: z.string().url(),
  alt: z.string(),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const audioBlockSchema = baseBlockSchema.extend({
  type: z.literal('audio'),
  url: z.string().url(),
  title: z.string().optional(),
  duration: z.number().optional(),
  maxReplays: z.number().optional(),
})

const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['multiple-choice', 'true-false', 'short-answer']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  points: z.number(),
})

const quizBlockSchema = baseBlockSchema.extend({
  type: z.literal('quiz'),
  title: z.string(),
  questions: z.array(quizQuestionSchema),
  passingScore: z.number().optional(),
})

const assignmentBlockSchema = baseBlockSchema.extend({
  type: z.literal('assignment'),
  title: z.string(),
  description: z.string(),
  dueDate: z.string().optional(),
  maxScore: z.number().optional(),
  submissionType: z.enum(['text', 'file', 'link']),
})

const downloadableFileSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  fileType: z.string(),
  size: z.number(),
  resourceType: z.string().optional(),
})

const fileBlockSchema = baseBlockSchema.extend({
  type: z.literal('file'),
  title: z.string(),
  description: z.string().optional(),
  files: z.array(downloadableFileSchema),
})

const embedBlockSchema = baseBlockSchema.extend({
  type: z.literal('embed'),
  url: z.string().url(),
  title: z.string().optional(),
  height: z.number().optional(),
})

const tabGroupBlockSchema = baseBlockSchema.extend({
  type: z.literal('tab_group'),
})

const tabItemBlockSchema = baseBlockSchema.extend({
  type: z.literal('tab_item'),
  title: z.string(),
})

const layoutBlockSchema = baseBlockSchema.extend({
  type: z.literal('layout'),
  columns: z.number().int().min(1).max(4),
})

const columnBlockSchema = baseBlockSchema.extend({
  type: z.literal('column'),
  width: z.string().optional(),
})

const containerBlockSchema = baseBlockSchema.extend({
  type: z.literal('container'),
})

const grammarExampleSchema = z.object({
  id: z.string(),
  sentence: z.string(),
  translation: z.string().optional(),
})

const grammarBlockSchema = baseBlockSchema.extend({
  type: z.literal('grammar'),
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  examples: z.array(grammarExampleSchema),
})

const vocabularyItemSchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
  pronunciation: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  audioUrl: z.string().optional(),
  example: z.string().optional(),
  examples: z.array(z.string()).optional(),
})

const vocabularyBlockSchema = baseBlockSchema.extend({
  type: z.literal('vocabulary'),
  title: z.string(),
  items: z.array(vocabularyItemSchema),
})

const fillBlanksItemSchema = z.object({
  id: z.string(),
  content: z.string(),
})

const fillBlanksBlockSchema = baseBlockSchema.extend({
  type: z.literal('fill_blanks'),
  title: z.string().optional(),
  items: z.array(fillBlanksItemSchema).optional(),
})

const matchPairSchema = z.object({
  id: z.string(),
  left: z.string(),
  right: z.string(),
})

const matchBlockSchema = baseBlockSchema.extend({
  type: z.literal('match'),
  title: z.string().optional(),
  pairs: z.array(matchPairSchema),
})

const trueFalseItemSchema = z.object({
  id: z.string(),
  statement: z.string(),
  correctAnswer: z.boolean(),
})

const trueFalseBlockSchema = baseBlockSchema.extend({
  type: z.literal('true_false'),
  title: z.string().optional(),
  items: z.array(trueFalseItemSchema).optional(),
})

const essayBlockSchema = baseBlockSchema.extend({
  type: z.literal('essay'),
  prompt: z.string(),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
  aiGrading: z.boolean().optional(),
  aiGradingConfig: z
    .object({
      language: z.enum(['english', 'spanish']),
      targetLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
      rubric: z
        .object({
          grammar: z.number(),
          vocabulary: z.number(),
          coherence: z.number(),
          taskCompletion: z.number(),
        })
        .optional(),
    })
    .optional(),
})

const multipleChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
})

const multipleChoiceBlockSchema = baseBlockSchema.extend({
  type: z.literal('multiple_choice'),
  question: z.string(),
  options: z.array(multipleChoiceOptionSchema),
  correctOptionId: z.string(),
  explanation: z.string().optional(),
  points: z.number().optional(),
})

const shortAnswerItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  correctAnswer: z.string(),
  aiInstructions: z.string().optional(),
})

const shortAnswerBlockSchema = baseBlockSchema.extend({
  type: z.literal('short_answer'),
  items: z.array(shortAnswerItemSchema),
  context: z.string().optional(),
  caseSensitive: z.boolean().optional(),
  explanation: z.string().optional(),
  points: z.number().optional(),
})

const orderingItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  correctPosition: z.number(),
})

const orderingBlockSchema = baseBlockSchema.extend({
  type: z.literal('ordering'),
  title: z.string().optional(),
  instruction: z.string().optional(),
  items: z.array(orderingItemSchema),
  points: z.number().optional(),
})

const dragDropCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
})

const dragDropItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  correctCategoryId: z.string(),
})

const dragDropBlockSchema = baseBlockSchema.extend({
  type: z.literal('drag_drop'),
  title: z.string().optional(),
  instruction: z.string().optional(),
  categories: z.array(dragDropCategorySchema),
  items: z.array(dragDropItemSchema),
  points: z.number().optional(),
})

const recordingBlockSchema = baseBlockSchema.extend({
  type: z.literal('recording'),
  instruction: z.string(),
  timeLimit: z.number().optional(),
})

const structuredContentBlockSchema = baseBlockSchema.extend({
  type: z.literal('structured-content'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  config: z
    .object({
      hasHeaderRow: z.boolean().optional(),
      hasStripedRows: z.boolean().optional(),
      hasBorders: z.boolean().optional(),
    })
    .optional(),
  content: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .optional(),
})

const grammarTypeSchema = z.enum([
  'subject',
  'action-verb',
  'auxiliary-verb',
  'linking-verb',
  'direct-object',
  'indirect-object',
  'subject-complement',
  'object-complement',
  'adjective',
  'adverb',
  'adverbial-complement',
  'determiner',
  'article',
  'pronoun',
  'possessive-pronoun',
  'preposition',
  'prepositional-object',
  'conjunction',
  'interjection',
  'negation',
  'modal-verb',
  'infinitive',
  'gerund',
  'relative-pronoun',
  'punctuation',
  'other',
])

const tokenBlockSchema = z.object({
  id: z.string(),
  content: z.string(),
  grammarType: grammarTypeSchema.optional(),
  color: z.string().optional(),
})

const sentenceVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  rawSentence: z.string(),
  tokens: z.array(tokenBlockSchema),
  hint: z.string().optional(),
})

const sentenceSetSchema = z.object({
  id: z.string(),
  title: z.string(),
  variants: z.array(sentenceVariantSchema),
  hint: z.string().optional(),
})

const grammarVisualizerBlockSchema = baseBlockSchema.extend({
  type: z.literal('grammar-visualizer'),
  title: z.string().optional(),
  description: z.string().optional(),
  sets: z.array(sentenceSetSchema),
})

// Union of all block types
export const blockSchema: z.ZodType<unknown> = z.discriminatedUnion('type', [
  titleBlockSchema,
  textBlockSchema,
  videoBlockSchema,
  imageBlockSchema,
  audioBlockSchema,
  quizBlockSchema,
  assignmentBlockSchema,
  fileBlockSchema,
  embedBlockSchema,
  tabGroupBlockSchema,
  tabItemBlockSchema,
  layoutBlockSchema,
  columnBlockSchema,
  containerBlockSchema,
  grammarBlockSchema,
  vocabularyBlockSchema,
  fillBlanksBlockSchema,
  matchBlockSchema,
  trueFalseBlockSchema,
  essayBlockSchema,
  multipleChoiceBlockSchema,
  shortAnswerBlockSchema,
  orderingBlockSchema,
  dragDropBlockSchema,
  recordingBlockSchema,
  structuredContentBlockSchema,
  grammarVisualizerBlockSchema,
])

// API Request schemas
export const updateBlocksRequestSchema = z.object({
  blocks: z.array(blockSchema),
})

export const addBlocksRequestSchema = z.object({
  blocks: z.array(blockSchema),
  position: z.number().int().min(0).optional(), // Insert at position, default append
})

export const updateSingleBlockRequestSchema = blockSchema

// API Response types
export type BlockInput = z.infer<typeof blockSchema>
export type UpdateBlocksRequest = z.infer<typeof updateBlocksRequestSchema>
export type AddBlocksRequest = z.infer<typeof addBlocksRequestSchema>
