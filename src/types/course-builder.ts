import {
  Type,
  AlignLeft,
  Image as ImageIcon,
  Video,
  Book,
  Library,
  Mic,
  CheckSquare,
  Edit3,
  Download,
  Link as LinkIcon,
  Shuffle,
  CheckCircle2,
  FileSignature,
  Table,
  Blocks,
} from 'lucide-react'
import React from 'react'

export type BlockType =
  | 'text'
  | 'video'
  | 'image'
  | 'audio'
  | 'quiz'
  | 'assignment'
  | 'file'
  | 'embed'
  | 'tab_group'
  | 'tab_item'
  | 'layout'
  | 'column'
  | 'container'
  | 'grammar'
  | 'vocabulary'
  | 'title'
  | 'fill_blanks'
  | 'match'
  | 'true_false'
  | 'essay'
  | 'recording'
  | 'structured-content'
  | 'grammar-visualizer'

// Base block type with discriminated union for different content types
export interface BaseBlock {
  id: string
  type: BlockType
  order: number
  // Recursive structure for new content model
  children?: Block[]
  data?: Record<string, unknown> // Flexible payload for new types
}

export interface TitleBlock extends BaseBlock {
  type: 'title'
  title: string
}

export interface TextBlock extends BaseBlock {
  type: 'text'
  content: string
  format?: 'plain' | 'markdown' | 'html'
}

export interface VideoBlock extends BaseBlock {
  type: 'video'
  url: string
  title?: string
  duration?: number
  thumbnail?: string
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  url: string
  alt: string
  caption?: string
  maxReplays?: number // Limit number of times audio can be played. 0 or undefined means infinite.
  width?: number
  height?: number
}

export interface AudioBlock extends BaseBlock {
  type: 'audio'
  url: string
  title?: string
  duration?: number
  maxReplays?: number
}

export interface QuizBlock extends BaseBlock {
  type: 'quiz'
  title: string
  questions: QuizQuestion[]
  passingScore?: number
}

export interface AssignmentBlock extends BaseBlock {
  type: 'assignment'
  title: string
  description: string
  dueDate?: string
  maxScore?: number
  submissionType: 'text' | 'file' | 'link'
}

export interface DownloadableFile {
  id: string
  title: string
  url: string
  fileType: string
  size: number
  resourceType?: string
}

export interface FileBlock extends BaseBlock {
  type: 'file'
  title: string
  description?: string
  files: DownloadableFile[]
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed'
  url: string
  title?: string
  height?: number
}

export interface TabGroupBlock extends BaseBlock {
  type: 'tab_group'
}

export interface TabItemBlock extends BaseBlock {
  type: 'tab_item'
  title: string
}

// Fixed grammar and vocabulary interfaces
export interface GrammarBlock extends BaseBlock {
  type: 'grammar'
  title: string
  description: string // HTML
  image?: string // New field for the illustration
  examples: Array<{ id: string; sentence: string; translation?: string }>
}

export interface VocabularyBlock extends BaseBlock {
  type: 'vocabulary'
  title: string
  items: {
    id: string
    term: string
    definition: string
    pronunciation?: string
    image?: string
    icon?: string
    audioUrl?: string
    example?: string
    examples?: string[] // Keeping for backward compatibility if needed, but primary is 'example'
  }[]
}

export interface LayoutBlock extends BaseBlock {
  type: 'layout'
  columns: number // Number of columns (1, 2, 3, 4)
}

export interface ColumnBlock extends BaseBlock {
  type: 'column'
  width?: string // Percentage or flex value
}

export interface FillBlanksBlock extends BaseBlock {
  type: 'fill_blanks'
  title?: string
  items?: { id: string; content: string }[] // Array of exercises
}

export interface MatchBlock extends BaseBlock {
  type: 'match'
  pairs: { id: string; left: string; right: string }[]
  title?: string
}

export interface TrueFalseBlock extends BaseBlock {
  type: 'true_false'
  title?: string
  items?: { id: string; statement: string; correctAnswer: boolean }[] // Array of statements
} // true for "Verdadero", false for "Falso"

export interface EssayBlock extends BaseBlock {
  type: 'essay'
  prompt: string
  minWords?: number
  maxWords?: number
}

export interface RecordingBlock extends BaseBlock {
  type: 'recording'
  instruction: string
  timeLimit?: number // in seconds
}

export interface StructuredContentBlock extends BaseBlock {
  type: 'structured-content'
  title?: string
  subtitle?: string
  config?: {
    hasHeaderRow?: boolean
    hasStripedRows?: boolean
    hasBorders?: boolean
  }
  content?: {
    headers: string[]
    rows: string[][]
  }
}

export type GrammarType =
  | 'subject'
  | 'verb'
  | 'object'
  | 'adverb'
  | 'negation'
  | 'preposition'
  | 'article'
  | 'pronoun'
  | 'punctuation'
  | 'other'

export interface TokenBlock {
  id: string
  content: string // The text content (can be multiple words if merged)
  grammarType?: GrammarType
  color?: string // Optional, can be derived from GrammarType
}

export interface SentenceVariant {
  id: string
  label: string // e.g. "Affirmative", "Negative"
  rawSentence: string
  tokens: TokenBlock[]
  hint?: string
}

export interface SentenceSet {
  id: string
  title: string
  variants: SentenceVariant[]
  hint?: string
}

export interface GrammarVisualizerBlock extends BaseBlock {
  type: 'grammar-visualizer'
  title?: string
  sets: SentenceSet[]
}

export type Block =
  | TitleBlock
  | TextBlock
  | VideoBlock
  | ImageBlock
  | AudioBlock
  | QuizBlock
  | AssignmentBlock
  | FileBlock
  | EmbedBlock
  | TabGroupBlock
  | TabItemBlock
  | LayoutBlock
  | ColumnBlock
  | GrammarBlock
  | GrammarBlock
  | VocabularyBlock
  | FillBlanksBlock
  | MatchBlock
  | TrueFalseBlock
  | EssayBlock
  | RecordingBlock
  | StructuredContentBlock
  | GrammarVisualizerBlock

// Quiz question types
export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  options?: string[] // For multiple choice
  correctAnswer: string | string[]
  points: number
}

// Lesson structure
export interface Lesson {
  id: string
  title: string
  description: string
  order: number
  duration: number
  blocks: Block[]
  moduleId: string
  isPublished: boolean
}

// Module structure
export interface Module {
  id: string
  title: string
  description: string
  level: number
  order: number
  objectives: string
  isPublished: boolean
  lessons: Lesson[]
  courseId: string
}

// Course structure for builder
export interface CourseBuilderData {
  id: string
  title: string
  description: string
  language: string
  level: string
  classDuration: number
  image: string
  isPublished: boolean
  modules: Module[]
  createdById: string
}

// Block templates for the toolbar
export interface BlockTemplate {
  type: BlockType
  label: string
  icon: React.ElementType
  description: string
  defaultData: Block
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: 'title',
    label: 'Título',
    icon: Type,
    description: 'Section heading or title',
    defaultData: {
      id: '',
      type: 'title',
      order: 0,
      title: 'Nueva Sección',
    },
  },
  {
    type: 'text',
    label: 'Texto',
    icon: AlignLeft,
    description: 'Contenido de texto enriquecido',
    defaultData: {
      id: '',
      type: 'text',
      order: 0,
      content:
        '<p>En inglés, el <b>presente simple</b> se usa para hablar de hábitos, rutinas y hechos generales. Por ejemplo, decimos “<i>I work from home</i>” para expresar algo que ocurre de manera regular. Este tiempo verbal no indica que la acción esté ocurriendo ahora mismo, sino que es parte de la vida cotidiana o una verdad permanente.</p><p><br></p><p>La estructura del presente simple es sencilla. Con <i>I, you, we y they</i>, usamos el verbo en su forma base: “<i>They study English every day.</i>” Sin embargo, con <i>he, she y it</i>, el verbo suele llevar una <b>-s</b> al final: “<i>She studies English.</i>” Este pequeño cambio es muy importante y suele causar errores en estudiantes, así que conviene prestarle atención.</p><p><br></p><p>Para formar oraciones negativas y preguntas, usamos el auxiliar <b>do / does</b>. Por ejemplo: “<i>Do you like English?</i>” o “<i>She does not understand the rule yet.</i>” Al usar <i>does</i>, el verbo principal vuelve a su forma base. Dominar el presente simple te permitirá describir tu rutina, hablar de tus gustos y comunicar ideas básicas con claridad.</p>',
    },
  },
  {
    type: 'image',
    label: 'Imagen',
    icon: ImageIcon,
    description: 'Subir imagen o URL',
    defaultData: {
      id: '',
      type: 'image',
      order: 0,
      url: '',
      alt: '',
      caption: '',
    },
  },
  {
    type: 'video',
    label: 'Video',
    icon: Video,
    description: 'Video embebido o carga',
    defaultData: {
      id: '',
      type: 'video',
      order: 0,
      url: '',
      title: 'Título del Video',
      duration: 0,
    },
  },
  {
    type: 'grammar',
    label: 'Gramática',
    icon: Book,
    description: 'Reglas gramaticales y ejemplos',
    defaultData: {
      id: '',
      type: 'grammar',
      order: 0,
      title: 'Nueva Gramática',
      description: '<p>Explica la regla gramatical aquí (ej. estructura, uso, excepciones)...</p>',
      image: 'Book', // Use a default lucide icon name or URL
      examples: [],
    },
  },
  {
    type: 'vocabulary',
    label: 'Vocabulario',
    icon: Library,
    description: 'Lista de vocabulario con definiciones',
    defaultData: {
      id: '',
      type: 'vocabulary',
      order: 0,
      title: 'Nuevo Vocabulario',
      items: [
        {
          id: 'voc_default',
          term: 'Apple',
          definition: 'A round fruit with red or green skin and a whitish inside.',
          pronunciation: 'ap-pl',
          icon: 'Book',
          example: 'I eat an <b>apple</b> every day.',
        },
      ],
    },
  },
  {
    type: 'audio',
    label: 'Pronunciación',
    icon: Mic,
    description: 'Reproductor de audio con transcripción',
    defaultData: {
      id: '',
      type: 'audio',
      order: 0,
      title: 'Pista de Audio',
      url: '',
    },
  },
  {
    type: 'quiz',
    label: 'Quiz',
    icon: CheckSquare,
    description: 'Cuestionario de opción múltiple',
    defaultData: {
      id: '',
      type: 'quiz',
      order: 0,
      title: 'Quiz',
      questions: [],
    },
  },
  {
    type: 'fill_blanks',
    label: 'Rellenar Espacios',
    icon: Edit3,
    description: 'Ejercicio de llenar espacios en blanco',
    defaultData: {
      id: '',
      type: 'fill_blanks',
      order: 0,
      title: 'Rellenar Espacios',
      items: [{ id: '1', content: 'El cielo es [azul] y el pasto es [verde].' }],
    },
  },
  {
    type: 'match',
    label: 'Emparejar',
    icon: Shuffle,
    description: 'Ejercicio de emparejamiento',
    defaultData: {
      id: '',
      type: 'match',
      order: 0,
      pairs: [
        { id: '1', left: 'Perro', right: 'Dog' },
        { id: '2', left: 'Gato', right: 'Cat' },
      ],
    },
  },
  {
    type: 'true_false',
    label: 'Verdadero/Falso',
    icon: CheckCircle2,
    description: 'Pregunta de verdadero o falso',
    defaultData: {
      id: '',
      type: 'true_false',
      order: 0,
      title: 'Verdadero o Falso',
      items: [{ id: '1', statement: 'El sol es una estrella.', correctAnswer: true }],
    },
  },
  {
    type: 'essay',
    label: 'Ensayo',
    icon: FileSignature,
    description: 'Pregunta de desarrollo o ensayo',
    defaultData: {
      id: '',
      type: 'essay',
      order: 0,
      prompt: 'Describe tus vacaciones ideales.',
      minWords: 50,
    },
  },
  {
    type: 'recording',
    label: 'Grabación',
    icon: Mic,
    description: 'Grabación de audio del estudiante',
    defaultData: {
      id: '',
      type: 'recording',
      order: 0,
      instruction: 'Graba una presentación de ti mismo.',
      timeLimit: 60,
    },
  },
  {
    type: 'file',
    label: 'Recursos',
    icon: Download,
    description: 'Archivo para que los estudiantes descarguen',
    defaultData: {
      id: '',
      type: 'file',
      order: 0,
      title: 'Materiales del Curso',
      description: 'Descarga los recursos necesarios para esta lección.',
      files: [],
    },
  },
  {
    type: 'embed',
    label: 'Embebido',
    icon: LinkIcon,
    description: 'Embed external content',
    defaultData: {
      id: '',
      type: 'embed',
      order: 0,
      url: '',
      title: 'Embedded Content',
    },
  },
  {
    type: 'structured-content',
    label: 'Contenido Estructurado',
    icon: Table,
    description: 'Tablas y contenido organizado',
    defaultData: {
      id: '',
      type: 'structured-content',
      order: 0,
      title: 'Nueva Tabla',
      subtitle: 'Descripción opcional',
      config: {
        hasHeaderRow: true,
        hasStripedRows: false,
        hasBorders: true,
      },
      content: {
        headers: ['Columna 1', 'Columna 2'],
        rows: [
          ['Dato 1', 'Dato 2'],
          ['Dato 3', 'Dato 4'],
        ],
      },
    },
  },
  {
    type: 'grammar-visualizer',
    label: 'Visualizador Gramatical',
    icon: Blocks,
    description: 'Constructor de oraciones interactivo',
    defaultData: {
      id: '',
      type: 'grammar-visualizer',
      order: 0,
      title: 'Nuevo Visualizador Gramatical',
      sets: [
        {
          id: 'set-default',
          title: 'Presente Simple - To Be',
          hint: 'Úsalo para describir estados o identidades.',
          variants: [
            {
              id: 'var-default-1',
              label: 'Afirmativo',
              rawSentence: 'I am a student.',
              tokens: [
                { id: 't1', content: 'I', grammarType: 'subject' },
                { id: 't2', content: 'am', grammarType: 'verb' },
                { id: 't3', content: 'a', grammarType: 'article' },
                { id: 't4', content: 'student', grammarType: 'object' },
                { id: 't5', content: '.', grammarType: 'punctuation' },
              ],
            },
          ],
        },
      ],
    },
  },
]
