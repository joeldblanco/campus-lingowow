import { z } from 'zod'
import { db } from '@/lib/db'
import {
  getBookingCourseStructure,
  getContentById,
  getLessonContent,
  getShareableContent,
} from '@/lib/actions/classroom'
import { getRecordingStatus, recoverOrphanedRecordings } from '@/lib/actions/classroom-recording'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const contentTypeEnum = z.enum(['lesson', 'student_lesson', 'library_resource'])

export const classroomTools: AnyToolModule[] = [
  {
    name: 'lingowow_classroom_booking_course_structure',
    description:
      'Devuelve la estructura del curso (módulos + lecciones) asociada a un booking, incluyendo lecciones personalizadas si existen.',
    scopes: ['mcp:classes:read'],
    inputShape: { bookingId: z.string().min(1) },
    handler: async ({ bookingId }) => getBookingCourseStructure(bookingId),
  },

  {
    name: 'lingowow_classroom_lesson_content',
    description: 'Obtiene el contenido completo de una lección con bloques anidados.',
    scopes: ['mcp:classes:read'],
    inputShape: { lessonId: z.string().min(1) },
    handler: async ({ lessonId }) => getLessonContent(lessonId),
  },

  {
    name: 'lingowow_classroom_content_get',
    description:
      'Obtiene contenido compartible por ID y tipo (lesson, student_lesson, library_resource).',
    scopes: ['mcp:classes:read'],
    inputShape: {
      contentId: z.string().min(1),
      contentType: contentTypeEnum,
    },
    handler: async ({ contentId, contentType }) => getContentById(contentId, contentType),
  },

  {
    name: 'lingowow_classroom_shareable_content',
    description: 'Lista todo el contenido compartible disponible para usar en clase.',
    scopes: ['mcp:classes:read'],
    handler: async () => getShareableContent(),
  },

  {
    name: 'lingowow_classroom_chat_messages',
    description:
      'Lista los mensajes de chat de una clase (booking) en orden cronológico. Acceso admin: no requiere ser participante.',
    scopes: ['mcp:classes:read'],
    inputShape: {
      bookingId: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional().default(200),
    },
    handler: async ({ bookingId, limit }) =>
      db.meetingMessage.findMany({
        where: { bookingId },
        include: {
          sender: { select: { id: true, name: true, lastName: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
  },

  {
    name: 'lingowow_classroom_whiteboard_data',
    description: 'Devuelve la pizarra (whiteboard) asociada a un booking.',
    scopes: ['mcp:classes:read'],
    inputShape: { bookingId: z.string().min(1) },
    handler: async ({ bookingId }) =>
      db.whiteboardData.findUnique({ where: { bookingId } }),
  },

  {
    name: 'lingowow_classroom_recording_status',
    description: 'Obtiene el estado de una grabación en LiveKit por egressId.',
    scopes: ['mcp:classes:read'],
    inputShape: { egressId: z.string().min(1) },
    handler: async ({ egressId }) => {
      const result = await getRecordingStatus(egressId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_classroom_recordings_list',
    description:
      'Lista las grabaciones registradas en la base de datos (ClassRecording) con paginación y filtros.',
    scopes: ['mcp:classes:read'],
    inputShape: {
      bookingId: z.string().optional(),
      teacherId: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ bookingId, teacherId, limit, offset }) => {
      const where: Record<string, unknown> = {}
      if (bookingId) where.bookingId = bookingId
      if (teacherId) where.booking = { teacherId }
      const [recordings, total] = await Promise.all([
        db.classRecording.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            booking: {
              select: {
                id: true,
                day: true,
                timeSlot: true,
                teacherId: true,
                studentId: true,
              },
            },
          },
        }),
        db.classRecording.count({ where }),
      ])
      return { total, limit, offset, recordings }
    },
  },

  {
    name: 'lingowow_classroom_recover_orphaned_recordings',
    description:
      'Recupera grabaciones huérfanas: busca egresses en LiveKit que no tienen registro local y los registra. Operación administrativa.',
    scopes: ['mcp:classes:write'],
    handler: async () => {
      const result = await recoverOrphanedRecordings()
      return unwrapActionResult(result)
    },
  },
]
