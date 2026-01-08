import * as z from 'zod'

export const CreateClassSchema = z.object({
  enrollmentId: z.string().min(1, 'La inscripción es requerida'),
  teacherId: z.string().min(1, 'El profesor es requerido'),
  datetime: z.string().min(1, 'La fecha y hora son requeridas'),
  notes: z.string().optional(),
})

export const EditClassSchema = z.object({
  studentId: z.string().min(1, 'El estudiante es requerido'),
  enrollmentId: z.string().optional(),
  teacherId: z.string().min(1, 'El profesor es requerido'),
  day: z.string().min(1, 'La fecha es requerida'),
  timeSlot: z.string().min(1, 'El horario es requerido'),
  notes: z.string().optional(),
  status: z.string().optional(),
  creditId: z.string().min(1).optional().or(z.literal('')),
  completedAt: z.date().optional(),
})

export const RescheduleClassSchema = z.object({
  newDate: z.string().min(1, 'La nueva fecha es requerida'),
  newTimeSlot: z.string().min(1, 'El nuevo horario es requerido'),
  reason: z.string().optional(),
})
