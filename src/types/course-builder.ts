// Base block type with discriminated union for different content types
export interface BaseBlock {
  id: string
  type: BlockType
  order: number
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
  width?: number
  height?: number
}

export interface AudioBlock extends BaseBlock {
  type: 'audio'
  url: string
  title?: string
  duration?: number
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

export interface FileBlock extends BaseBlock {
  type: 'file'
  url: string
  filename: string
  filesize: number
  fileType: string
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed'
  url: string
  title?: string
  height?: number
}

export type Block = TextBlock | VideoBlock | ImageBlock | AudioBlock | QuizBlock | AssignmentBlock | FileBlock | EmbedBlock

export type BlockType = Block['type']

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
  icon: string
  description: string
  defaultData: Block
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: 'text',
    label: 'Texto',
    icon: '📝',
    description: 'Agregar contenido de texto',
    defaultData: {
      id: '',
      type: 'text',
      order: 0,
      content: '',
      format: 'markdown'
    }
  },
  {
    type: 'video',
    label: 'Video',
    icon: '🎥',
    description: 'Insertar video de YouTube o Vimeo',
    defaultData: {
      id: '',
      type: 'video',
      order: 0,
      url: '',
      title: '',
      duration: 0
    }
  },
  {
    type: 'image',
    label: 'Imagen',
    icon: '🖼️',
    description: 'Subir o insertar imagen',
    defaultData: {
      id: '',
      type: 'image',
      order: 0,
      url: '',
      alt: '',
      caption: ''
    }
  },
  {
    type: 'audio',
    label: 'Audio',
    icon: '🎵',
    description: 'Agregar archivo de audio',
    defaultData: {
      id: '',
      type: 'audio',
      order: 0,
      url: '',
      title: '',
      duration: 0
    }
  },
  {
    type: 'quiz',
    label: 'Quiz',
    icon: '📋',
    description: 'Crear quiz interactivo',
    defaultData: {
      id: '',
      type: 'quiz',
      order: 0,
      title: '',
      questions: [],
      passingScore: 70
    }
  },
  {
    type: 'assignment',
    label: 'Tarea',
    icon: '📚',
    description: 'Asignar tarea para estudiantes',
    defaultData: {
      id: '',
      type: 'assignment',
      order: 0,
      title: '',
      description: '',
      submissionType: 'text'
    }
  },
  {
    type: 'file',
    label: 'Archivo',
    icon: '📎',
    description: 'Adjuntar archivo PDF, DOC, etc.',
    defaultData: {
      id: '',
      type: 'file',
      order: 0,
      url: '',
      filename: '',
      filesize: 0,
      fileType: ''
    }
  },
  {
    type: 'embed',
    label: 'Embed',
    icon: '🔗',
    description: 'Insertar contenido externo',
    defaultData: {
      id: '',
      type: 'embed',
      order: 0,
      url: '',
      title: '',
      height: 400
    }
  }
]
