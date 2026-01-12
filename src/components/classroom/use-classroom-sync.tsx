'use client'

import { useContext, createContext, useCallback } from 'react'
import { BlockNavigationState } from './collaboration-context'

interface ClassroomSyncContextType {
  sendBlockResponse: (blockId: string, blockType: string, response: unknown, isCorrect?: boolean, score?: number) => void
  syncBlockNavigation: (blockId: string, currentStep: number, totalSteps: number, hasStarted: boolean, isCompleted: boolean) => void
  remoteBlockNavigation: Map<string, BlockNavigationState>
  isInClassroom: boolean
  isTeacher: boolean
}

export const ClassroomSyncContext = createContext<ClassroomSyncContextType | null>(null)

export function useClassroomSync() {
  const context = useContext(ClassroomSyncContext)
  
  const isTeacher = context?.isTeacher ?? false
  const isInClassroom = context?.isInClassroom ?? false
  
  // Only students can send responses (not teachers)
  const canInteract = isInClassroom && !isTeacher
  
  const sendBlockResponse = useCallback((
    blockId: string,
    blockType: string,
    response: unknown,
    isCorrect?: boolean,
    score?: number
  ) => {
    // Only send if in classroom AND is a student (not teacher)
    if (canInteract) {
      context?.sendBlockResponse(blockId, blockType, response, isCorrect, score)
    }
  }, [context, canInteract])

  // Sync block navigation state (for multi-step blocks)
  const syncBlockNavigation = useCallback((
    blockId: string,
    currentStep: number,
    totalSteps: number,
    hasStarted: boolean,
    isCompleted: boolean
  ) => {
    // Only students sync their navigation state
    if (canInteract) {
      context?.syncBlockNavigation(blockId, currentStep, totalSteps, hasStarted, isCompleted)
    }
  }, [context, canInteract])

  // Get remote navigation state for a specific block
  const getRemoteNavigation = useCallback((blockId: string): BlockNavigationState | undefined => {
    return context?.remoteBlockNavigation.get(blockId)
  }, [context])

  return {
    sendBlockResponse,
    syncBlockNavigation,
    getRemoteNavigation,
    remoteBlockNavigation: context?.remoteBlockNavigation ?? new Map(),
    isInClassroom,
    isTeacher,
    canInteract, // True only for students in classroom
  }
}
