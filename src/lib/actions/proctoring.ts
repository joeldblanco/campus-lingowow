'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'

export type ProctorEventType = 
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'right_click'
  | 'window_blur'
  | 'window_focus'
  | 'fullscreen_enter'
  | 'exam_start'
  | 'exam_submit'

export type EventSeverity = 'info' | 'warning' | 'critical'

const EVENT_SEVERITY_MAP: Record<ProctorEventType, EventSeverity> = {
  tab_switch: 'warning',
  fullscreen_exit: 'warning',
  copy_attempt: 'critical',
  paste_attempt: 'critical',
  right_click: 'warning',
  window_blur: 'warning',
  window_focus: 'info',
  fullscreen_enter: 'info',
  exam_start: 'info',
  exam_submit: 'info'
}

const EVENT_DESCRIPTIONS: Record<ProctorEventType, string> = {
  tab_switch: 'El estudiante cambió de pestaña',
  fullscreen_exit: 'El estudiante salió del modo pantalla completa',
  copy_attempt: 'El estudiante intentó copiar contenido',
  paste_attempt: 'El estudiante intentó pegar contenido',
  right_click: 'El estudiante hizo clic derecho',
  window_blur: 'La ventana del examen perdió el foco',
  window_focus: 'La ventana del examen recuperó el foco',
  fullscreen_enter: 'El estudiante entró en modo pantalla completa',
  exam_start: 'El estudiante inició el examen',
  exam_submit: 'El estudiante envió el examen'
}

export async function recordProctorEvent(
  attemptId: string,
  eventType: ProctorEventType,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, status: true }
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.userId !== session.user.id) {
      return { success: false, error: 'No tienes permiso para este intento' }
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return { success: true }
    }

    await db.proctorEvent.create({
      data: {
        attemptId,
        eventType,
        severity: EVENT_SEVERITY_MAP[eventType] || 'warning',
        description: EVENT_DESCRIPTIONS[eventType] || eventType,
        metadata: metadata as object | undefined
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error recording proctor event:', error)
    return { success: false, error: 'Error al registrar evento' }
  }
}

export async function getProctorEvents(attemptId: string): Promise<{
  success: boolean
  events?: Array<{
    id: string
    eventType: string
    severity: string
    description: string | null
    timestamp: Date
    metadata: unknown
  }>
  summary?: {
    total: number
    warnings: number
    critical: number
    tabSwitches: number
    fullscreenExits: number
  }
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const userRoles = session.user.roles || []
    const isTeacherOrAdmin = userRoles.includes('TEACHER') || userRoles.includes('ADMIN')

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true }
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.userId !== session.user.id && !isTeacherOrAdmin) {
      return { success: false, error: 'No tienes permiso para ver estos eventos' }
    }

    const events = await db.proctorEvent.findMany({
      where: { attemptId },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        eventType: true,
        severity: true,
        description: true,
        timestamp: true,
        metadata: true
      }
    })

    const summary = {
      total: events.length,
      warnings: events.filter(e => e.severity === 'warning').length,
      critical: events.filter(e => e.severity === 'critical').length,
      tabSwitches: events.filter(e => e.eventType === 'tab_switch').length,
      fullscreenExits: events.filter(e => e.eventType === 'fullscreen_exit').length
    }

    return { success: true, events, summary }
  } catch (error) {
    console.error('Error fetching proctor events:', error)
    return { success: false, error: 'Error al obtener eventos' }
  }
}

export async function getViolationCount(attemptId: string): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true }
    })

    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' }
    }

    if (attempt.userId !== session.user.id) {
      return { success: false, error: 'No tienes permiso' }
    }

    // Contar solo eventos de warning y critical (violaciones)
    const count = await db.proctorEvent.count({
      where: {
        attemptId,
        severity: { in: ['warning', 'critical'] }
      }
    })

    return { success: true, count }
  } catch (error) {
    console.error('Error getting violation count:', error)
    return { success: false, error: 'Error al obtener conteo' }
  }
}

export async function getProctoringSummaryForAttempts(attemptIds: string[]): Promise<{
  success: boolean
  summaries?: Record<string, {
    total: number
    warnings: number
    critical: number
  }>
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const userRoles = session.user.roles || []
    if (!userRoles.includes('TEACHER') && !userRoles.includes('ADMIN')) {
      return { success: false, error: 'No tienes permiso para ver estos datos' }
    }

    const events = await db.proctorEvent.groupBy({
      by: ['attemptId', 'severity'],
      where: { attemptId: { in: attemptIds } },
      _count: { id: true }
    })

    const summaries: Record<string, { total: number; warnings: number; critical: number }> = {}

    attemptIds.forEach(id => {
      summaries[id] = { total: 0, warnings: 0, critical: 0 }
    })

    events.forEach(event => {
      if (!summaries[event.attemptId]) {
        summaries[event.attemptId] = { total: 0, warnings: 0, critical: 0 }
      }
      summaries[event.attemptId].total += event._count.id
      if (event.severity === 'warning') {
        summaries[event.attemptId].warnings += event._count.id
      } else if (event.severity === 'critical') {
        summaries[event.attemptId].critical += event._count.id
      }
    })

    return { success: true, summaries }
  } catch (error) {
    console.error('Error fetching proctoring summaries:', error)
    return { success: false, error: 'Error al obtener resúmenes' }
  }
}
