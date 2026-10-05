import { db } from '@/lib/db'
import { buildLibraryResourceContents } from '@/lib/library-content'
import type { RecorderAuthorization } from './auth'

export const recorderContentTypes = ['lesson', 'student_lesson', 'library_resource'] as const
export type RecorderContentType = (typeof recorderContentTypes)[number]

export function isRecorderContentType(value: string | null): value is RecorderContentType {
  return value !== null && (recorderContentTypes as readonly string[]).includes(value)
}

const lessonContentsInclude = {
  contents: {
    where: { parentId: null },
    orderBy: { order: 'asc' as const },
    include: {
      children: {
        orderBy: { order: 'asc' as const },
        include: {
          children: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    },
  },
}

type RecorderContentNode = {
  contentType?: unknown
  data?: unknown
  children?: RecorderContentNode[]
}

function isTeacherNotesNode(content: RecorderContentNode) {
  const data = content.data
  return content.contentType === 'TEACHER_NOTES'
    || (data !== null && typeof data === 'object' && (data as { type?: unknown }).type === 'teacher_notes')
}

/** Teacher notes are author-only metadata even when the classroom view is in teacher mode. */
function stripTeacherNotes<T extends RecorderContentNode>(contents: readonly T[]): T[] {
  return contents
    .filter((content) => !isTeacherNotesNode(content))
    .map((content) => {
      if (!content.children) return content
      return {
        ...content,
        children: stripTeacherNotes(content.children),
      }
    })
}

/**
 * Fetch only material the classroom could already share with this booking.
 * Published module lessons and library resources follow the classroom picker
 * policy; personalized lessons are limited to the classroom teacher's library.
 */
export async function getRecorderContent(
  authorization: RecorderAuthorization,
  contentId: string,
  contentType: RecorderContentType
) {
  const booking = authorization.booking
  if (!booking || !contentId) {
    return null
  }

  if (contentType === 'lesson') {
    const lesson = await db.lesson.findFirst({
      where: {
        id: contentId,
        isPublished: true,
        moduleId: { not: null },
      },
      include: lessonContentsInclude,
    })
    return lesson ? { ...lesson, contents: stripTeacherNotes(lesson.contents ?? []) } : null
  }

  if (contentType === 'student_lesson') {
    const lesson = await db.lesson.findFirst({
      where: {
        id: contentId,
        isPublished: true,
        studentId: { not: null },
        teacherId: booking.teacherId,
      },
      include: lessonContentsInclude,
    })
    return lesson ? { ...lesson, contents: stripTeacherNotes(lesson.contents ?? []) } : null
  }

  const resource = await db.libraryResource.findFirst({
    where: {
      id: contentId,
      status: 'PUBLISHED',
    },
  })

  if (!resource) {
    return null
  }

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description || '',
    order: 0,
    duration: resource.duration ? Math.floor(resource.duration / 60) : null,
    content: null,
    isPublished: true,
    videoUrl: resource.fileUrl,
    summary: resource.excerpt,
    transcription: null,
    contents: stripTeacherNotes(buildLibraryResourceContents(resource)),
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }
}
