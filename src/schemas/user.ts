import * as z from 'zod'
import { UserRole, UserStatus } from '@prisma/client'

export const CreateUserSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    lastName: z.string().min(2, {
      message: 'Last name must be at least 2 characters.',
    }),
    email: z.string().email({
      message: 'Please enter a valid email address.',
    }),
    password: z
      .string()
      .min(8, {
        message: 'Password must be at least 8 characters.',
      })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])(?!.*\s).{8,32}$/,
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.'
      ),
    role: z.enum([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.GUEST] as const),
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE] as const),
    image: z.string().optional().nullable(),
  })
  .strict()

export const UpdateUserSchema = CreateUserSchema.partial().strict()
