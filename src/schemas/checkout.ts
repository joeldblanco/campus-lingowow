import * as z from 'zod'

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
})

export const createPersonalInfoSchema = (needsShipping: boolean) => {
  return z.object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(1, 'El teléfono es requerido'),
    country: needsShipping ? z.string().min(1, 'El país es requerido') : z.string().optional(),
    city: needsShipping ? z.string().min(1, 'La ciudad es requerida') : z.string().optional(),
    address: needsShipping ? z.string().min(1, 'La dirección es requerida') : z.string().optional(),
    zipCode: needsShipping ? z.string().min(1, 'El código postal es requerido') : z.string().optional(),
  })
}

export const PaymentMethodSchema = z.object({
  paymentMethod: z.enum(['card', 'paypal', 'bank_transfer'], {
    required_error: 'Debe seleccionar un método de pago',
  }),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardholderName: z.string().optional(),
  saveCard: z.boolean().default(false),
}).refine((data) => {
  if (data.paymentMethod === 'card') {
    return data.cardNumber && data.expiryDate && data.cvv && data.cardholderName
  }
  return true
}, {
  message: 'Todos los campos de la tarjeta son requeridos',
  path: ['cardNumber'],
})
