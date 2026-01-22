'use server'

import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { User, UserRole, UserStatus } from '@prisma/client'
import { CreateUserSchema } from '@/schemas/user'
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

    const updatedUser = await db.user.update({
      where: {
        id,
      },
      data,
    })

    if (!updatedUser) return { error: 'Ocurrió un error actualizando el usuario' }

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

    // Create the user
    const newUser = await db.user.create({
      data: {
        ...validatedUserData,
        email: normalizedEmail, // Usar el email normalizado
        // Set default values if not provided
        roles: validatedUserData.roles || [UserRole.STUDENT],
        status: validatedUserData.status || UserStatus.ACTIVE,
      },
    })

    if (!newUser) return { error: 'Ocurrió un error creando el usuario' }

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
