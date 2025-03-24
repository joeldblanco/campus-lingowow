'use server'

import { db } from '@/lib/db'
import handleError from '@/lib/handleError'
import { User } from '@prisma/client'

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.user.findFirst({
      where: {
        email,
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

    return { success: 'Usuario actualizado correctamente' }
  } catch (error) {
    return {
      error: handleError(error) || 'Ocurrió un error actualizando el usuario',
    }
  }
}
