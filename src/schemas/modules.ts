import * as z from 'zod'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export const CreateModuleSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  level: z.enum(CEFR_LEVELS, { errorMap: () => ({ message: 'Selecciona un nivel MCER válido' }) }),
  courseId: z.string().min(1, 'El curso es requerido'),
  order: z.number().min(0, 'El orden debe ser mayor o igual a 0'),
  objectives: z.string().optional(),
  isPublished: z.boolean().default(false),
})

export const EditModuleSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  level: z.enum(CEFR_LEVELS, { errorMap: () => ({ message: 'Selecciona un nivel MCER válido' }) }),
  order: z.number().min(0, 'El orden debe ser mayor o igual a 0'),
  objectives: z.string().optional(),
})
