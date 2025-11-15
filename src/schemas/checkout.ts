import * as z from 'zod'

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  country: z.string().min(1, 'El país es requerido'),
  city: z.string().min(1, 'La ciudad es requerida'),
  address: z.string().min(1, 'La dirección es requerida'),
  zipCode: z.string().min(1, 'El código postal es requerido'),
})

export const createPersonalInfoSchema = () => {
  return z.object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    email: z.string().email('Email inválido'),
    country: z.string().min(1, 'El país es requerido'),
    city: z.string().min(1, 'La ciudad es requerida'),
    address: z.string().min(1, 'La dirección es requerida'),
    zipCode: z.string().min(1, 'El código postal es requerido'),
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
