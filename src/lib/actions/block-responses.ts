'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export interface BlockResponseData {
  contentId: string
  blockId: string
  blockType: string
  response: unknown
  maxScore?: number
}

export interface SaveBlockResponseResult {
  success: boolean
  error?: string
  response?: {
    id: string
    score: number | null
    feedback: string | null
    isCorrect: boolean | null
  }
}

export async function saveBlockResponse(data: BlockResponseData): Promise<SaveBlockResponseResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const content = await db.content.findUnique({
      where: { id: data.contentId },
      select: { id: true, lessonId: true }
    })

    if (!content) {
      return { success: false, error: 'Contenido no encontrado' }
    }

    const savedResponse = await db.blockResponse.upsert({
      where: {
        userId_contentId_blockId: {
          userId: session.user.id,
          contentId: data.contentId,
          blockId: data.blockId
        }
      },
      update: {
        response: data.response as object,
        blockType: data.blockType,
        maxScore: data.maxScore,
        submittedAt: new Date()
      },
      create: {
        userId: session.user.id,
        contentId: data.contentId,
        blockId: data.blockId,
        blockType: data.blockType,
        response: data.response as object,
        maxScore: data.maxScore,
        submittedAt: new Date()
      }
    })

    revalidatePath(`/classroom`)
    return { 
      success: true, 
      response: {
        id: savedResponse.id,
        score: savedResponse.score,
        feedback: savedResponse.feedback,
        isCorrect: savedResponse.isCorrect
      }
    }
  } catch (error) {
    console.error('Error saving block response:', error)
    return { success: false, error: 'Error al guardar la respuesta' }
  }
}

export async function getBlockResponses(contentId: string, userId?: string) {
  try {
    const session = await auth()
    const targetUserId = userId || session?.user?.id

    if (!targetUserId) {
      return { success: false, error: 'No autorizado' }
    }

    const responses = await db.blockResponse.findMany({
      where: {
        contentId,
        userId: targetUserId
      }
    })

    const responsesMap = responses.reduce((acc: Record<string, unknown>, response) => {
      acc[response.blockId] = {
        id: response.id,
        response: response.response,
        score: response.score,
        maxScore: response.maxScore,
        isCorrect: response.isCorrect,
        feedback: response.feedback,
        gradedBy: response.gradedBy,
        gradedAt: response.gradedAt,
        submittedAt: response.submittedAt
      }
      return acc
    }, {} as Record<string, unknown>)

    return { success: true, responses: responsesMap }
  } catch (error) {
    console.error('Error fetching block responses:', error)
    return { success: false, error: 'Error al obtener las respuestas' }
  }
}

export async function gradeBlockResponse(
  responseId: string,
  score: number,
  feedback: string
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const userRoles = session.user.roles || []
    if (!userRoles.includes('TEACHER') && !userRoles.includes('ADMIN')) {
      return { success: false, error: 'No tienes permiso para calificar' }
    }

    const response = await db.blockResponse.findUnique({
      where: { id: responseId }
    })

    if (!response) {
      return { success: false, error: 'Respuesta no encontrada' }
    }

    if (response.maxScore && score > response.maxScore) {
      return { success: false, error: 'El puntaje no puede exceder el máximo' }
    }

    const updatedResponse = await db.blockResponse.update({
      where: { id: responseId },
      data: {
        score,
        feedback,
        isCorrect: response.maxScore ? score >= response.maxScore * 0.6 : null,
        gradedBy: session.user.id,
        gradedAt: new Date()
      }
    })

    revalidatePath('/teacher')
    return { success: true, response: updatedResponse }
  } catch (error) {
    console.error('Error grading block response:', error)
    return { success: false, error: 'Error al calificar la respuesta' }
  }
}

export async function getPendingBlockResponses(lessonId?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const userRoles = session.user.roles || []
    if (!userRoles.includes('TEACHER') && !userRoles.includes('ADMIN')) {
      return { success: false, error: 'No tienes permiso para ver respuestas pendientes' }
    }

    const whereClause: {
      gradedAt: null
      blockType: { in: string[] }
      content?: { lessonId: string }
    } = {
      gradedAt: null,
      blockType: { in: ['essay', 'recording'] }
    }

    if (lessonId) {
      whereClause.content = { lessonId }
    }

    const pendingResponses = await db.blockResponse.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true
          }
        },
        content: {
          select: {
            id: true,
            title: true,
            lessonId: true,
            lesson: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    })

    return { success: true, responses: pendingResponses }
  } catch (error) {
    console.error('Error fetching pending block responses:', error)
    return { success: false, error: 'Error al obtener respuestas pendientes' }
  }
}
