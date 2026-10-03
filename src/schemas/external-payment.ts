import { z } from 'zod'

export const ExternalPaymentEnrollmentSchema = z.object({
  studentId: z.string().trim().min(1).max(128),
  courseId: z.string().trim().min(1).max(128),
  academicPeriodId: z.string().trim().min(1).max(128),
  provider: z.literal('culqi'),
  reference: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(
      /^[A-Za-z0-9_./:-]+$/,
      'La referencia debe ser el identificador del comprobante Culqi, sin espacios'
    ),
  // Major-unit decimal string on input; integer cents in storage. No floating point rounding.
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/, 'Importe inválido (máximo dos decimales)')
    .transform((value) => {
      const [whole, fraction = ''] = value.split('.')
      return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    })
    .refine((value) => value > 0, 'El importe debe ser mayor que cero'),
  currency: z.enum(['USD', 'PEN']),
  paidAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => Date.parse(value) <= Date.now(), 'La fecha de pago no puede ser futura'),
  classesTotal: z.number().int().min(1).max(500),
  description: z.string().trim().min(3).max(500),
})

export type ExternalPaymentEnrollmentInput = z.input<typeof ExternalPaymentEnrollmentSchema>
