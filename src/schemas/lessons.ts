import * as z from 'zod'

export const CreateLessonSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  content: z.string().optional(),
  moduleId: z.string().min(1, 'El módulo es requerido'),
  order: z.number().min(1, 'El orden debe ser mayor a 0').optional(),
  duration: z.number().min(1, 'La duración debe ser mayor a 0').optional(),
  videoUrl: z.string().optional(),
  resources: z.string().optional(),
})

export const EditLessonSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  content: z.string().optional(),
  moduleId: z.string().min(1, 'El módulo es requerido'),
  order: z.number().min(1, 'El orden debe ser mayor a 0'),
  duration: z.number().min(1, 'La duración debe ser mayor a 0').optional(),
  videoUrl: z.string().optional(),
  resources: z.string().optional(),
})
