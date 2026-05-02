import { z } from 'zod'
import {
  archiveCourse,
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseById,
  getCourseStats,
  toggleCoursePublished,
  updateCourse,
} from '@/lib/actions/courses'
import { CreateCourseSchema, EditCourseSchema } from '@/schemas/courses'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const courseTools: AnyToolModule[] = [
  {
    name: 'lingowow_courses_list',
    description: 'Lista todos los cursos del campus con sus detalles. Soporta paginación.',
    scopes: ['mcp:courses:read'],
    inputShape: {
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset }) => {
      const all = await getAllCourses()
      return {
        total: all.length,
        limit,
        offset,
        courses: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_courses_get',
    description: 'Obtiene un curso por ID con todos sus detalles.',
    scopes: ['mcp:courses:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const course = await getCourseById(id)
      if (!course) throw new Error('Curso no encontrado')
      return course
    },
  },

  {
    name: 'lingowow_courses_stats',
    description:
      'Devuelve estadísticas agregadas de cursos: totales, publicados, inscripciones y módulos.',
    scopes: ['mcp:courses:read'],
    handler: async () => getCourseStats(),
  },

  {
    name: 'lingowow_courses_create',
    description:
      'Crea un curso nuevo. createdById debe ser el ID de un usuario con rol ADMIN o TEACHER. El curso se crea como no publicado.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      title: z.string().min(1),
      description: z.string().min(1),
      language: z.string().min(1),
      level: z.string().min(1),
      classDuration: z.number().int().min(30).max(90).default(40),
      image: z.string().optional(),
      isPersonalized: z.boolean().default(false),
      isSynchronous: z.boolean().default(false),
      defaultPaymentPerClass: z.number().min(0).nullable().optional(),
      createdById: z.string().min(1),
    },
    handler: async (args) => {
      const data = CreateCourseSchema.parse(args)
      const result = await createCourse(data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_courses_update',
    description: 'Actualiza los campos de un curso existente.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      language: z.string().min(1),
      level: z.string().min(1),
      classDuration: z.number().int().min(30).max(90),
      image: z.string().optional(),
      isPersonalized: z.boolean().default(false),
      isSynchronous: z.boolean().default(false),
      defaultPaymentPerClass: z.number().min(0).nullable().optional(),
    },
    handler: async ({ id, ...data }) => {
      const parsed = EditCourseSchema.parse(data)
      const result = await updateCourse(id, parsed)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_courses_toggle_published',
    description: 'Alterna el estado publicado/borrador de un curso.',
    scopes: ['mcp:courses:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await toggleCoursePublished(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_courses_archive',
    description: 'Archiva un curso (lo marca como no publicado).',
    scopes: ['mcp:courses:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await archiveCourse(id)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_courses_delete',
    description:
      'Elimina un curso permanentemente. Falla si tiene inscripciones activas. Operación destructiva.',
    scopes: ['mcp:courses:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteCourse(id)
      return unwrapActionResult(result)
    },
  },
]
