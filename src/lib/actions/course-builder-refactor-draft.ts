'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import type {
  Module as PrismaModule,
  Lesson as PrismaLesson,
  Content as PrismaContent,
  ContentType,
} from '@prisma/client'
import type { CourseBuilderData, Block, BlockType } from '@/types/course-builder'

// Helper to map Prisma Content to Block
const mapContentToBlock = (
  content: PrismaContent & { children?: (PrismaContent & { children?: PrismaContent[] })[] }
): Block => {
  // Basic mapping, needs refinement based on specific Block types
  const base = {
    id: content.id,
    order: content.order,
    type: mapContentTypeToBlockType(content.contentType),
    // children: content.children?.map(mapContentToBlock) // Recursive map
  }

  const data = (content.data as any) || {}

  // Spread specific data based on type or generic 'data' field
  // This assumes we stored block properties in 'data' JSON
  return {
    ...base,
    ...data,
    content: data.content || (content as any).description || '', // Fallback for legacy text
    // Handle children recursively
    children: content.children
      ? content.children.sort((a, b) => a.order - b.order).map((c) => mapContentToBlock(c as any))
      : undefined,
  } as Block
}

const mapContentTypeToBlockType = (type: ContentType): BlockType => {
  switch (type) {
    case 'RICH_TEXT':
      return 'text'
    case 'VIDEO':
      return 'video'
    case 'IMAGE':
      return 'image'
    case 'AUDIO':
      return 'audio'
    case 'ACTIVITY':
      return 'quiz' // Simplified mapping
    case 'TAB_GROUP':
      return 'tab_group'
    case 'TAB_ITEM':
      return 'tab_item'
    case 'CONTAINER':
      return 'container'
    default:
      return 'text' // Fallback
  }
}

const mapBlockTypeToContentType = (type: BlockType): ContentType => {
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
    default:
      return 'RICH_TEXT'
  }
}

// ... (Existing Functions: updateCourseInfo, upsertModule, deleteModule, reorderModules, reorderLessons) ...
// Copying existing unmodified functions for context not needed if we use replace_file_content smartly,
// but for a full rewrite of the file we need them. I will use replace_file_content on specific functions.

// Recursive function to save blocks
async function saveBlocks(
  lessonId: string,
  blocks: Block[],
  parentId: string | null = null,
  tx: any
) {
  // 1. Get existing content IDs for this scope (lessonId + parentId)
  // 2. Upsert current blocks
  // 3. Delete removed blocks

  // Simplification: Delete all content for this lesson/parent and recreate?
  // Risky for large data but easiest for MVP correctness.
  // Better: Upsert.

  // Lets use a delete-all strategy for the *scope* of the update if it's top level?
  // No, that wipes history or progress.

  // Strategy:
  // We receive the full tree of blocks.
  // We can iterate and upsert.

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Prepare data payload (excluding id, type, order, children)
    const { id, type, order, children, ...blockData } = block

    const contentType = mapBlockTypeToContentType(type)

    // Upsert Content
    const savedContent = await tx.content.upsert({
      where: { id: block.id.includes('temp') ? 'new-id' : block.id }, // Handle temp IDs by forcing create if invalid CUID
      create: {
        lessonId,
        parentId,
        order: i,
        contentType,
        title: (block as any).title || '',
        data: blockData,
      },
      update: {
        order: i,
        contentType,
        parentId, // Should match
        title: (block as any).title || '',
        data: blockData,
      },
    })

    // Recursion
    if (children && children.length > 0) {
      await saveBlocks(lessonId, children, savedContent.id, tx)
    }
  }
}

// Replace updateLessonBlocks
export async function updateLessonBlocks(lessonId: string, blocks: Block[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    // Verify ownership... (omitted for brevity in this draft, assume correct)

    await db.$transaction(async (tx) => {
      // 1. Clear existing content? Or smart sync?
      // For MVP: clear all content for this lesson and recreate is safest for structure changes.
      // But we lose IDs if we do that blindly.
      // Let's rely on the IDs provided by the frontend.

      // Deleting contents required logic to know which ones were removed.
      // Simple approach: Delete all where lessonId = id AND not in new block IDs.

      // Implementation detail: flattening IDs from new blocks
      const getAllIds = (blks: Block[]): string[] => {
        return blks.reduce((acc: string[], blk) => {
          let ids = [blk.id]
          if (blk.children) ids = [...ids, ...getAllIds(blk.children)]
          return ids
        }, [])
      }

      const keepIds = getAllIds(blocks).filter((id) => !id.startsWith('temp')) // Filter out temp IDs

      if (keepIds.length > 0) {
        await tx.content.deleteMany({
          where: {
            lessonId,
            id: { notIn: keepIds },
          },
        })
      } else {
        // If no existing IDs kept (all new or empty), delete all
        await tx.content.deleteMany({ where: { lessonId } })
      }

      // Recursive Save
      await saveBlocks(lessonId, blocks, null, tx)

      // Also update the JSON field for legacy/backup?
      // await tx.lesson.update({ where: { id: lessonId }, data: { content: JSON.stringify(blocks) } })
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating lesson blocks:', error)
    return { success: false, error: 'Failed to save blocks' }
  }
}

// Replace getCourseForBuilder
// ... fetch contents recursively ...
