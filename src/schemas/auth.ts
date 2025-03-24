import * as z from 'zod'

export const NewPasswordSchema = z.object({
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(32, 'La contraseña debe tener menos de 32 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])(?!.*\s).{8,32}$/,
      'Debe tener minúscula, mayúscula, número y símbolo.'
    ),
})

export const ResetSchema = z.object({
  email: z
    .string({ required_error: 'Correo electrónico requerido' })
    .min(1, 'Correo electrónico requerido')
    .email('Correo electrónico no válido'),
})

export const SignInSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es requerido' })
    .min(1, 'El correo electrónico es requerido')
    .email('El correo electrónico no es válido'),

  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(32, 'La contraseña debe tener menos de 32 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])(?!.*\s).{8,32}$/,
      'Debe tener minúscula, mayúscula, número y símbolo.'
    ),
})

export const SignUpSchema = z
  .object({
    name: z
      .string({ required_error: 'El nombre es requerido' })
      .min(1, 'El nombre es requerido')
      .max(255, 'El nombre debe tener menos de 255 caracteres'),

    lastName: z
      .string({ required_error: 'El apellido es requerido' })
      .min(1, 'El apellido es requerido')
      .max(255, 'El apellido debe tener menos de 255 caracteres'),

    email: z
      .string({ required_error: 'Correo electrónico requerido' })
      .min(1, 'Correo electrónico requerido')
      .email('Correo electrónico no válido'),

    password: z
      .string({ required_error: 'Contraseña requerida' })
      .min(8, 'Mínimo 8 caracteres')
      .max(32, 'Máximo 32 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])(?!.*\s).{8,32}$/,
        'Debe tener minúscula, mayúscula, número y símbolo.'
      ),

    confirmPassword: z
      .string({ required_error: 'Confirmación requerida' })
      .min(8, 'Mínimo 8 caracteres')
      .max(32, 'Máximo 32 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])(?!.*\s).{8,32}$/,
        'Debe tener minúscula, mayúscula, número y símbolo.'
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas deben coincidir',
    path: ['confirmPassword'],
  })
