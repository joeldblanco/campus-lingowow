import { z } from 'zod'
import {
  createLesson,
  deleteLesson as deleteLessonAction,
  getAllLessons,
  getAllModulesForLessons,
  getCoursesForLessons,
  getLessonById,
  getLessonStats,
  getModulesByCourse,
  updateLesson,
} from '@/lib/actions/lessons'
import {
  createModule,
  deleteModule as deleteModuleAction,
  getAllModules,
  getModuleById,
  getModuleStats,
  updateModule,
} from '@/lib/actions/modules'
import {
  deleteLesson as builderDeleteLesson,
  deleteModule as builderDeleteModule,
  getCourseForBuilder,
  getLessonForBuilder,
  reorderLessons,
  reorderModules,
  updateCourseInfo,
  updateLessonBlocks,
  upsertLesson,
  upsertModule,
} from '@/lib/actions/course-builder'
import { CreateLessonSchema, EditLessonSchema } from '@/schemas/lessons'
import { CreateModuleSchema, EditModuleSchema } from '@/schemas/modules'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const cefrLevelEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

export const courseBuilderTools: AnyToolModule[] = [
  // ===== Modules CRUD (admin) =====
  {
    name: 'lingowow_modules_list',
    description: 'Lista todos los módulos del campus con su curso y conteo de lecciones.',
    scopes: ['mcp:courses:read'],
    handler: async () => getAllModules(),
  },

  {
    name: 'lingowow_modules_get',
    description: 'Obtiene un módulo por ID con sus lecciones.',
    scopes: ['mcp:courses:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const m = await getModuleById(id)
      if (!m) throw new Error('Módulo no encontrado')
      return m
    },
  },

  {
    name: 'lingowow_modules_stats',
    description: 'Estadísticas globales de módulos (totales, publicados, etc).',
    scopes: ['mcp:courses:read'],
    handler: async () => getModuleStats(),
  },

  {
    name: 'lingowow_modules_list_by_course',
    description: 'Lista los módulos de un curso específico, opcionalmente filtrados por isPublished.',
    scopes: ['mcp:courses:read'],
    inputShape: {
      courseId: z.string().min(1),
      isPublished: z.boolean().optional(),
    },
    handler: async ({ courseId, isPublished }) => getModulesByCourse(courseId, isPublished),
  },

  {
    name: 'lingowow_modules_create',
    description:
      'Crea un módulo de curso. Pertenece a un curso (courseId) y tiene level CEFR (A1-C2). order indica posición dentro del curso.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      title: z.string().min(1),
      description: z.string().min(1),
      level: cefrLevelEnum,
      courseId: z.string().min(1),
      order: z.number().int().min(0),
      objectives: z.string().optional(),
      isPublished: z.boolean().default(false),
    },
    handler: async (args) => {
      const data = CreateModuleSchema.parse({
        title: args.title,
        description: args.description,
        level: args.level,
        courseId: args.courseId,
        order: args.order,
        objectives: args.objectives,
        isPublished: args.isPublished,
      })
      const result = await createModule(data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_modules_update',
    description: 'Actualiza un módulo existente.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      level: cefrLevelEnum,
      order: z.number().int().min(0),
      objectives: z.string().optional(),
    },
    handler: async ({ id, ...rest }) => {
      const data = EditModuleSchema.parse(rest)
      const result = await updateModule(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_modules_delete',
    description: 'Elimina un módulo permanentemente con sus lecciones (cascade).',
    scopes: ['mcp:courses:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteModuleAction(id)
      return unwrapActionResult(result)
    },
  },

  // ===== Lessons CRUD =====
  {
    name: 'lingowow_lessons_list',
    description: 'Lista todas las lecciones del campus con su módulo y curso.',
    scopes: ['mcp:courses:read'],
    handler: async () => getAllLessons(),
  },

  {
    name: 'lingowow_lessons_get',
    description: 'Obtiene una lección por ID con todo su contenido.',
    scopes: ['mcp:courses:read'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const l = await getLessonById(id)
      if (!l) throw new Error('Lección no encontrada')
      return l
    },
  },

  {
    name: 'lingowow_lessons_stats',
    description: 'Estadísticas globales de lecciones.',
    scopes: ['mcp:courses:read'],
    handler: async () => getLessonStats(),
  },

  {
    name: 'lingowow_lessons_list_modules_for_picker',
    description: 'Helper para UIs: lista los módulos disponibles para asignar lecciones.',
    scopes: ['mcp:courses:read'],
    handler: async () => getAllModulesForLessons(),
  },

  {
    name: 'lingowow_lessons_list_courses_for_picker',
    description: 'Helper para UIs: lista los cursos disponibles para asignar lecciones.',
    scopes: ['mcp:courses:read'],
    handler: async () => getCoursesForLessons(),
  },

  {
    name: 'lingowow_lessons_create',
    description: 'Crea una lección dentro de un módulo.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      title: z.string().min(1),
      description: z.string().min(1),
      content: z.string().optional(),
      moduleId: z.string().min(1),
      order: z.number().int().min(1).optional(),
      duration: z.number().int().min(1).optional(),
      videoUrl: z.string().optional(),
      resources: z.string().optional(),
    },
    handler: async (args) => {
      const data = CreateLessonSchema.parse(args)
      const result = await createLesson(data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_lessons_update',
    description: 'Actualiza una lección existente.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      content: z.string().optional(),
      moduleId: z.string().min(1),
      order: z.number().int().min(1),
      duration: z.number().int().min(1).optional(),
      videoUrl: z.string().optional(),
      resources: z.string().optional(),
    },
    handler: async ({ id, ...rest }) => {
      const data = EditLessonSchema.parse(rest)
      const result = await updateLesson(id, data)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_lessons_delete',
    description: 'Elimina una lección permanentemente.',
    scopes: ['mcp:courses:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const result = await deleteLessonAction(id)
      return unwrapActionResult(result)
    },
  },

  // ===== Course-builder (drag-drop / blocks) =====
  {
    name: 'lingowow_course_builder_get',
    description:
      'Devuelve el árbol completo del curso para el course-builder: módulos, lecciones y bloques de contenido. ADMIN puede consultar cualquier curso; otros usuarios solo los suyos.',
    scopes: ['mcp:courses:read'],
    inputShape: { courseId: z.string().min(1) },
    handler: async ({ courseId }) => getCourseForBuilder(courseId),
  },

  {
    name: 'lingowow_course_builder_get_lesson',
    description:
      'Devuelve una lección con todos sus bloques (con children) para edición en el course-builder.',
    scopes: ['mcp:courses:read'],
    inputShape: { lessonId: z.string().min(1) },
    handler: async ({ lessonId }) => getLessonForBuilder(lessonId),
  },

  {
    name: 'lingowow_course_builder_update_course_info',
    description:
      'Actualiza información de alto nivel del curso (title, description, language, level, classDuration, image, isPublished).',
    scopes: ['mcp:courses:write'],
    inputShape: {
      courseId: z.string().min(1),
      title: z.string().optional(),
      description: z.string().optional(),
      language: z.string().optional(),
      level: z.string().optional(),
      classDuration: z.number().int().min(15).max(180).optional(),
      image: z.string().optional(),
      isPublished: z.boolean().optional(),
    },
    handler: async ({ courseId, ...updates }) => {
      const result = await updateCourseInfo(courseId, updates)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_upsert_module',
    description:
      'Crea o actualiza un módulo desde el course-builder. Si pasas id, actualiza; si no, crea.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      courseId: z.string().min(1),
      module: z.object({
        id: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        level: z.string().optional(),
        order: z.number().int().min(0).optional(),
        objectives: z.string().optional(),
        isPublished: z.boolean().optional(),
      }),
    },
    handler: async ({ courseId, module }) => {
      const result = await upsertModule(courseId, module)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_delete_module',
    description: 'Elimina un módulo desde el course-builder (con verificación de ownership/admin).',
    scopes: ['mcp:courses:write'],
    inputShape: { moduleId: z.string().min(1) },
    handler: async ({ moduleId }) => {
      const result = await builderDeleteModule(moduleId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_reorder_modules',
    description: 'Reordena los módulos de un curso. moduleIds debe contener todos los IDs en el orden deseado.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      courseId: z.string().min(1),
      moduleIds: z.array(z.string().min(1)).min(1),
    },
    handler: async ({ courseId, moduleIds }) => {
      const result = await reorderModules(courseId, moduleIds)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_upsert_lesson',
    description: 'Crea o actualiza una lección desde el course-builder.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      moduleId: z.string().min(1),
      lesson: z.object({
        id: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        order: z.number().int().min(0).optional(),
        duration: z.number().int().min(0).optional(),
        isPublished: z.boolean().optional(),
      }),
    },
    handler: async ({ moduleId, lesson }) => {
      const result = await upsertLesson(moduleId, lesson)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_delete_lesson',
    description: 'Elimina una lección desde el course-builder (verificando ownership/admin).',
    scopes: ['mcp:courses:write'],
    inputShape: { lessonId: z.string().min(1) },
    handler: async ({ lessonId }) => {
      const result = await builderDeleteLesson(lessonId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_reorder_lessons',
    description: 'Reordena las lecciones de un módulo.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      moduleId: z.string().min(1),
      lessonIds: z.array(z.string().min(1)).min(1),
    },
    handler: async ({ moduleId, lessonIds }) => {
      const result = await reorderLessons(moduleId, lessonIds)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_course_builder_update_lesson_blocks',
    description:
      'Reemplaza los bloques de contenido de una lección. Acepta una estructura jerárquica con children. Operación destructiva sobre los bloques previos.',
    scopes: ['mcp:courses:write'],
    inputShape: {
      lessonId: z.string().min(1),
      blocks: z.array(z.record(z.unknown())).describe('Array de Block (estructura del course-builder)'),
    },
    handler: async ({ lessonId, blocks }) => {
      const result = await updateLessonBlocks(lessonId, blocks as never)
      return unwrapActionResult(result)
    },
  },
]
