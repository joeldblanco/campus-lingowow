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

// Helper to map Block to Content data (excluding id, type, order, children)
export const mapBlockToContentData = (block: Block): Record<string, unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, type, order, children, ...rest } = block
  return rest
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
      const data = content.data as { type?: string } | null
      if (data?.type === 'layout') {
        type = 'layout'
      } else if (data?.type === 'column') {
        type = 'column'
      } else {
        type = 'container'
      }
      break
    default:
      type = 'text'
      break
  }

  const data = (content.data as Record<string, unknown>) || {}

  const base = {
    id: content.id,
    order: content.order,
  }

  // Override type from data if it exists (e.g. for specific custom blocks stored as RICH_TEXT or CONTAINER)
  // This handles blocks like 'recording', 'essay', 'fill_blanks', etc. that don't have their own ContentType
  if (data.type && typeof data.type === 'string') {
    type = data.type as BlockType
  }

  return {
    ...base,
    ...data,
    type, // Ensure type is correct
    // If content has legacy text content or HTML, ensure it's mapped
    content: (data.content as string) || (data.html as string) || '',
    // Recursive children
    children: content.children
      ? content.children.sort((a, b) => a.order - b.order).map((c) => mapContentToBlock(c))
      : [],
  } as Block
}
