export type ArticleBlockType = 
  | 'text'
  | 'heading'
  | 'key-rule'
  | 'grammar-table'
  | 'examples-in-context'
  | 'video'
  | 'image'
  | 'callout'
  | 'divider'

export interface ArticleBlockBase {
  id: string
  type: ArticleBlockType
  order: number
}

export interface TextBlock extends ArticleBlockBase {
  type: 'text'
  content: string
}

export interface HeadingBlock extends ArticleBlockBase {
  type: 'heading'
  content: string
  level: 'h2' | 'h3' | 'h4'
}

export interface KeyRuleBlock extends ArticleBlockBase {
  type: 'key-rule'
  title: string
  description: string
  items: string[]
  variant: 'info' | 'warning' | 'tip' | 'important'
}

export interface GrammarTableColumn {
  id: string
  header: string
}

export interface GrammarTableRow {
  id: string
  cells: Record<string, string>
}

export interface GrammarTableBlock extends ArticleBlockBase {
  type: 'grammar-table'
  title: string
  caption?: string
  columns: GrammarTableColumn[]
  rows: GrammarTableRow[]
  highlightFirstColumn?: boolean
}

export interface ExampleItem {
  id: string
  sentence: string
  explanation: string
  type: 'correct' | 'incorrect' | 'neutral'
}

export interface ExamplesInContextBlock extends ArticleBlockBase {
  type: 'examples-in-context'
  title: string
  description?: string
  examples: ExampleItem[]
}

export interface VideoBlock extends ArticleBlockBase {
  type: 'video'
  url: string
  caption?: string
  provider?: 'youtube' | 'vimeo' | 'custom'
}

export interface ImageBlock extends ArticleBlockBase {
  type: 'image'
  url: string
  alt: string
  caption?: string
  alignment?: 'left' | 'center' | 'right'
}

export interface CalloutBlock extends ArticleBlockBase {
  type: 'callout'
  content: string
  variant: 'info' | 'warning' | 'success' | 'error'
  title?: string
}

export interface DividerBlock extends ArticleBlockBase {
  type: 'divider'
}

export type ArticleBlock = 
  | TextBlock
  | HeadingBlock
  | KeyRuleBlock
  | GrammarTableBlock
  | ExamplesInContextBlock
  | VideoBlock
  | ImageBlock
  | CalloutBlock
  | DividerBlock

export interface ArticleContent {
  blocks: ArticleBlock[]
  version: number
}

export const ARTICLE_BLOCK_TEMPLATES: {
  type: ArticleBlockType
  label: string
  description: string
  icon: string
  category: 'content' | 'educational' | 'media' | 'layout'
}[] = [
  {
    type: 'text',
    label: 'Texto',
    description: 'Párrafo de texto enriquecido',
    icon: 'Type',
    category: 'content',
  },
  {
    type: 'heading',
    label: 'Encabezado',
    description: 'Título o subtítulo de sección',
    icon: 'Heading',
    category: 'content',
  },
  {
    type: 'key-rule',
    label: 'Regla Clave',
    description: 'Destaca una regla gramatical importante',
    icon: 'Lightbulb',
    category: 'educational',
  },
  {
    type: 'grammar-table',
    label: 'Tabla Gramatical',
    description: 'Tabla comparativa de conjugaciones o formas',
    icon: 'Table',
    category: 'educational',
  },
  {
    type: 'examples-in-context',
    label: 'Ejemplos en Contexto',
    description: 'Oraciones de ejemplo con explicaciones',
    icon: 'MessageSquareQuote',
    category: 'educational',
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Incrustar video de YouTube o Vimeo',
    icon: 'Video',
    category: 'media',
  },
  {
    type: 'image',
    label: 'Imagen',
    description: 'Añadir una imagen al artículo',
    icon: 'Image',
    category: 'media',
  },
  {
    type: 'callout',
    label: 'Nota Destacada',
    description: 'Información importante o advertencia',
    icon: 'AlertCircle',
    category: 'content',
  },
  {
    type: 'divider',
    label: 'Separador',
    description: 'Línea divisoria entre secciones',
    icon: 'Minus',
    category: 'layout',
  },
]

export function createEmptyBlock(type: ArticleBlockType, order: number): ArticleBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  switch (type) {
    case 'text':
      return { id, type, order, content: '' }
    case 'heading':
      return { id, type, order, content: '', level: 'h2' }
    case 'key-rule':
      return { 
        id, type, order, 
        title: 'Regla Clave', 
        description: '', 
        items: [],
        variant: 'info'
      }
    case 'grammar-table':
      return {
        id, type, order,
        title: 'Tabla Gramatical',
        columns: [
          { id: 'col-1', header: 'Columna 1' },
          { id: 'col-2', header: 'Columna 2' },
        ],
        rows: [
          { id: 'row-1', cells: { 'col-1': '', 'col-2': '' } },
        ],
        highlightFirstColumn: false,
      }
    case 'examples-in-context':
      return {
        id, type, order,
        title: 'Ejemplos en Contexto',
        examples: [],
      }
    case 'video':
      return { id, type, order, url: '' }
    case 'image':
      return { id, type, order, url: '', alt: '' }
    case 'callout':
      return { id, type, order, content: '', variant: 'info' }
    case 'divider':
      return { id, type, order }
    default:
      return { id, type: 'text', order, content: '' }
  }
}

export function parseArticleContent(content: string | null): ArticleContent {
  if (!content) {
    return { blocks: [], version: 1 }
  }
  
  try {
    const parsed = JSON.parse(content)
    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      return parsed as ArticleContent
    }
    return { blocks: [], version: 1 }
  } catch {
    return { blocks: [], version: 1 }
  }
}

export function serializeArticleContent(content: ArticleContent): string {
  return JSON.stringify(content)
}
