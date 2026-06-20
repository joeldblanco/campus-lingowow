import * as z from 'zod'

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  subject: z.string().min(1, 'El asunto es requerido'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export const NewsletterSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const LeadCaptureSchema = z.object({
  email: z.string().email('Email inválido'),
  // Origen del lead: 'footer', 'resources-ejercicios', 'resources-library', etc.
  source: z.string().min(1).max(64).optional(),
})

export type LeadCaptureInput = z.infer<typeof LeadCaptureSchema>

export const DemoRequestSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
})
