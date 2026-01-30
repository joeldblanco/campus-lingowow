/**
 * Sistema de backup local para respuestas de exámenes
 * Permite guardar respuestas en localStorage cuando la sesión expira
 */

interface BackupAnswer {
  questionId: string
  answer: unknown
  timestamp: number
  synced: boolean
}

interface ExamBackup {
  attemptId: string
  answers: BackupAnswer[]
  lastUpdated: number
  sessionExpiredAt?: number
}

const BACKUP_KEY_PREFIX = 'exam-backup-'
const BACKUP_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Guardar una respuesta en backup local
 */
export function saveAnswerToBackup(
  attemptId: string,
  questionId: string,
  answer: unknown
): void {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const existing = localStorage.getItem(key)
    
    const backup: ExamBackup = existing 
      ? JSON.parse(existing)
      : {
          attemptId,
          answers: [],
          lastUpdated: Date.now(),
        }

    // Actualizar o añadir respuesta
    const existingAnswerIndex = backup.answers.findIndex(
      (a) => a.questionId === questionId
    )

    if (existingAnswerIndex >= 0) {
      backup.answers[existingAnswerIndex] = {
        questionId,
        answer,
        timestamp: Date.now(),
        synced: false,
      }
    } else {
      backup.answers.push({
        questionId,
        answer,
        timestamp: Date.now(),
        synced: false,
      })
    }

    backup.lastUpdated = Date.now()
    localStorage.setItem(key, JSON.stringify(backup))
  } catch (error) {
    console.error('Error saving answer to backup:', error)
  }
}

/**
 * Obtener todas las respuestas de backup para un intento
 */
export function getBackupAnswers(attemptId: string): Record<string, unknown> {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const backup = localStorage.getItem(key)

    if (!backup) {
      return {}
    }

    const parsed: ExamBackup = JSON.parse(backup)

    // Verificar si el backup ha expirado
    if (Date.now() - parsed.lastUpdated > BACKUP_EXPIRY_TIME) {
      localStorage.removeItem(key)
      return {}
    }

    return parsed.answers.reduce(
      (acc, answer) => {
        acc[answer.questionId] = answer.answer
        return acc
      },
      {} as Record<string, unknown>
    )
  } catch (error) {
    console.error('Error retrieving backup answers:', error)
    return {}
  }
}

/**
 * Obtener respuestas no sincronizadas
 */
export function getUnsyncedAnswers(attemptId: string): string[] {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const backup = localStorage.getItem(key)

    if (!backup) {
      return []
    }

    const parsed: ExamBackup = JSON.parse(backup)
    return parsed.answers
      .filter((a) => !a.synced)
      .map((a) => a.questionId)
  } catch (error) {
    console.error('Error retrieving unsynced answers:', error)
    return []
  }
}

/**
 * Marcar respuestas como sincronizadas
 */
export function markAnswersAsSynced(
  attemptId: string,
  questionIds: string[]
): void {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const backup = localStorage.getItem(key)

    if (!backup) {
      return
    }

    const parsed: ExamBackup = JSON.parse(backup)
    const questionIdSet = new Set(questionIds)

    parsed.answers = parsed.answers.map((answer) => ({
      ...answer,
      synced: questionIdSet.has(answer.questionId) ? true : answer.synced,
    }))

    parsed.lastUpdated = Date.now()
    localStorage.setItem(key, JSON.stringify(parsed))
  } catch (error) {
    console.error('Error marking answers as synced:', error)
  }
}

/**
 * Limpiar backup de un intento
 */
export function clearBackup(attemptId: string): void {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error clearing backup:', error)
  }
}

/**
 * Registrar que la sesión expiró
 */
export function recordSessionExpired(attemptId: string): void {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const backup = localStorage.getItem(key)

    if (!backup) {
      return
    }

    const parsed: ExamBackup = JSON.parse(backup)
    parsed.sessionExpiredAt = Date.now()
    localStorage.setItem(key, JSON.stringify(parsed))
  } catch (error) {
    console.error('Error recording session expiration:', error)
  }
}

/**
 * Obtener información del backup
 */
export function getBackupInfo(attemptId: string): ExamBackup | null {
  try {
    const key = `${BACKUP_KEY_PREFIX}${attemptId}`
    const backup = localStorage.getItem(key)

    if (!backup) {
      return null
    }

    return JSON.parse(backup)
  } catch (error) {
    console.error('Error retrieving backup info:', error)
    return null
  }
}
