import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { mapContentToBlock } from '@/lib/content-mapper'
import {
  updateBlocksRequestSchema,
  addBlocksRequestSchema,
} from '@/lib/validations/lesson-builder-api'
import { Block } from '@/types/course-builder'
import { ContentType, Prisma } from '@prisma/client'
import crypto from 'crypto'

// Generate a cuid-like ID
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 25)
}

// Helper to verify lesson access
async function verifyLessonAccess(lessonId: string, userId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: {
              createdById: true,
            },
          },
        },
      },
      contents: {
        where: { parentId: null },
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!lesson) {
    return { error: 'Lesson not found', status: 404 }
  }

  if (lesson.module.course.createdById !== userId) {
    return { error: 'Unauthorized', status: 403 }
  }

  return { lesson }
}

// Helper to map BlockType to ContentType
function mapBlockTypeToContentType(type: string): ContentType {
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
    case 'column':
    case 'container':
      return 'CONTAINER'
    default:
      return 'RICH_TEXT'
  }
}

// Recursive function to save blocks
async function saveBlocks(
  lessonId: string,
  blocks: Block[],
  parentId: string | null,
  tx: Prisma.TransactionClient,
  startOrder: number = 0
) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockId = block.id && block.id.length > 10 ? block.id : generateId()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, order, children, ...rest } = block
    const blockData = { ...rest }
    const contentType = mapBlockTypeToContentType(block.type)

    const savedContent = await tx.content.upsert({
      where: { id: blockId },
      create: {
        id: blockId,
        lessonId,
        parentId,
        order: startOrder + i,
        contentType,
        title: (block as { title?: string }).title || '',
        data: blockData as Prisma.InputJsonValue,
      },
      update: {
        order: startOrder + i,
        contentType,
        parentId,
        title: (block as { title?: string }).title || '',
        data: blockData as Prisma.InputJsonValue,
      },
    })

    // Recursive save children
    if (children && children.length > 0) {
      await saveBlocks(lessonId, children, savedContent.id, tx)
    }
  }
}

/**
 * GET /api/lessons/[lessonId]/blocks
 * Get all blocks for a lesson
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const blocks = result.lesson.contents.map((c) => mapContentToBlock(c))

    return NextResponse.json({
      success: true,
      data: {
        lessonId: result.lesson.id,
        title: result.lesson.title,
        blocks,
      },
    })
  } catch (error) {
    console.error('Error fetching lesson blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/lessons/[lessonId]/blocks
 * Replace all blocks in a lesson
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const validation = updateBlocksRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { blocks } = validation.data as { blocks: Block[] }

    await db.$transaction(async (tx) => {
      // Collect all IDs from the new block structure
      const getAllIds = (blks: Block[]): string[] => {
        return blks.reduce((acc: string[], blk) => {
          let ids = blk.id && blk.id.length > 10 ? [blk.id] : []
          if (blk.children) ids = [...ids, ...getAllIds(blk.children)]
          return [...acc, ...ids]
        }, [])
      }

      const keptIds = getAllIds(blocks)

      // Delete removed contents
      if (keptIds.length > 0) {
        await tx.content.deleteMany({
          where: {
            lessonId,
            id: { notIn: keptIds },
          },
        })
      } else {
        await tx.content.deleteMany({ where: { lessonId } })
      }

      // Save new blocks
      await saveBlocks(lessonId, blocks, null, tx)

      // Update lesson timestamp
      await tx.lesson.update({
        where: { id: lessonId },
        data: { updatedAt: new Date() },
      })
    })

    // Fetch updated blocks
    const updatedLesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    const updatedBlocks = updatedLesson?.contents.map((c) => mapContentToBlock(c)) || []

    return NextResponse.json({
      success: true,
      data: {
        lessonId,
        blocks: updatedBlocks,
      },
    })
  } catch (error) {
    console.error('Error updating lesson blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/lessons/[lessonId]/blocks
 * Add new blocks to a lesson (append or insert at position)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const validation = addBlocksRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { blocks, position } = validation.data as { blocks: Block[]; position?: number }

    // Get current blocks
    const currentBlocks = result.lesson.contents.map((c) => mapContentToBlock(c)) as Block[]

    // Insert new blocks at position or append
    let newBlocks: Block[]
    if (position !== undefined && position < currentBlocks.length) {
      newBlocks = [
        ...currentBlocks.slice(0, position),
        ...blocks,
        ...currentBlocks.slice(position),
      ]
    } else {
      newBlocks = [...currentBlocks, ...blocks]
    }

    // Reorder blocks
    newBlocks = newBlocks.map((block, index) => ({ ...block, order: index }))

    await db.$transaction(async (tx) => {
      // Delete all existing content
      await tx.content.deleteMany({ where: { lessonId } })

      // Save all blocks with new order
      await saveBlocks(lessonId, newBlocks, null, tx)

      // Update lesson timestamp
      await tx.lesson.update({
        where: { id: lessonId },
        data: { updatedAt: new Date() },
      })
    })

    // Fetch updated blocks
    const updatedLesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        contents: {
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    const updatedBlocks = updatedLesson?.contents.map((c) => mapContentToBlock(c)) || []

    return NextResponse.json({
      success: true,
      data: {
        lessonId,
        blocksAdded: blocks.length,
        totalBlocks: updatedBlocks.length,
        blocks: updatedBlocks,
      },
    })
  } catch (error) {
    console.error('Error adding lesson blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
