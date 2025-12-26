import { Content as PrismaContent, ContentType } from '@prisma/client'
import { Block, BlockType } from '@/types/course-builder'

// Helper to map BlockType to ContentType (Reverse mapping if needed later)
export const mapBlockTypeToContentType = (type: BlockType): ContentType => {
  switch (type) {
    case 'text':
      return 'RICH_TEXT'
    case 'video':
      return 'VIDEO'
    case 'image':
      return 'IMAGE'
    case 'audio':
      return 'AUDIO'
    case 'quiz':
      return 'ACTIVITY'
    case 'tab_group':
      return 'TAB_GROUP'
    case 'tab_item':
      return 'TAB_ITEM'
    case 'layout':
      return 'CONTAINER'
    case 'column':
      return 'CONTAINER'
    case 'container':
      return 'CONTAINER'
    default:
      return 'RICH_TEXT'
  }
}

// Helper to map Content to Block
export const mapContentToBlock = (
  content: PrismaContent & { children?: (PrismaContent & { children?: PrismaContent[] })[] }
): Block => {
  // Map ContentType to BlockType
  let type: BlockType = 'text'
  switch (content.contentType) {
    case 'RICH_TEXT':
      type = 'text'
      break
    case 'VIDEO':
      type = 'video'
      break
    case 'IMAGE':
      type = 'image'
      break
    case 'AUDIO':
      type = 'audio'
      break
    case 'ACTIVITY':
      type = 'quiz'
      break
    case 'TAB_GROUP':
      type = 'tab_group'
      break
    case 'TAB_ITEM':
      type = 'tab_item'
      break
    case 'CONTAINER':
      // Differentiate based on stored type in data, or default
      if ((content.data as any)?.type === 'layout') {
        type = 'layout'
      } else if ((content.data as any)?.type === 'column') {
        type = 'column'
      } else {
        type = 'container'
      }
      break
    default:
      // Handle legacy or mapped types
      if (content.contentType === ('GRAMMAR_CARD' as any)) type = 'grammar' as any
      else if (content.contentType === ('VOCABULARY_LIST' as any)) type = 'vocabulary' as any
      else if (content.contentType === ('ASSIGNMENT' as any)) type = 'assignment' as any
      else type = 'text'
      break
  }

  const data = (content.data as any) || {}

  // Override type from data if it exists (e.g. for specific custom blocks stored as RICH_TEXT or CONTAINER)
  if (data.type) {
    type = data.type
  }

  return {
    id: content.id,
    order: content.order,
    type,
    ...data,
    // If content has legacy text content or HTML, ensure it's mapped
    content: data.content || data.html || '',
    // Recursive children
    children: content.children
      ? content.children.sort((a, b) => a.order - b.order).map((c: any) => mapContentToBlock(c))
      : [],
  } as Block
}
