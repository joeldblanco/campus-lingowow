'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene la timezone del usuario autenticado desde la base de datos
 */
export async function getUserTimezone(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) return 'America/Lima'

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })

  return user?.timezone || 'America/Lima'
}

/**
 * Actualiza la timezone del usuario en la base de datos
 * Se llama automáticamente cuando la timezone del navegador difiere de la almacenada
 */
export async function updateUserTimezone(browserTimezone: string): Promise<{ success: boolean; updated: boolean }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, updated: false }
    }

    // Validar que sea una timezone válida
    try {
      Intl.DateTimeFormat(undefined, { timeZone: browserTimezone })
    } catch {
      console.error('Invalid timezone:', browserTimezone)
      return { success: false, updated: false }
    }

    // Obtener timezone actual del usuario
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    })

    // Solo actualizar si es diferente
    if (user?.timezone === browserTimezone) {
      return { success: true, updated: false }
    }

    // Actualizar timezone en la base de datos
    await db.user.update({
      where: { id: session.user.id },
      data: { timezone: browserTimezone },
    })

    revalidatePath('/')
    return { success: true, updated: true }
  } catch (error) {
    console.error('Error updating user timezone:', error)
    return { success: false, updated: false }
  }
}
