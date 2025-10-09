'use server'

import { UserActivityUpdateData } from '@/types/activity'
import { ActivityFormValues } from '@/schemas/activity'
import { db } from '@/lib/db'
import { getCurrentDate, getTodayStart, addDaysToDate, getDayOfWeek, isSameDayDate } from '@/lib/utils/date'

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
      lastAttemptAt: getCurrentDate(),
      attempts: {
        increment: 1,
      },
    }

    if (status === 'COMPLETED') {
      data.completedAt = getCurrentDate()
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
        lastAttemptAt: getCurrentDate(),
        attempts: 1,
        completedAt: status === 'COMPLETED' ? getCurrentDate() : null,
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
  const today = getTodayStart()

  try {
    // Buscar o crear el registro de racha
    const streak = await db.userStreak.findUnique({
      where: { userId },
    })

    // Verificar si el usuario ya completó una actividad hoy
    const todayActivities = await db.userActivity.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: today,
          lt: addDaysToDate(today, 1) // Fin del día actual
        }
      }
    })

    // Si ya completó una actividad hoy, no hacer nada
    if (todayActivities > 1) {
      return
    }

    if (!streak) {
      // Si no existe, crear nuevo registro con racha inicial de 1 (primera actividad)
      await db.userStreak.create({
        data: {
          userId,
          currentStreak: 1, // Primera actividad = racha de 1
          longestStreak: 1,
          lastActivityDate: today,
        },
      })
      return
    }

    // Si la última actividad fue ayer, incrementar la racha
    const lastDate = streak.lastActivityDate ? getTodayStart() : new Date(0)
    const yesterday = addDaysToDate(today, -1)

    let newCurrentStreak = 0 // Por defecto, racha perdida (0)

    if (isSameDayDate(lastDate, yesterday)) {
      // Si la última actividad fue ayer, incrementar racha
      newCurrentStreak = streak.currentStreak + 1
    } else if (isSameDayDate(lastDate, today)) {
      // Si la última actividad fue hoy, mantener racha actual
      newCurrentStreak = streak.currentStreak
    } else if (lastDate < yesterday) {
      // Si pasó más de un día, racha perdida (0)
      newCurrentStreak = 0
    }

    // Solo actualizar si es la primera actividad del día o si se perdió la racha
    if (todayActivities === 0 || newCurrentStreak === 1) {
      await db.userStreak.update({
        where: { userId },
        data: {
          currentStreak: newCurrentStreak,
          longestStreak: newCurrentStreak > streak.longestStreak ? newCurrentStreak : streak.longestStreak,
          lastActivityDate: today,
        },
      })
    }
  } catch (error) {
    console.error('Error al actualizar la racha del usuario:', error)
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
    
    // Calcular XP dentro del nivel actual
    const currentLevelBaseXP = (currentLevel - 1) * 100
    const currentLevelXP = totalExperience - currentLevelBaseXP
    const nextLevelXP = currentLevel * 100

    return {
      currentLevel,
      streak: streak?.currentStreak || 0,
      experience: totalExperience,
      currentLevelXP,
      nextLevelXP,
      xpToNextLevel: nextLevelXP - totalExperience,
    }
  } catch (error) {
    console.error('Error obteniendo progreso del usuario:', error)
    throw new Error('No se pudo obtener el progreso del usuario')
  }
}

// Obtener resumen de actividades por nivel para el mapa de aprendizaje
export async function getActivitiesSummaryByLevels(userId?: string, maxLevel: number = 10) {
  try {
    const levelsSummary = []
    
    for (let level = 1; level <= maxLevel; level++) {
      // Contar actividades totales del nivel
      const totalActivities = await db.activity.count({
        where: {
          level,
          isPublished: true,
        },
      })
      
      let completedActivities = 0
      if (userId) {
        // Contar actividades completadas por el usuario en este nivel
        completedActivities = await db.userActivity.count({
          where: {
            userId,
            status: 'COMPLETED',
            activity: {
              level,
              isPublished: true,
            },
          },
        })
      }
      
      // Obtener una actividad representativa del nivel para el nombre
      const sampleActivity = await db.activity.findFirst({
        where: {
          level,
          isPublished: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })
      
      levelsSummary.push({
        level,
        totalActivities,
        completedActivities,
        levelName: sampleActivity?.title ? `Nivel ${level}` : `Nivel ${level}`,
        hasActivities: totalActivities > 0,
        isComplete: userId ? completedActivities === totalActivities && totalActivities > 0 : false,
        progress: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
      })
    }
    
    return levelsSummary
  } catch (error) {
    console.error('Error obteniendo resumen de actividades por niveles:', error)
    throw new Error('No se pudo obtener el resumen de actividades')
  }
}

// Obtener actividad semanal del usuario
export async function getUserWeeklyActivity(userId: string) {
  try {
    const today = getTodayStart()
    
    // Obtener el lunes de esta semana
    const dayOfWeek = getDayOfWeek(today)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Domingo = 0, necesitamos que sea 6
    const mondayOfWeek = addDaysToDate(today, -daysFromMonday)
    
    // Crear array de los 7 días de la semana
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = addDaysToDate(mondayOfWeek, i)
      weekDays.push(day)
    }
    
    // Obtener actividades completadas para cada día de la semana
    const weeklyActivity = await Promise.all(
      weekDays.map(async (day) => {
        const nextDay = addDaysToDate(day, 1)
        
        const activitiesCount = await db.userActivity.count({
          where: {
            userId,
            status: 'COMPLETED',
            completedAt: {
              gte: day,
              lt: nextDay,
            },
          },
        })
        
        return {
          date: day,
          hasActivity: activitiesCount > 0,
          isToday: isSameDayDate(day, today),
        }
      })
    )
    
    return weeklyActivity
  } catch (error) {
    console.error('Error obteniendo actividad semanal:', error)
    throw new Error('No se pudo obtener la actividad semanal')
  }
}
