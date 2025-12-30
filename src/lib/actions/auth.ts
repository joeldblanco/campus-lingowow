'use server'

import { signIn, signOut } from '@/auth'
import { getUserByEmail } from '@/lib/actions/user'
import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/mail'
import { generatePasswordResetToken, generateVerificationToken } from '@/lib/tokens'
import { DEFAULT_LOGIN_REDIRECT } from '@/routes'
import { NewPasswordSchema, ResetSchema, SignInSchema, SignUpSchema } from '@/schemas/auth'
import { hasRole } from '@/lib/utils/roles'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import * as z from 'zod'
import { getCurrentDate, isBeforeDate } from '@/lib/utils/date'
import { checkForSpam } from '@/lib/utils/spam-protection'
import { verifyRecaptcha } from '@/lib/utils/recaptcha'

export const register = async (values: z.infer<typeof SignUpSchema>, recaptchaToken?: string | null) => {
  const validatedFields = SignUpSchema.safeParse(values)

  if (!validatedFields.success) return { error: 'Campos inválidos' }

  const validatedData = validatedFields.data

  // Verificación reCAPTCHA v3
  if (recaptchaToken) {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'register')
    if (!recaptchaResult.success) {
      console.log(`[RECAPTCHA BLOCKED] Reason: ${recaptchaResult.error}, Email: ${validatedData.email}`)
      return { error: recaptchaResult.error || 'Verificación de seguridad fallida' }
    }
  }

  // Verificación anti-spam
  const spamCheck = checkForSpam({
    name: validatedData.name,
    lastName: validatedData.lastName,
    email: validatedData.email,
    honeypot: validatedData.website,
  })

  if (spamCheck.isSpam) {
    // No revelar que detectamos spam - mensaje genérico
    console.log(`[SPAM BLOCKED] Reason: ${spamCheck.reason}, Email: ${validatedData.email}`)
    return { error: 'No se pudo completar el registro. Intenta más tarde.' }
  }

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
        roles: [UserRole.GUEST],
      },
    })

    const verificationToken = await generateVerificationToken(validatedData.email)

    if ('error' in verificationToken) return { error: verificationToken.error }

    await sendVerificationEmail(verificationToken.email, verificationToken.token)

    return { success: 'Registro exitoso', redirect: '/auth/verification' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error al registrar al usuario',
    }
  }
}

export const login = async (values: z.infer<typeof SignInSchema>, callbackUrl?: string | null) => {
  const validatedFields = SignInSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' }
  }

  const { email, password, timezone } = validatedFields.data

  const existingUser = await getUserByEmail(email)

  if (!existingUser || 'error' in existingUser) {
    return { error: 'Credenciales inválidas' }
  }

  // Update timezone if provided and different
  if (timezone && existingUser.timezone !== timezone) {
    await db.user
      .update({
        where: { id: existingUser.id },
        data: { timezone },
      })
      .catch((err) => console.error('Error updating timezone on login:', err))
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

    // Determinar redirección basada en roles y callbackUrl
    const redirectUrl = getRoleBasedRedirect(existingUser.roles, callbackUrl)
    return { redirect: redirectUrl }
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

/**
 * Función auxiliar para determinar redirección basada en múltiples roles
 *
 * Esta función maneja usuarios que pueden tener múltiples roles simultáneamente.
 * Por ejemplo, un usuario puede ser ADMIN y TEACHER al mismo tiempo.
 *
 * @param roles - Array de roles del usuario
 * @param callbackUrl - URL de callback opcional
 * @returns URL de redirección apropiada
 */
function getRoleBasedRedirect(roles: UserRole[], callbackUrl?: string | null): string {
  // Si hay una URL de callback específica, validarla según los permisos del usuario
  if (callbackUrl) {
    // Solo usuarios con rol ADMIN pueden acceder a rutas /admin
    if (callbackUrl.startsWith('/admin') && hasRole(roles, UserRole.ADMIN)) {
      return callbackUrl
    }
    // Usuarios con rol TEACHER o ADMIN pueden acceder a rutas /classroom
    if (
      callbackUrl.startsWith('/classroom') &&
      (hasRole(roles, UserRole.TEACHER) || hasRole(roles, UserRole.ADMIN))
    ) {
      return callbackUrl
    }
    // Permitir URLs internas seguras que no requieran permisos especiales
    if (!callbackUrl.startsWith('/admin') && !callbackUrl.startsWith('/api')) {
      return callbackUrl
    }
  }

  // Redirección por defecto basada en el rol de mayor prioridad
  // Orden de prioridad: ADMIN > TEACHER > STUDENT > GUEST
  // Un usuario con múltiples roles será redirigido según su rol de mayor privilegio
  if (hasRole(roles, UserRole.ADMIN)) {
    return '/dashboard'
  }
  if (hasRole(roles, UserRole.TEACHER)) {
    return '/classroom'
  }
  if (hasRole(roles, UserRole.STUDENT)) {
    return DEFAULT_LOGIN_REDIRECT
  }
  // GUEST o cualquier otro caso
  return DEFAULT_LOGIN_REDIRECT
}

export const logout = async () => {
  await signOut()
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

    return { success: 'Correo de verificación enviado' }
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

  const hasExpired = isBeforeDate(existingToken.expires, getCurrentDate())

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
      emailVerified: getCurrentDate(),
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

export const getPasswordResetTokenByEmail = async (email: string) => {
  try {
    const passwordResetToken = await db.passwordResetToken.findFirst({
      where: {
        email,
      },
    })

    return passwordResetToken
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el token de recuperación',
    }
  }
}

export const getPasswordResetTokenByToken = async (token: string) => {
  try {
    const passwordResetToken = await db.passwordResetToken.findUnique({
      where: {
        token,
      },
    })

    return passwordResetToken
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el token de recuperación',
    }
  }
}

export const newPassword = async (
  values: z.infer<typeof NewPasswordSchema>,
  token: string | null
) => {
  if (!token) return { error: 'Token no encontrado' }

  const validatedFields = NewPasswordSchema.safeParse(values)

  if (!validatedFields.success) return { error: 'Campos inválidos' }

  const validatedData = validatedFields.data

  const existingToken = await getPasswordResetTokenByToken(token)

  if (!existingToken || 'error' in existingToken) {
    return { error: 'Token no encontrado' }
  }

  const hasExpired = isBeforeDate(existingToken.expires, getCurrentDate())

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
      password: await bcrypt.hash(validatedData.password, 10),
    },
  })

  await db.passwordResetToken.delete({
    where: {
      id: existingToken.id,
    },
  })

  return { success: 'Contraseña actualizada correctamente' }
}

export const reset = async (values: z.infer<typeof ResetSchema>) => {
  const validatedFields = ResetSchema.safeParse(values)

  if (!validatedFields.success) return { error: 'Correo electrónico inválido' }

  const validatedData = validatedFields.data

  const existingUser = await getUserByEmail(validatedData.email)

  if (!existingUser) return { error: 'Correo electrónico no encontrado' }

  const passwordResetToken = await generatePasswordResetToken(validatedData.email)

  if ('error' in passwordResetToken) return passwordResetToken

  await sendPasswordResetEmail(validatedData.email, passwordResetToken.token)

  return { success: 'Correo de recuperación enviado' }
}

/**
 * Función para suplantar a otro usuario (solo para administradores)
 * Permite a un administrador ver la plataforma como otro usuario
 *
 * @param userId - ID del usuario a suplantar
 * @returns URL del usuario suplantado
 */
export const impersonateUser = async (userId: string) => {
  try {
    // Obtener el usuario a suplantar
    const userToImpersonate = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToImpersonate) {
      return { error: 'Usuario no encontrado' }
    }

    // Determinar redirección basada en roles del usuario suplantado
    const redirectUrl = getRoleBasedRedirect(userToImpersonate.roles, null)

    return {
      success: `Suplantando a ${userToImpersonate.name} ${userToImpersonate.lastName}`,
      userId: userToImpersonate.id,
      redirect: redirectUrl,
    }
  } catch (error) {
    return {
      error: handleError(error) || 'Error al suplantar usuario',
    }
  }
}
