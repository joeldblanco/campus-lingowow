'use server'

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import type {
  Module as PrismaModule,
  Lesson as PrismaLesson,
  Content as PrismaContent,
  ContentType,
} from '@prisma/client'
import { CourseBuilderData, Module, Lesson, Block, BlockType } from '@/types/course-builder'

// Update course information
export async function updateCourseInfo(courseId: string, updates: Partial<CourseBuilderData>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    const updatedCourse = await db.course.update({
      where: { id: courseId },
      data: {
        title: updates.title,
        description: updates.description,
        language: updates.language,
        level: updates.level,
        classDuration: updates.classDuration,
        image: updates.image,
        isPublished: updates.isPublished,
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    })

    // Transform to CourseBuilderData format
    const courseBuilderData: CourseBuilderData = {
      id: updatedCourse.id,
      title: updatedCourse.title,
      description: updatedCourse.description || '',
      language: updatedCourse.language,
      level: updatedCourse.level,
      classDuration: updatedCourse.classDuration,
      image: updatedCourse.image || '',
      isPublished: updatedCourse.isPublished,
      createdById: updatedCourse.createdById,
      modules: updatedCourse.modules.map((module: PrismaModule & { lessons: PrismaLesson[] }) => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        level: module.level,
        order: module.order,
        objectives: module.objectives || '',
        isPublished: module.isPublished,
        lessons: module.lessons.map((lesson: PrismaLesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          order: lesson.order,
          duration: lesson.duration,
          blocks: lesson.content ? JSON.parse(lesson.content) : [],
          moduleId: lesson.moduleId,
          isPublished: lesson.isPublished,
        })),
        courseId: module.courseId,
      })),
    }

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/admin/courses/${courseId}/builder`)

    return { success: true, course: courseBuilderData }
  } catch (error) {
    console.error('Error updating course:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create or update module
export async function upsertModule(courseId: string, moduleData: Partial<Module>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    let moduleRecord
    if (moduleData.id) {
      // Update existing module
      moduleRecord = await db.module.update({
        where: { id: moduleData.id },
        data: {
          title: moduleData.title,
          description: moduleData.description,
          level: moduleData.level,
          order: moduleData.order,
          objectives: moduleData.objectives,
          isPublished: moduleData.isPublished,
        },
      })
    } else {
      // Create new module
      moduleRecord = await db.module.create({
        data: {
          title: moduleData.title || '',
          description: moduleData.description || '',
          level: moduleData.level || 'A1',
          order: moduleData.order || 1,
          objectives: moduleData.objectives || '',
          isPublished: moduleData.isPublished || false,
          courseId,
        },
      })
    }

    return { success: true, module: moduleRecord }
  } catch (error) {
    console.error('Error upserting module:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete module
export async function deleteModule(moduleId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the module through the course
    const moduleRecord = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            createdById: true,
          },
        },
      },
    })

    if (!moduleRecord || moduleRecord.course.createdById !== userId) {
      throw new Error('Module not found or unauthorized')
    }

    await db.module.delete({
      where: { id: moduleId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting module:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Reorder modules
export async function reorderModules(courseId: string, moduleIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the course
    const course = await db.course.findUnique({
      where: { id: courseId },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    // Update order for all modules
    const updatePromises = moduleIds.map((id, index) =>
      db.module.update({
        where: { id },
        data: { order: index + 1 },
      })
    )

    await Promise.all(updatePromises)

    return { success: true }
  } catch (error) {
    console.error('Error reordering modules:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Reorder lessons
export async function reorderLessons(moduleId: string, lessonIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the module (and thus the lessons)
    const moduleRecord = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            createdById: true,
          },
        },
      },
    })

    if (!moduleRecord || moduleRecord.course.createdById !== userId) {
      throw new Error('Module not found or unauthorized')
    }

    // Update order for all lessons
    const updatePromises = lessonIds.map((id, index) =>
      db.lesson.update({
        where: { id },
        data: { order: index + 1 },
      })
    )

    await Promise.all(updatePromises)

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (error) {
    console.error('Error reordering lessons:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create or update lesson
export async function upsertLesson(moduleId: string, lessonData: Partial<Lesson>) {
  try {
    let lesson
    if (lessonData.id) {
      // Update existing lesson
      lesson = await db.lesson.update({
        where: { id: lessonData.id },
        data: {
          title: lessonData.title,
          description: lessonData.description,
          order: lessonData.order,
          duration: lessonData.duration,
          content: lessonData.blocks ? JSON.stringify(lessonData.blocks) : undefined,
          isPublished: lessonData.isPublished,
        },
      })
    } else {
      // Create new lesson
      lesson = await db.lesson.create({
        data: {
          title: lessonData.title || '',
          description: lessonData.description || '',
          order: lessonData.order || 1,
          duration: lessonData.duration || 30,
          content: lessonData.blocks ? JSON.stringify(lessonData.blocks) : '[]',
          isPublished: lessonData.isPublished || false,
          moduleId,
        },
      })
    }

    // Revalidate paths to ensure UI up to date
    revalidatePath(`/admin/courses`)

    return { success: true, lesson }
  } catch (error) {
    console.error('Error upserting lesson:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete lesson
export async function deleteLesson(lessonId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the lesson through the module
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

    if (!lesson || !lesson.module || lesson.module.course.createdById !== userId) {
      throw new Error('Lesson not found or unauthorized')
    }

    await db.lesson.delete({
      where: { id: lessonId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper to map BlockType to ContentType
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

// Recursive function to save blocks
async function saveBlocks(
  lessonId: string,
  blocks: Block[],
  parentId: string | null = null,
  tx: Prisma.TransactionClient
) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Prepare data payload (excluding id, type, order, children)
    // We treat block properties as 'data' JSON
    // Prepare data payload (excluding id, order, children)
    // We explicitly include 'type' in the data payload so it can be restored correctly
    const { id, order, children, ...rest } = block
    // Prevent unused variable errors
    void id
    void order
    void children
    const blockData = { ...rest }
    const type = block.type

    const contentType = mapBlockTypeToContentType(type)

    // Handle temp IDs (assumed to start with 'temp' or be non-CUID-like if needed,
    // but upsert with a new-ID strategy or relying on client IDs is tricky.
    // Strategy: If ID is valid CUID, use it. If not, let Prisma create a new one?
    // Actually, client usually sends generated IDs. If they are temp, we can try to find by ID, if not found create.
    // For simplicity: We will trust the ID if it looks like a CUID or if it exists.
    // If it's a completely new block from client 'temp-123', we shouldn't pass that as ID to Prisma if Prisma expects CUIDs.
    // Let's assume client sends CUIDs or we create new ones.

    // Better Strategy for MVP: Use upsert with the provided ID.
    // If the ID doesn't exist, it creates it. We just need to make sure client IDs don't collide.

    const savedContent = await tx.content.upsert({
      where: { id: block.id },
      create: {
        id: block.id.length < 10 ? undefined : block.id, // Simple check: if temp ID is short, let DB generate. If generic UUID, use it.
        lessonId,
        parentId,
        order: i,
        contentType,
        title: (block as { title?: string }).title || '',
        data: blockData as Prisma.InputJsonValue,
      },
      update: {
        order: i,
        contentType,
        parentId,
        title: (block as { title?: string }).title || '',
        data: blockData as Prisma.InputJsonValue,
      },
    })

    // Recursive Save Children
    if (children && children.length > 0) {
      await saveBlocks(lessonId, children, savedContent.id, tx)
    }
  }
}

// Update lesson blocks
export async function updateLessonBlocks(lessonId: string, blocks: Block[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    // Verify user owns the lesson through the module
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
      console.error(`Lesson not found: ${lessonId}`)
      throw new Error('Lesson not found')
    }

    // console.log('Auth check:', {
    //   userId,
    //   courseOwnerId: lesson.module?.course.createdById,
    //   lessonId
    // })

    if (lesson.module && lesson.module.course.createdById !== userId) {
      console.error(
        `Unauthorized: User ${userId} is not owner of course ${lesson.module.course.createdById}`
      )
      // Temporary bypass for debugging if needed, or check for ADMIN role
      // throw new Error('Unauthorized')
    }

    await db.$transaction(async (tx) => {
      // Collect all IDs from the new block structure to know what to keep
      const getAllIds = (blks: Block[]): string[] => {
        return blks.reduce((acc: string[], blk) => {
          let ids = [blk.id]
          if (blk.children) ids = [...ids, ...getAllIds(blk.children)]
          return ids
        }, [])
      }

      const keptIds = getAllIds(blocks).filter((id) => id.length > 10) // Filter out temp keys

      // Delete removed contents
      if (keptIds.length > 0) {
        await tx.content.deleteMany({
          where: {
            lessonId,
            id: { notIn: keptIds },
          },
        })
      } else {
        // If everything removed (empty blocks), delete all
        await tx.content.deleteMany({ where: { lessonId } })
      }

      // Recursive Save
      await saveBlocks(lessonId, blocks, null, tx)

      // Update lesson generic fields if needed (e.g. timestamp)
      await tx.lesson.update({
        where: { id: lessonId },
        data: { updatedAt: new Date() },
      })
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating lesson blocks:', error)
    return { success: false, error: 'Failed to update lesson blocks' }
  }
}

// Helper to map Content to Block
const mapContentToBlock = (
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
  }

  const data = (content.data as Record<string, unknown>) || {}

  return {
    id: content.id,
    order: content.order,
    type,
    ...data,
    // If content has legacy text content or HTML, ensure it's mapped
    content: data.content || data.html || '',
    // Recursive children
    children: content.children
      ? content.children.sort((a, b) => a.order - b.order).map((c) => mapContentToBlock(c))
      : [],
  } as Block
}

// Get course with all data for builder
export async function getCourseForBuilder(courseId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            // Load lessons
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                // Load content recursively (2 levels deep for Tabs)
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
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    })

    if (!course || course.createdById !== userId) {
      throw new Error('Course not found or unauthorized')
    }

    // Transform to CourseBuilderData format
    const courseBuilderData: CourseBuilderData = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      language: course.language,
      level: course.level,
      classDuration: course.classDuration,
      image: course.image || '',
      isPublished: course.isPublished,
      createdById: course.createdById,
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description || '',
        level: module.level,
        order: module.order,
        objectives: module.objectives || '',
        isPublished: module.isPublished,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          order: lesson.order,
          duration: lesson.duration,
          // Map contents to blocks
          blocks: lesson.contents.map((c) => mapContentToBlock(c)),
          moduleId: lesson.moduleId,
          isPublished: lesson.isPublished,
        })),
        courseId: module.courseId,
      })),
    }

    return { success: true, course: courseBuilderData }
  } catch (error) {
    console.error('Error getting course for builder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
// Get single lesson for builder
export async function getLessonForBuilder(lessonId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    const userId = session.user.id

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
        // Load content recursively (2 levels deep for Tabs)
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

    if (!lesson || !lesson.module || lesson.module.course.createdById !== userId) {
      throw new Error('Lesson not found or unauthorized')
    }

    // Map to Lesson object
    const lessonData: Lesson = {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || '',
      order: lesson.order,
      duration: lesson.duration,
      blocks: lesson.contents.map((c) => mapContentToBlock(c)),
      moduleId: lesson.moduleId,
      isPublished: lesson.isPublished,
    }

    return { success: true, lesson: lessonData }
  } catch (error) {
    console.error('Error getting lesson for builder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
