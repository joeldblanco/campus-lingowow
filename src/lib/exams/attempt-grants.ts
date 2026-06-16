import { db } from '@/lib/db'

/**
 * Suma de intentos extra otorgados a un estudiante para un examen concreto.
 * Cada fila de ExamAttemptGrant representa una concesión (+N) con su autor/motivo,
 * por lo que conservamos el historial completo y aquí solo agregamos el total.
 */
export async function getGrantedExtraAttempts(examId: string, userId: string): Promise<number> {
  const grant = await db.examAttemptGrant.aggregate({
    where: { examId, userId },
    _sum: { extraAttempts: true },
  })
  return grant._sum.extraAttempts ?? 0
}

/**
 * Versión por lotes: total de intentos extra por examen para un mismo estudiante.
 * Evita N consultas cuando se listan varios exámenes del estudiante a la vez.
 */
export async function getGrantedExtraAttemptsByExam(
  examIds: string[],
  userId: string
): Promise<Record<string, number>> {
  if (examIds.length === 0) return {}

  const grants = await db.examAttemptGrant.groupBy({
    by: ['examId'],
    where: { userId, examId: { in: examIds } },
    _sum: { extraAttempts: true },
  })

  return grants.reduce<Record<string, number>>((acc, g) => {
    acc[g.examId] = g._sum.extraAttempts ?? 0
    return acc
  }, {})
}

/**
 * Máximo efectivo de intentos para un estudiante: tope base del examen + extras otorgados.
 */
export async function getEffectiveMaxAttempts(
  baseMaxAttempts: number,
  examId: string,
  userId: string
): Promise<number> {
  return baseMaxAttempts + (await getGrantedExtraAttempts(examId, userId))
}
