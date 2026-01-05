import { LibraryResourceType, LibraryResourceStatus, LibraryResourceAccess } from '@prisma/client'

export interface LibraryCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  _count?: {
    resources: number
  }
}

export interface LibraryResourceAuthor {
  id: string
  name: string
  lastName: string | null
  image: string | null
  bio?: string | null
}

export interface LibraryResource {
  id: string
  title: string
  slug: string
  description: string | null
  excerpt: string | null
  type: LibraryResourceType
  status: LibraryResourceStatus
  accessLevel: LibraryResourceAccess
  content: string | null
  fileUrl: string | null
  fileSize: number | null
  fileFormat: string | null
  thumbnailUrl: string | null
  duration: number | null
  language: string
  level: string | null
  tags: string[]
  categoryId: string | null
  authorId: string
  viewCount: number
  downloadCount: number
  likeCount: number
  metaTitle: string | null
  metaDescription: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  category: LibraryCategory | null
  author: LibraryResourceAuthor
  _count?: {
    userLikes: number
    userSaves: number
  }
}

export interface LibraryResourcesResponse {
  resources: LibraryResource[]
  featuredResource: LibraryResource | null
  popularResources: LibraryResource[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LibraryResourceDetailResponse {
  resource: LibraryResource
  userInteraction: {
    hasLiked: boolean
    hasSaved: boolean
  } | null
  relatedResources: LibraryResource[]
}

export const RESOURCE_TYPE_LABELS: Record<LibraryResourceType, string> = {
  ARTICLE: 'Artículo',
  PDF: 'PDF',
  IMAGE: 'Imagen',
  AUDIO: 'Audio',
  VIDEO: 'Video',
  INFOGRAPHIC: 'Infografía',
  TEMPLATE: 'Plantilla',
  EXERCISE_SHEET: 'Ejercicios',
  GRAMMAR_GUIDE: 'Gramática',
  VOCABULARY_LIST: 'Vocabulario',
  OTHER: 'Otro',
}

export const RESOURCE_TYPE_ICONS: Record<LibraryResourceType, string> = {
  ARTICLE: 'FileText',
  PDF: 'FileIcon',
  IMAGE: 'Image',
  AUDIO: 'Headphones',
  VIDEO: 'Video',
  INFOGRAPHIC: 'BarChart3',
  TEMPLATE: 'FileCode',
  EXERCISE_SHEET: 'ClipboardList',
  GRAMMAR_GUIDE: 'BookOpen',
  VOCABULARY_LIST: 'List',
  OTHER: 'File',
}

export const LEVEL_LABELS: Record<string, string> = {
  A1: 'Principiante (A1)',
  A2: 'Elemental (A2)',
  B1: 'Intermedio (B1)',
  B2: 'Intermedio Alto (B2)',
  C1: 'Avanzado (C1)',
  C2: 'Maestría (C2)',
}

export const ACCESS_LEVEL_LABELS: Record<string, string> = {
  PUBLIC: 'Público',
  PRIVATE: 'Suscriptores',
  PREMIUM: 'Premium',
}

export const ACCESS_LEVEL_DESCRIPTIONS: Record<string, string> = {
  PUBLIC: 'Disponible para todos',
  PRIVATE: 'Solo para suscriptores (Go, Lingo, Wow)',
  PREMIUM: 'Exclusivo para plan Wow',
}
