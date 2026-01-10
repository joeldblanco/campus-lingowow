'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'

export interface AIGradingLimits {
  essayLesson: number
  essayExam: number
  recording: number
}

const DEFAULT_LIMITS: AIGradingLimits = {
  essayLesson: 5,
  essayExam: 10,
  recording: 3
}

const PLAN_LIMITS: Record<string, AIGradingLimits> = {
  free: { essayLesson: 3, essayExam: 5, recording: 2 },
  go: { essayLesson: 10, essayExam: 20, recording: 5 },
  lingo: { essayLesson: 30, essayExam: 50, recording: 15 },
  wow: { essayLesson: -1, essayExam: -1, recording: -1 } // -1 = unlimited
}

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export async function getUserAIGradingLimits(userId?: string): Promise<{
  limits: AIGradingLimits
  usage: AIGradingLimits
  remaining: AIGradingLimits
  planName: string
}> {
  const session = await auth()
  const targetUserId = userId || session?.user?.id

  if (!targetUserId) {
    return {
      limits: DEFAULT_LIMITS,
      usage: { essayLesson: 0, essayExam: 0, recording: 0 },
      remaining: DEFAULT_LIMITS,
      planName: 'free'
    }
  }

  const subscription = await db.subscription.findFirst({
    where: {
      userId: targetUserId,
      status: 'ACTIVE'
    },
    include: {
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  })

  const planSlug = subscription?.plan?.slug?.toLowerCase() || 'free'
  const limits = PLAN_LIMITS[planSlug] || DEFAULT_LIMITS

  const { start, end } = getCurrentPeriod()

  const usageRecords = await db.aIGradingUsage.groupBy({
    by: ['usageType'],
    where: {
      userId: targetUserId,
      periodStart: { gte: start },
      periodEnd: { lte: end }
    },
    _count: { id: true }
  })

  const usage: AIGradingLimits = {
    essayLesson: 0,
    essayExam: 0,
    recording: 0
  }

  usageRecords.forEach(record => {
    if (record.usageType === 'essay_lesson') {
      usage.essayLesson = record._count.id
    } else if (record.usageType === 'essay_exam') {
      usage.essayExam = record._count.id
    } else if (record.usageType === 'recording') {
      usage.recording = record._count.id
    }
  })

  const remaining: AIGradingLimits = {
    essayLesson: limits.essayLesson === -1 ? -1 : Math.max(0, limits.essayLesson - usage.essayLesson),
    essayExam: limits.essayExam === -1 ? -1 : Math.max(0, limits.essayExam - usage.essayExam),
    recording: limits.recording === -1 ? -1 : Math.max(0, limits.recording - usage.recording)
  }

  return { limits, usage, remaining, planName: planSlug }
}

export async function canUseAIGrading(
  usageType: 'essay_lesson' | 'essay_exam' | 'recording'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { allowed: false, remaining: 0, limit: 0 }
  }

  const { limits, remaining } = await getUserAIGradingLimits(session.user.id)

  let limit: number
  let remainingCount: number

  switch (usageType) {
    case 'essay_lesson':
      limit = limits.essayLesson
      remainingCount = remaining.essayLesson
      break
    case 'essay_exam':
      limit = limits.essayExam
      remainingCount = remaining.essayExam
      break
    case 'recording':
      limit = limits.recording
      remainingCount = remaining.recording
      break
  }

  const allowed = limit === -1 || remainingCount > 0

  return { allowed, remaining: remainingCount, limit }
}

export async function recordAIGradingUsage(
  usageType: 'essay_lesson' | 'essay_exam' | 'recording',
  entityId?: string,
  entityType?: string,
  tokensUsed?: number
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'No autorizado' }
  }

  const { allowed, remaining, limit } = await canUseAIGrading(usageType)

  if (!allowed) {
    return {
      success: false,
      error: `Has alcanzado el límite de ${limit} correcciones con IA para este mes`
    }
  }

  const { start, end } = getCurrentPeriod()

  try {
    await db.aIGradingUsage.create({
      data: {
        userId: session.user.id,
        usageType,
        entityId,
        entityType,
        tokensUsed,
        periodStart: start,
        periodEnd: end
      }
    })

    const newRemaining = limit === -1 ? -1 : remaining - 1

    return { success: true, remaining: newRemaining }
  } catch (error) {
    console.error('Error recording AI grading usage:', error)
    return { success: false, error: 'Error al registrar el uso de IA' }
  }
}

export async function getAIGradingUsageHistory(
  limit: number = 10
): Promise<{
  success: boolean
  history?: Array<{
    id: string
    usageType: string
    entityId: string | null
    createdAt: Date
  }>
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'No autorizado' }
  }

  try {
    const history = await db.aIGradingUsage.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        usageType: true,
        entityId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return { success: true, history }
  } catch (error) {
    console.error('Error fetching AI grading history:', error)
    return { success: false, error: 'Error al obtener el historial' }
  }
}
