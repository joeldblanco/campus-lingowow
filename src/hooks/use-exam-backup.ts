'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  saveAnswerToBackup,
  getBackupAnswers,
  getUnsyncedAnswers,
  markAnswersAsSynced,
  clearBackup,
  recordSessionExpired,
  getBackupInfo,
} from '@/lib/exam-backup'

interface UseExamBackupProps {
  attemptId: string
  enabled?: boolean
}

export function useExamBackup({ attemptId, enabled = true }: UseExamBackupProps) {
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [hasBackup, setHasBackup] = useState(false)

  // Actualizar contador de respuestas no sincronizadas
  const updateUnsyncedCount = useCallback(() => {
    if (!enabled) return
    const unsynced = getUnsyncedAnswers(attemptId)
    setUnsyncedCount(unsynced.length)
  }, [attemptId, enabled])

  // Guardar respuesta en backup
  const saveAnswer = useCallback(
    (questionId: string, answer: unknown) => {
      if (!enabled) return
      saveAnswerToBackup(attemptId, questionId, answer)
      updateUnsyncedCount()
    },
    [attemptId, enabled, updateUnsyncedCount]
  )

  // Obtener respuestas de backup
  const getBackup = useCallback(() => {
    if (!enabled) return {}
    return getBackupAnswers(attemptId)
  }, [attemptId, enabled])

  // Obtener respuestas no sincronizadas
  const getUnsynced = useCallback(() => {
    if (!enabled) return []
    return getUnsyncedAnswers(attemptId)
  }, [attemptId, enabled])

  // Marcar respuestas como sincronizadas
  const markSynced = useCallback(
    (questionIds: string[]) => {
      if (!enabled) return
      markAnswersAsSynced(attemptId, questionIds)
      updateUnsyncedCount()
    },
    [attemptId, enabled, updateUnsyncedCount]
  )

  // Registrar que la sesión expiró
  const recordExpired = useCallback(() => {
    if (!enabled) return
    recordSessionExpired(attemptId)
  }, [attemptId, enabled])

  // Limpiar backup
  const clear = useCallback(() => {
    if (!enabled) return
    clearBackup(attemptId)
    setUnsyncedCount(0)
    setHasBackup(false)
  }, [attemptId, enabled])

  // Obtener información del backup
  const getInfo = useCallback(() => {
    if (!enabled) return null
    return getBackupInfo(attemptId)
  }, [attemptId, enabled])

  // Verificar si hay backup al montar
  useEffect(() => {
    if (!enabled) return
    const info = getBackupInfo(attemptId)
    setHasBackup(!!info)
    updateUnsyncedCount()
  }, [attemptId, enabled, updateUnsyncedCount])

  return {
    unsyncedCount,
    hasBackup,
    saveAnswer,
    getBackup,
    getUnsynced,
    markSynced,
    recordExpired,
    clear,
    getInfo,
  }
}
