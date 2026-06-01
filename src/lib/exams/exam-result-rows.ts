export interface ExamAttemptForExport {
  attemptNumber: number
  status: string
  score: number | null
  totalPoints: number | null
  maxPoints: number | null
  timeSpent: number | null
  submittedAt: Date | string | null
  recommendedLevel: string | null
  user: { name: string | null; lastName: string | null; email: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'En progreso',
  SUBMITTED: 'Enviado',
  COMPLETED: 'Completado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
}

function formatDate(value: Date | string | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/**
 * Builds the flat, spreadsheet-friendly rows for the exam results export
 * (one row per attempt). Pure function — the "report design" lives here so it
 * can be unit-tested independently of the DB and the download utility.
 * Trello card "Diseñar reporte exportación de exámenes".
 */
export function buildExamResultRows(
  attempts: ExamAttemptForExport[]
): Record<string, unknown>[] {
  return attempts.map((attempt) => ({
    Estudiante:
      [attempt.user?.name, attempt.user?.lastName].filter(Boolean).join(' ').trim() || '—',
    Email: attempt.user?.email ?? '',
    Intento: attempt.attemptNumber,
    Estado: STATUS_LABELS[attempt.status] ?? attempt.status,
    'Puntaje (%)': attempt.score ?? '',
    Puntos: attempt.totalPoints ?? '',
    'Puntos máximos': attempt.maxPoints ?? '',
    'Tiempo (min)': attempt.timeSpent ?? '',
    'Fecha de envío': formatDate(attempt.submittedAt),
    'Nivel recomendado': attempt.recommendedLevel ?? '',
  }))
}
