import { z } from 'zod'
import {
  getAllCoursesForGrades,
  getAllStudentGrades,
  getAllStudentsForGrades,
  getGradeStats,
  getStudentGradesByCourse,
  getStudentProgressReport,
  updateActivityGrade,
} from '@/lib/actions/grades'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const gradeTools: AnyToolModule[] = [
  {
    name: 'lingowow_grades_list',
    description:
      'Lista calificaciones agregadas por estudiante e inscripción con filtros opcionales (curso, estudiante, idioma, nivel, status).',
    scopes: ['mcp:grades:read'],
    inputShape: {
      courseId: z.string().optional(),
      studentId: z.string().optional(),
      language: z.string().optional(),
      level: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async ({ limit, offset, ...filters }) => {
      const all = await getAllStudentGrades(filters)
      return {
        total: all.length,
        limit,
        offset,
        grades: all.slice(offset, offset + limit),
      }
    },
  },

  {
    name: 'lingowow_grades_by_course',
    description: 'Calificaciones detalladas de un estudiante en un curso específico.',
    scopes: ['mcp:grades:read'],
    inputShape: {
      studentId: z.string().min(1),
      courseId: z.string().min(1),
    },
    handler: async ({ studentId, courseId }) => getStudentGradesByCourse(studentId, courseId),
  },

  {
    name: 'lingowow_grades_progress_report',
    description: 'Reporte completo de progreso académico de un estudiante (todas sus inscripciones).',
    scopes: ['mcp:grades:read'],
    inputShape: { studentId: z.string().min(1) },
    handler: async ({ studentId }) => getStudentProgressReport(studentId),
  },

  {
    name: 'lingowow_grades_stats',
    description: 'Estadísticas globales de calificaciones (totales, promedios, completion rate).',
    scopes: ['mcp:grades:read'],
    handler: async () => getGradeStats(),
  },

  {
    name: 'lingowow_grades_list_courses',
    description: 'Lista los cursos disponibles para filtrar calificaciones.',
    scopes: ['mcp:grades:read'],
    handler: async () => getAllCoursesForGrades(),
  },

  {
    name: 'lingowow_grades_list_students',
    description: 'Lista los estudiantes disponibles para filtrar calificaciones.',
    scopes: ['mcp:grades:read'],
    handler: async () => getAllStudentsForGrades(),
  },

  {
    name: 'lingowow_grades_update_activity',
    description:
      'Actualiza la calificación de una actividad para un estudiante. Marca la actividad como COMPLETED.',
    scopes: ['mcp:grades:write'],
    inputShape: {
      userId: z.string().min(1),
      activityId: z.string().min(1),
      score: z.number().min(0),
    },
    handler: async ({ userId, activityId, score }) => {
      const result = await updateActivityGrade(userId, activityId, score)
      return unwrapActionResult(result)
    },
  },
]
