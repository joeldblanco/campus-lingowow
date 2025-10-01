import * as z from 'zod'

export const CreateModuleSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  level: z.number().min(1, 'El nivel debe ser mayor a 0'),
  courseId: z.string().min(1, 'El curso es requerido'),
  order: z.number().min(1, 'El orden debe ser mayor a 0'),
  objectives: z.string().optional(),
  isPublished: z.boolean().default(false),
})

export const EditModuleSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  level: z.number().min(1, 'El nivel debe ser mayor a 0'),
  order: z.number().min(1, 'El orden debe ser mayor a 0'),
  objectives: z.string().optional(),
})
