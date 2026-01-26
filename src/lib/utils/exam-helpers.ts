import type { ExamWithDetails } from '@/types/exam'

export function calculateExamPoints(exam: ExamWithDetails): number {
  return exam.questions.reduce((sum, q) => sum + (q.points || 0), 0)
}

export function formatExamDuration(minutes: number | null): string {
  if (!minutes) return 'Sin límite'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins} minutos`
}
