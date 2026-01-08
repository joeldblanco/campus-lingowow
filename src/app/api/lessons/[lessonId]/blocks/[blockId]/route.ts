import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { mapContentToBlock } from '@/lib/content-mapper'
import { updateSingleBlockRequestSchema } from '@/lib/validations/lesson-builder-api'
import { Block } from '@/types/course-builder'
import { ContentType, Prisma } from '@prisma/client'

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
    },
  })

  if (!lesson) {
    return { error: 'Lesson not found', status: 404 }
  }

  if (lesson.module && lesson.module.course.createdById !== userId) {
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

/**
 * GET /api/lessons/[lessonId]/blocks/[blockId]
 * Get a specific block
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:read'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId, blockId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const content = await db.content.findUnique({
      where: { id: blockId },
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
    })

    if (!content || content.lessonId !== lessonId) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    const block = mapContentToBlock(content)

    return NextResponse.json({
      success: true,
      data: block,
    })
  } catch (error) {
    console.error('Error fetching block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/lessons/[lessonId]/blocks/[blockId]
 * Update a specific block
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId, blockId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Verify block exists and belongs to lesson
    const existingContent = await db.content.findUnique({
      where: { id: blockId },
    })

    if (!existingContent || existingContent.lessonId !== lessonId) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateSingleBlockRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const blockData = validation.data as Block

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, order, children, ...rest } = blockData
    const contentType = mapBlockTypeToContentType(blockData.type)

    const updatedContent = await db.content.update({
      where: { id: blockId },
      data: {
        contentType,
        title: (blockData as { title?: string }).title || existingContent.title,
        data: rest as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
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
    })

    // Update lesson timestamp
    await db.lesson.update({
      where: { id: lessonId },
      data: { updatedAt: new Date() },
    })

    const block = mapContentToBlock(updatedContent)

    return NextResponse.json({
      success: true,
      data: block,
    })
  } catch (error) {
    console.error('Error updating block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/lessons/[lessonId]/blocks/[blockId]
 * Delete a specific block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request, ['lessons:write'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { lessonId, blockId } = await params
    const result = await verifyLessonAccess(lessonId, authResult.userId!)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Verify block exists and belongs to lesson
    const existingContent = await db.content.findUnique({
      where: { id: blockId },
    })

    if (!existingContent || existingContent.lessonId !== lessonId) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    // Delete block (cascade will delete children)
    await db.content.delete({
      where: { id: blockId },
    })

    // Reorder remaining blocks
    const remainingBlocks = await db.content.findMany({
      where: {
        lessonId,
        parentId: existingContent.parentId,
      },
      orderBy: { order: 'asc' },
    })

    // Update order for remaining blocks
    await db.$transaction(
      remainingBlocks.map((block, index) =>
        db.content.update({
          where: { id: block.id },
          data: { order: index },
        })
      )
    )

    // Update lesson timestamp
    await db.lesson.update({
      where: { id: lessonId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Block deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
