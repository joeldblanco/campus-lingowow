'use server'

import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { User, UserRole, UserStatus } from '@prisma/client'
import { CreateUserSchema } from '@/schemas/user'
import { auditLog } from '@/lib/audit-log'
import { auth } from '@/auth'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/mail'
import { isBcryptHash } from '@/lib/utils/password'
import bcrypt from 'bcryptjs'
import * as z from 'zod'

export const getUserByEmail = async (email: string) => {
  try {
    const normalizedEmail = email.toLowerCase()
    const user = await db.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    })

    return user
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el usuario',
    }
  }
}

export const getUserById = async (id: string) => {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    })

    return user
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo el usuario',
    }
  }
}

export const updateUser = async (id: string, data: Partial<User>) => {
  try {
    const existingUser = await getUserById(id)

    if (!existingUser) return { error: 'Usuario no encontrado' }

    // Si llega una contraseña en texto plano, hashearla. El guard `isBcryptHash`
    // hace esto idempotente: cuando el caller reenvía el hash existente (p.ej. el
    // panel admin que pasa el User completo) no se vuelve a hashear.
    let updateData = data
    if (
      typeof data.password === 'string' &&
      data.password.length > 0 &&
      !isBcryptHash(data.password)
    ) {
      updateData = { ...data, password: await bcrypt.hash(data.password, 10) }
    }

    const updatedUser = await db.user.update({
      where: {
        id,
      },
      data: updateData,
    })

    if (!updatedUser) return { error: 'Ocurrió un error actualizando el usuario' }

    auditLog({
      userId: id,
      action: 'USER_UPDATED',
      category: 'ADMIN',
      description: `Usuario actualizado: ${updatedUser.email}`,
      metadata: { targetUserId: id, email: updatedUser.email },
    })

    return updatedUser
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error actualizando el usuario',
    }
  }
}

export const createUser = async (userData: z.infer<typeof CreateUserSchema>) => {
  try {
    // Validate user data
    const validatedUserData = CreateUserSchema.parse(userData)

    // Normalizar email a minúsculas
    const normalizedEmail = validatedUserData.email.toLowerCase()

    // Check if user with this email already exists
    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser && !('error' in existingUser)) {
      return { error: 'Ya existe un usuario con este email' }
    }

    // Hashear la contraseña antes de guardarla (el esquema entrega texto plano).
    // Sin esto, el login (bcrypt.compare) siempre falla con "Credenciales inválidas".
    const hashedPassword = await bcrypt.hash(validatedUserData.password, 10)

    // Create the user
    const newUser = await db.user.create({
      data: {
        ...validatedUserData,
        email: normalizedEmail, // Usar el email normalizado
        password: hashedPassword,
        // Set default values if not provided
        roles: validatedUserData.roles || [UserRole.STUDENT],
        status: validatedUserData.status || UserStatus.ACTIVE,
      },
    })

    if (!newUser) return { error: 'Ocurrió un error creando el usuario' }

    // Enviar correo de verificación: emailVerified queda null hasta que el
    // usuario confirme, igual que en el registro público.
    const verificationToken = await generateVerificationToken(normalizedEmail)

    if (verificationToken && !('error' in verificationToken)) {
      await sendVerificationEmail(verificationToken.email, verificationToken.token)
    }

    auditLog({
      userId: newUser.id,
      action: 'USER_CREATED',
      category: 'ADMIN',
      description: `Usuario creado: ${normalizedEmail}`,
      metadata: { targetUserId: newUser.id, email: normalizedEmail, roles: validatedUserData.roles },
    })

    return newUser
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(', '),
      }
    }

    return {
      error: handleError(error) || 'Ocurrió un error creando el usuario',
    }
  }
}

export const deleteUser = async (id: string) => {
  try {
    // Check if user exists
    const existingUser = await getUserById(id)
    if (!existingUser || 'error' in existingUser) {
      return { error: 'Usuario no encontrado' }
    }

    const session = await auth()
    auditLog({
      userId: session?.user?.id || undefined,
      action: 'USER_DELETED',
      category: 'ADMIN',
      description: `Usuario eliminado: ${existingUser.email}`,
      metadata: { adminId: session?.user?.id, targetUserId: id, email: existingUser.email, name: existingUser.name },
    })

    // Delete the user
    await db.user.delete({
      where: {
        id,
      },
    })

    return { success: 'Usuario eliminado correctamente' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error eliminando el usuario',
    }
  }
}

export const getAllUsers = async () => {
  try {
    const users = await db.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return users
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error obteniendo los usuarios',
    }
  }
}

export const deleteMultipleUsers = async (userIds: string[]) => {
  try {
    // Check if user exists
    const existingUsers = await Promise.all(userIds.map(getUserById))

    const invalidUserIds = existingUsers.filter((user) => user && 'error' in user)

    if (invalidUserIds.length > 0) {
      return { error: 'Usuario no encontrado' }
    }

    const session = await auth()
    auditLog({
      userId: session?.user?.id || undefined,
      action: 'USER_DELETED',
      category: 'ADMIN',
      description: `Usuarios eliminados en lote: ${userIds.length} usuarios`,
      metadata: { adminId: session?.user?.id, targetUserIds: userIds },
    })

    // Delete the user
    await db.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    })

    return { success: 'Usuario eliminado correctamente' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error eliminando el usuario',
    }
  }
}
