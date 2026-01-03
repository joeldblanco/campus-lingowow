'use server'

import { auth, signIn } from '@/auth'
import { getUserById } from '@/lib/actions/user'
import { hasRole } from '@/lib/utils/roles'
import { UserRole } from '@prisma/client'

/**
 * Inicia la suplantación de un usuario
 * Solo accesible para administradores
 */
export const impersonateUser = async (userId: string) => {
  try {
    // Verificar que el usuario actual sea administrador
    const session = await auth()
    if (!session?.user?.id) {
      return { error: 'No autorizado' }
    }

    if (!hasRole(session.user.roles, UserRole.ADMIN)) {
      return { error: 'Solo los administradores pueden suplantar usuarios' }
    }

    // Obtener el usuario a suplantar
    const targetUser = await getUserById(userId)
    if (!targetUser || 'error' in targetUser) {
      return { error: 'Usuario no encontrado' }
    }

    // Preparar datos de suplantación (incluir timezone del usuario suplantado)
    const impersonationData = {
      originalUserId: session.user.id,
      targetUserId: userId,
      isImpersonating: true,
      targetTimezone: targetUser.timezone ?? 'America/Lima',
    }

    // Crear nueva sesión para el usuario suplantado con flag de suplantación
    await signIn('credentials', {
      userId: targetUser.id,
      impersonationData: JSON.stringify(impersonationData),
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    console.error('Error al suplantar usuario:', error)
    return { error: 'Error al suplantar usuario' }
  }
}

/**
 * Finaliza la suplantación y restaura la sesión del administrador original
 */
export const exitImpersonation = async () => {
  try {
    const session = await auth()
    if (!session?.user?.impersonationData) {
      return { error: 'No hay suplantación activa' }
    }

    const impersonationData = JSON.parse(session.user.impersonationData)
    const originalUserId = impersonationData.originalUserId

    // Restaurar sesión del administrador original
    await signIn('credentials', {
      userId: originalUserId,
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    console.error('Error al salir de la suplantación:', error)
    return { error: 'Error al salir de la suplantación' }
  }
}
