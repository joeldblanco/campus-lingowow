'use server'

import { signIn, signOut } from '@/auth'
import { getUserByEmail } from '@/lib/actions/user'
import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { sendVerificationEmail } from '@/lib/mail'
import { generateVerificationToken } from '@/lib/tokens'
import { DEFAULT_LOGIN_REDIRECT } from '@/routes'
import { SignInSchema, SignUpSchema } from '@/schemas/auth'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import * as z from 'zod'

export const login = async (values: z.infer<typeof SignInSchema>) => {
  const validatedFields = SignInSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' }
  }

  const { email, password } = validatedFields.data

  const existingUser = await getUserByEmail(email)

  if (!existingUser || 'error' in existingUser) {
    return { error: 'Usuario no encontrado' }
  }

  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: 'Credenciales inválidas' }
  }

  if (!existingUser.emailVerified && existingUser.email) {
    return { redirect: `/auth/verification?email=${existingUser.email}` }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    return { redirect: DEFAULT_LOGIN_REDIRECT }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Credenciales inválidas' }
        case 'AccessDenied':
          return { error: 'Acceso denegado' }
        default:
          return { error: 'Error al iniciar sesión' }
      }
    }
    throw error
  }
}

export const register = async (values: z.infer<typeof SignUpSchema>) => {
  const validatedFields = SignUpSchema.safeParse(values)

  if (!validatedFields.success) return { error: 'Campos inválidos' }

  const validatedData = validatedFields.data

  const hashedPassword = await bcrypt.hash(validatedData.password, 10)

  const existingUser = await getUserByEmail(validatedData.email)

  if (existingUser) {
    return { error: 'El correo ya está en uso' }
  }

  try {
    await db.user.create({
      data: {
        name: validatedData.name,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        role: UserRole.GUEST,
      },
    })

    const verificationToken = await generateVerificationToken(validatedData.email)

    if ('error' in verificationToken) return { error: verificationToken.error }

    await sendVerificationEmail(verificationToken.email, verificationToken.token)

    return { success: 'Email de verificación enviado' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error al registrar al usuario',
    }
  }
}

export const resendVerificationEmail = async (email: string) => {
  try {
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    })

    if (!existingUser) return { error: 'Usuario no encontrado' }

    const verificationToken = await generateVerificationToken(email)

    if ('error' in verificationToken) return verificationToken

    await sendVerificationEmail(verificationToken.email, verificationToken.token)

    return { success: 'Correo de verificación reenviado' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error al enviar el correo de verificación',
    }
  }
}

export const getVerificationTokenByEmail = async (email: string) => {
  try {
    const token = await db.verificationToken.findFirst({
      where: {
        email,
      },
    })

    return token
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el token de verificación',
    }
  }
}

export const getVerificationTokenByToken = async (token: string) => {
  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: {
        token,
      },
    })

    return verificationToken
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el token de verificación',
    }
  }
}

export const newVerification = async (token: string) => {
  const existingToken = await getVerificationTokenByToken(token)

  if (!existingToken || 'error' in existingToken) {
    return { error: 'Token no encontrado' }
  }

  const hasExpired = existingToken.expires < new Date()

  if (hasExpired) {
    return { error: 'El token ha expirado' }
  }

  const existingUser = await getUserByEmail(existingToken.email)

  if (!existingUser || 'error' in existingUser) {
    return { error: 'Correo electrónico no encontrado' }
  }

  await db.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      emailVerified: new Date(),
      email: existingToken.email,
    },
  })

  await db.verificationToken.delete({
    where: {
      id: existingToken.id,
    },
  })

  return { redirect: DEFAULT_LOGIN_REDIRECT }
}

export const logout = async () => {
  await signOut()
}
