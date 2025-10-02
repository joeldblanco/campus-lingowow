import { Prisma } from '@prisma/client'

// Tipo para el contenido estructurado del blog
export interface BlogContentSection {
  type: 'paragraph' | 'section' | 'highlight' | 'list'
  number?: string | number
  title?: string
  content?: string
  variant?: 'info' | 'warning' | 'success'
  items?: string[]
  ordered?: boolean
  children?: BlogContentSection[]
}

export interface BlogContent {
  sections: BlogContentSection[]
}

// Tipo para el blog post completo con autor
export type BlogPostWithAuthor = Prisma.BlogPostGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        lastName: true
        image: true
        bio: true
      }
    }
  }
}>

// Tipo para el blog post en listados
export type BlogPostListItem = Prisma.BlogPostGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        lastName: true
        image: true
      }
    }
  }
}>
