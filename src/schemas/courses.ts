import * as z from 'zod'

export const CreateCourseSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  language: z.string().min(1, 'El idioma es requerido'),
  level: z.string().min(1, 'El nivel es requerido'),
  classDuration: z.number().int().min(30).max(90).default(40),
  image: z.string().optional(),
  createdById: z.string(),
})

export const EditCourseSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  language: z.string().min(1, 'El idioma es requerido'),
  level: z.string().min(1, 'El nivel es requerido'),
  classDuration: z.number().int().min(30).max(90),
  image: z.string().optional(),
})
