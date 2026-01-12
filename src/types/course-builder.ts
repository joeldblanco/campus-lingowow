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
  CircleDot,
  MessageSquare,
  ArrowUpDown,
  GripHorizontal,
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
  | 'multiple_choice'
  | 'short_answer'
  | 'ordering'
  | 'drag_drop'
  | 'multi_select'

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
  // Google Slides specific options
  autoplay?: boolean
  loop?: boolean
  delayMs?: number // Delay between slides in milliseconds (default 3000)
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
  aiGrading?: boolean
  aiGradingConfig?: {
    language: 'english' | 'spanish'
    targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
    rubric?: {
      grammar: number
      vocabulary: number
      coherence: number
      taskCompletion: number
    }
  }
}

export interface MultipleChoiceBlock extends BaseBlock {
  type: 'multiple_choice'
  question: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation?: string
  points?: number
}

export interface ShortAnswerItem {
  id: string
  question: string
  correctAnswer: string
}

export interface ShortAnswerBlock extends BaseBlock {
  type: 'short_answer'
  items: ShortAnswerItem[] // Multiple questions as steps
  context?: string // Reading passage or context for the questions
  caseSensitive?: boolean
  explanation?: string
  points?: number
}

export interface OrderingBlock extends BaseBlock {
  type: 'ordering'
  title?: string
  instruction?: string
  items: { id: string; text: string; correctPosition: number }[]
  points?: number
}

export interface DragDropBlock extends BaseBlock {
  type: 'drag_drop'
  title?: string
  instruction?: string
  categories: { id: string; name: string }[]
  items: { id: string; text: string; correctCategoryId: string }[]
  points?: number
}

export interface MultiSelectBlock extends BaseBlock {
  type: 'multi_select'
  title?: string
  instruction?: string
  correctOptions: { id: string; text: string }[]
  incorrectOptions: { id: string; text: string }[]
  points?: number
  explanation?: string
}

export interface RecordingBlock extends BaseBlock {
  type: 'recording'
  instruction?: string
  prompt?: string // Alternative to instruction (from import script)
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
  | 'action-verb'
  | 'auxiliary-verb'
  | 'linking-verb'
  | 'direct-object'
  | 'indirect-object'
  | 'subject-complement'
  | 'object-complement'
  | 'adjective'
  | 'adverb'
  | 'adverbial-complement'
  | 'determiner'
  | 'article'
  | 'pronoun'
  | 'possessive-pronoun'
  | 'preposition'
  | 'prepositional-object'
  | 'conjunction'
  | 'interjection'
  | 'negation'
  | 'modal-verb'
  | 'infinitive'
  | 'gerund'
  | 'relative-pronoun'
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
  description?: string
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
  | MultipleChoiceBlock
  | ShortAnswerBlock
  | OrderingBlock
  | DragDropBlock
  | MultiSelectBlock
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
  moduleId: string | null
  isPublished: boolean
  // Optional fields for personalized lessons
  studentId?: string | null
  teacherId?: string | null
  enrollmentId?: string | null
}

// Module structure
export interface Module {
  id: string
  title: string
  description: string
  level: string
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
      aiGrading: false,
      aiGradingConfig: {
        language: 'spanish',
        targetLevel: 'B1',
      },
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
    label: 'Tabla',
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
          variants: [
            {
              id: 'var-default-1',
              label: 'Afirmativo',
              rawSentence: 'I am a student.',
              tokens: [
                { id: 't1', content: 'I', grammarType: 'subject' },
                { id: 't2', content: 'am', grammarType: 'linking-verb' },
                { id: 't3', content: 'a', grammarType: 'article' },
                { id: 't4', content: 'student', grammarType: 'subject-complement' },
                { id: 't5', content: '.', grammarType: 'punctuation' },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    type: 'multiple_choice',
    label: 'Opción Múltiple',
    icon: CircleDot,
    description: 'Pregunta con opciones de respuesta',
    defaultData: {
      id: '',
      type: 'multiple_choice',
      order: 0,
      question: '¿Cuál es la respuesta correcta?',
      options: [
        { id: 'opt1', text: 'Opción A' },
        { id: 'opt2', text: 'Opción B' },
        { id: 'opt3', text: 'Opción C' },
        { id: 'opt4', text: 'Opción D' },
      ],
      correctOptionId: 'opt1',
      points: 10,
    },
  },
  {
    type: 'short_answer',
    label: 'Respuesta Corta',
    icon: MessageSquare,
    description: 'Pregunta con respuesta de texto breve',
    defaultData: {
      id: '',
      type: 'short_answer',
      order: 0,
      items: [{ id: 'item1', question: 'Escribe tu respuesta:', correctAnswer: 'respuesta' }],
      context: '',
      caseSensitive: false,
      points: 10,
    },
  },
  {
    type: 'ordering',
    label: 'Ordenar',
    icon: ArrowUpDown,
    description: 'Ordenar elementos en la secuencia correcta',
    defaultData: {
      id: '',
      type: 'ordering',
      order: 0,
      title: 'Ordena los elementos',
      instruction: 'Arrastra los elementos para ordenarlos correctamente.',
      items: [
        { id: 'item1', text: 'Primero', correctPosition: 0 },
        { id: 'item2', text: 'Segundo', correctPosition: 1 },
        { id: 'item3', text: 'Tercero', correctPosition: 2 },
      ],
      points: 10,
    },
  },
  {
    type: 'drag_drop',
    label: 'Arrastrar y Soltar',
    icon: GripHorizontal,
    description: 'Clasificar elementos en categorías',
    defaultData: {
      id: '',
      type: 'drag_drop',
      order: 0,
      title: 'Clasifica los elementos',
      instruction: 'Arrastra cada elemento a la categoría correcta.',
      categories: [
        { id: 'cat1', name: 'Categoría A' },
        { id: 'cat2', name: 'Categoría B' },
      ],
      items: [
        { id: 'item1', text: 'Elemento 1', correctCategoryId: 'cat1' },
        { id: 'item2', text: 'Elemento 2', correctCategoryId: 'cat2' },
      ],
      points: 10,
    },
  },
  {
    type: 'multi_select',
    label: 'Selección Múltiple',
    icon: CheckSquare,
    description: 'Seleccionar varias opciones correctas de un grupo',
    defaultData: {
      id: '',
      type: 'multi_select',
      order: 0,
      title: 'Selecciona las opciones correctas',
      instruction: 'Selecciona todas las opciones que sean correctas.',
      correctOptions: [
        { id: 'correct1', text: 'Opción correcta 1' },
        { id: 'correct2', text: 'Opción correcta 2' },
      ],
      incorrectOptions: [
        { id: 'incorrect1', text: 'Opción incorrecta 1' },
        { id: 'incorrect2', text: 'Opción incorrecta 2' },
      ],
      points: 10,
      explanation: 'Las opciones correctas son aquellas que cumplen con el criterio.',
    },
  },
]
