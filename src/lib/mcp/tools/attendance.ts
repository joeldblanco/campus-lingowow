import { z } from 'zod'
import {
  checkBothAttendances,
  checkStudentAttendance,
  checkTeacherAttendance,
  markStudentAttendance,
  markTeacherAttendance,
} from '@/lib/actions/attendance'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const attendanceTools: AnyToolModule[] = [
  {
    name: 'lingowow_attendance_check_student',
    description: 'Verifica si un estudiante tiene asistencia marcada en una clase.',
    scopes: ['mcp:classes:read'],
    inputShape: {
      classId: z.string().min(1),
      studentId: z.string().min(1),
    },
    handler: async ({ classId, studentId }) =>
      checkStudentAttendance(classId, studentId),
  },

  {
    name: 'lingowow_attendance_check_teacher',
    description: 'Verifica si un profesor tiene asistencia marcada en una clase.',
    scopes: ['mcp:classes:read'],
    inputShape: {
      classId: z.string().min(1),
      teacherId: z.string().min(1),
    },
    handler: async ({ classId, teacherId }) =>
      checkTeacherAttendance(classId, teacherId),
  },

  {
    name: 'lingowow_attendance_check_both',
    description:
      'Devuelve el estado de asistencia de profesor y estudiante de una clase (teacherPresent, studentPresent, bothPresent).',
    scopes: ['mcp:classes:read'],
    inputShape: { classId: z.string().min(1) },
    handler: async ({ classId }) => {
      const result = await checkBothAttendances(classId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_attendance_mark_student',
    description:
      'Marca la asistencia de un estudiante en una clase. Verifica que la clase esté dentro de la ventana permitida (15 min antes / después).',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classId: z.string().min(1),
      studentId: z.string().min(1),
    },
    handler: async ({ classId, studentId }) => {
      const result = await markStudentAttendance(classId, studentId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_attendance_mark_teacher',
    description: 'Marca la asistencia de un profesor en una clase como PRESENT.',
    scopes: ['mcp:classes:write'],
    inputShape: {
      classId: z.string().min(1),
      teacherId: z.string().min(1),
    },
    handler: async ({ classId, teacherId }) => {
      const result = await markTeacherAttendance(classId, teacherId)
      return unwrapActionResult(result)
    },
  },
]
