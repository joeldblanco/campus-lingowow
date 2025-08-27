'use server'

import { UserActivityUpdateData } from '@/types/activity'
import { ActivityFormValues } from '@/schemas/activity'
import { db } from '@/lib/db'

// Crear una nueva actividad
export async function createActivity(data: ActivityFormValues) {
  try {
    const { content, type, createdBy, ...rest } = data

    if (!data.content || !data.content.steps) {
      throw new Error('El contenido debe tener pasos definidos')
    }

    return await db.activity.create({
      data: {
        ...rest,
        activityType: type,
        createdById: createdBy,
        activityData: content,
        steps: content,
      },
    })
  } catch (error) {
    console.error('Error creando actividad:', error)
    throw new Error('No se pudo crear la actividad')
  }
}

// Actualizar una actividad existente
export async function updateActivity(id: string, data: ActivityFormValues) {
  try {
    const { content, type, createdBy, ...rest } = data

    if (!data.content || !data.content.steps) {
      throw new Error('El contenido debe tener pasos definidos')
    }

    return await db.activity.update({
      where: { id },
      data: {
        ...rest,
        activityType: type,
        createdById: createdBy,
        activityData: content,
        steps: content,
      },
    })
  } catch (error) {
    console.error('Error actualizando actividad:', error)
    throw new Error('No se pudo actualizar la actividad')
  }
}

// Eliminar una actividad
export async function deleteActivity(id: string) {
  try {
    return await db.activity.delete({
      where: { id },
    })
  } catch (error) {
    console.error('Error eliminando actividad:', error)
    throw new Error('No se pudo eliminar la actividad')
  }
}

// Obtener todas las actividades
export async function getActivities() {
  try {
    return await db.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    throw new Error('No se pudieron obtener las actividades')
  }
}

// Obtener una actividad por ID
export async function getActivity(id: string) {
  try {
    return await db.activity.findUnique({
      where: { id },
      include: {
        content: true,
      },
    })
  } catch (error) {
    console.error('Error obteniendo actividad:', error)
    throw new Error('No se pudo obtener la actividad')
  }
}

interface ActivityStep {
  type: 'instruction' | 'question' | 'audio' | 'recording' | 'completion'
  content: string
  options?: string[]
  correctAnswer?: number
  hint?: string
  audioUrl?: string
  transcript?: string
  expectedTranscript?: string
}

// Obtener actividad completa con pasos para el player
export async function getActivityForPlayer(activityId: string) {
  try {
    const activity = await db.activity.findUnique({
      where: { id: activityId },
    })

    if (!activity) {
      throw new Error('Actividad no encontrada')
    }

    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      steps: activity.steps as unknown as { steps: ActivityStep[] },
      points: activity.points,
    }
  } catch (error) {
    console.error('Error obteniendo actividad para player:', error)
    throw new Error('No se pudo obtener la actividad')
  }
}

// Asignar una actividad a un usuario
export async function assignActivityToUser(userId: string, activityId: string, assignedBy: string) {
  try {
    return await db.userActivity.create({
      data: {
        userId,
        activityId,
        assignedBy,
        status: 'ASSIGNED',
      },
    })
  } catch (error) {
    console.error('Error asignando actividad:', error)
    throw new Error('No se pudo asignar la actividad')
  }
}

// Actualizar el progreso de una actividad
export async function updateActivityProgress(
  userId: string,
  activityId: string,
  status: 'IN_PROGRESS' | 'COMPLETED',
  score?: number
) {
  try {
    const data: UserActivityUpdateData = {
      status,
      lastAttemptAt: new Date(),
      attempts: {
        increment: 1,
      },
    }

    if (status === 'COMPLETED') {
      data.completedAt = new Date()
      if (score !== undefined) {
        data.score = score
      }

      // También actualizar la racha del usuario
      await updateUserStreak(userId)
    }

    // Intentar actualizar primero, si no existe crear el registro
    return await db.userActivity.upsert({
      where: {
        userId_activityId: {
          userId,
          activityId,
        },
      },
      update: data,
      create: {
        userId,
        activityId,
        status,
        lastAttemptAt: new Date(),
        attempts: 1,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        score: status === 'COMPLETED' ? score : null,
      },
    })
  } catch (error) {
    console.error('Error actualizando progreso:', error)
    throw new Error('No se pudo actualizar el progreso')
  }
}

// Actualizar la racha del usuario
async function updateUserStreak(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Buscar o crear el registro de racha
    const streak = await db.userStreak.findUnique({
      where: { userId },
    })

    if (!streak) {
      // Si no existe, crear nuevo registro con racha inicial de 1
      await db.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        },
      })
      return
    }

    // Si la última actividad fue ayer, incrementar la racha
    const lastDate = streak.lastActivityDate || new Date(0)
    lastDate.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newCurrentStreak = streak.currentStreak

    if (lastDate.getTime() === yesterday.getTime()) {
      // Si la última actividad fue ayer, incrementar racha
      newCurrentStreak = streak.currentStreak + 1
    } else if (lastDate.getTime() < yesterday.getTime()) {
      // Si pasó más de un día, reiniciar racha
      newCurrentStreak = 1
    }
    // Si la última actividad fue hoy, mantener racha actual

    // Actualizar registro de racha
    await db.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, streak.longestStreak),
        lastActivityDate: today,
      },
    })
  } catch (error) {
    console.error('Error actualizando racha:', error)
  }
}

// Obtener actividades por nivel
export async function getActivitiesByLevel(level: number, userId?: string) {
  try {
    const activities = await db.activity.findMany({
      where: {
        level,
        isPublished: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        userProgress: userId
          ? {
              where: {
                userId,
              },
            }
          : false,
      },
    })

    // Mapear actividades con estado de progreso del usuario
    return activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      type: activity.activityType.toLowerCase() as
        | 'reading'
        | 'listening'
        | 'speaking'
        | 'writing'
        | 'vocabulary',
      points: activity.points,
      duration: activity.duration,
      level: activity.level,
      completed: userId ? activity.userProgress?.[0]?.status === 'COMPLETED' : false,
      locked: false, // TODO: Implementar lógica de bloqueo basada en prerrequisitos
    }))
  } catch (error) {
    console.error('Error obteniendo actividades por nivel:', error)
    throw new Error('No se pudieron obtener las actividades')
  }
}

// Obtener progreso del usuario
export async function getUserProgress(userId: string) {
  try {
    // Obtener racha del usuario
    const streak = await db.userStreak.findUnique({
      where: { userId },
    })

    // Calcular experiencia total basada en actividades completadas
    const completedActivities = await db.userActivity.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        activity: {
          select: {
            points: true,
          },
        },
      },
    })

    const totalExperience = completedActivities.reduce(
      (sum, userActivity) => sum + (userActivity.activity.points || 0),
      0
    )

    // Calcular nivel basado en experiencia (cada 100 puntos = 1 nivel)
    const currentLevel = Math.floor(totalExperience / 100) + 1

    return {
      currentLevel,
      streak: streak?.currentStreak || 0,
      experience: totalExperience,
      nextLevelXP: currentLevel * 100,
    }
  } catch (error) {
    console.error('Error obteniendo progreso del usuario:', error)
    throw new Error('No se pudo obtener el progreso del usuario')
  }
}
