'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLiveKit } from './livekit-context'

interface CursorPosition {
  x: number
  y: number
  participantId: string
  participantName: string
  isTeacher: boolean
  timestamp: number
}

interface TextSelection {
  startOffset: number
  endOffset: number
  blockId: string
  text: string
  participantId: string
  participantName: string
  isTeacher: boolean
}

interface AudioSyncState {
  blockId: string
  isPlaying: boolean
  currentTime: number
  timestamp: number
}

export interface InteractiveBlockResponse {
  blockId: string
  blockType: string
  participantId: string
  participantName: string
  isTeacher: boolean
  timestamp: number
  response: unknown // The actual response data varies by block type
  isCorrect?: boolean // For blocks that have correct/incorrect answers
  score?: number // For scored blocks
}

export interface BlockNavigationState {
  blockId: string
  currentStep: number
  totalSteps: number
  hasStarted: boolean
  isCompleted: boolean
  participantName: string
  timestamp: number
  currentAnswers?: Record<string, string> // Current answers for multi-step blocks like Quiz
}

interface CollaborationContextType {
  // Cursor
  remoteCursor: CursorPosition | null
  updateCursorPosition: (x: number, y: number, containerRect: DOMRect) => void

  // Text Selection
  remoteSelection: TextSelection | null
  localSelection: TextSelection | null
  updateTextSelection: (selection: TextSelection | null) => void

  // Audio Sync
  remoteAudioState: AudioSyncState | null
  syncAudioPlay: (blockId: string, currentTime: number) => void
  syncAudioPause: (blockId: string, currentTime: number) => void
  syncAudioSeek: (blockId: string, currentTime: number) => void

  // Interactive Block Responses (student answers to exercises)
  remoteBlockResponses: Map<string, InteractiveBlockResponse>
  sendBlockResponse: (blockId: string, blockType: string, response: unknown, isCorrect?: boolean, score?: number) => void
  clearBlockResponse: (blockId: string) => void

  // Block Navigation State (for multi-step blocks like Quiz, FillBlanks, etc.)
  remoteBlockNavigation: Map<string, BlockNavigationState>
  syncBlockNavigation: (blockId: string, currentStep: number, totalSteps: number, hasStarted: boolean, isCompleted: boolean, currentAnswers?: Record<string, string>) => void

  // Whiteboard (handled separately by Excalidraw collaboration)

  // Screen Share
  isRemoteScreenSharing: boolean
  remoteScreenTrack: MediaStreamTrack | null

  // Configuration
  isTeacher: boolean
  participantName: string
}

const CollaborationContext = createContext<CollaborationContextType | null>(null)

export function useCollaboration() {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider')
  }
  return context
}

interface CollaborationProviderProps {
  children: React.ReactNode
  isTeacher: boolean
  participantName: string
}

export function CollaborationProvider({
  children,
  isTeacher,
  participantName
}: CollaborationProviderProps) {
  const { sendCommand, addCommandListener, removeCommandListener, connectionStatus } = useLiveKit()

  // Cursor state
  const [remoteCursor, setRemoteCursor] = useState<CursorPosition | null>(null)
  const cursorThrottleRef = useRef<number>(0)

  // Text selection state
  const [remoteSelection, setRemoteSelection] = useState<TextSelection | null>(null)
  const [localSelection, setLocalSelection] = useState<TextSelection | null>(null)

  // Audio sync state
  const [remoteAudioState, setRemoteAudioState] = useState<AudioSyncState | null>(null)

  // Interactive block responses state (for student answers to exercises)
  const [remoteBlockResponses, setRemoteBlockResponses] = useState<Map<string, InteractiveBlockResponse>>(new Map())

  // Block navigation state (for multi-step blocks like Quiz, FillBlanks, etc.)
  const [remoteBlockNavigation, setRemoteBlockNavigation] = useState<Map<string, BlockNavigationState>>(new Map())

  // Screen share state (will be used when screen share listener is implemented)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRemoteScreenSharing, _setIsRemoteScreenSharing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [remoteScreenTrack, _setRemoteScreenTrack] = useState<MediaStreamTrack | null>(null)

  // Handle incoming cursor updates
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleCursorUpdate = (data: Record<string, unknown>) => {
      if (data.type === 'CURSOR_MOVE') {
        setRemoteCursor({
          x: data.x as number,
          y: data.y as number,
          participantId: data.participantId as string,
          participantName: data.participantName as string,
          isTeacher: data.isTeacher as boolean,
          timestamp: Date.now(),
        })
      } else if (data.type === 'CURSOR_LEAVE') {
        setRemoteCursor(null)
      }
    }

    addCommandListener('cursor-sync', handleCursorUpdate)
    return () => removeCommandListener('cursor-sync', handleCursorUpdate)
  }, [connectionStatus, addCommandListener, removeCommandListener])

  // Handle incoming text selection updates
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleSelectionUpdate = (data: Record<string, unknown>) => {
      if (data.type === 'TEXT_SELECT') {
        setRemoteSelection({
          startOffset: data.startOffset as number,
          endOffset: data.endOffset as number,
          blockId: data.blockId as string,
          text: data.text as string,
          participantId: data.participantId as string,
          participantName: data.participantName as string,
          isTeacher: data.isTeacher as boolean,
        })
      } else if (data.type === 'TEXT_DESELECT') {
        setRemoteSelection(null)
      }
    }

    addCommandListener('selection-sync', handleSelectionUpdate)
    return () => removeCommandListener('selection-sync', handleSelectionUpdate)
  }, [connectionStatus, addCommandListener, removeCommandListener])

  // Handle incoming audio sync updates
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleAudioSync = (data: Record<string, unknown>) => {
      if (data.type === 'AUDIO_PLAY' || data.type === 'AUDIO_PAUSE' || data.type === 'AUDIO_SEEK') {
        setRemoteAudioState({
          blockId: data.blockId as string,
          isPlaying: data.type === 'AUDIO_PLAY',
          currentTime: data.currentTime as number,
          timestamp: Date.now(),
        })
      }
    }

    addCommandListener('audio-sync', handleAudioSync)
    return () => removeCommandListener('audio-sync', handleAudioSync)
  }, [connectionStatus, addCommandListener, removeCommandListener])

  // Handle incoming interactive block responses
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleBlockResponse = (data: Record<string, unknown>) => {
      if (data.type === 'BLOCK_RESPONSE') {
        const response: InteractiveBlockResponse = {
          blockId: data.blockId as string,
          blockType: data.blockType as string,
          participantId: data.participantId as string,
          participantName: data.participantName as string,
          isTeacher: data.isTeacher as boolean,
          timestamp: Date.now(),
          response: data.response,
          isCorrect: data.isCorrect as boolean | undefined,
          score: data.score as number | undefined,
        }
        setRemoteBlockResponses(prev => {
          const newMap = new Map(prev)
          newMap.set(response.blockId, response)
          return newMap
        })
      } else if (data.type === 'BLOCK_RESPONSE_CLEAR') {
        setRemoteBlockResponses(prev => {
          const newMap = new Map(prev)
          newMap.delete(data.blockId as string)
          return newMap
        })
      }
    }

    addCommandListener('block-response', handleBlockResponse)
    return () => removeCommandListener('block-response', handleBlockResponse)
  }, [connectionStatus, addCommandListener, removeCommandListener])

  // Handle incoming block navigation updates (for multi-step blocks)
  useEffect(() => {
    if (connectionStatus !== 'connected') return

    const handleBlockNavigation = (data: Record<string, unknown>) => {
      if (data.type === 'BLOCK_NAVIGATION') {
        const navState: BlockNavigationState = {
          blockId: data.blockId as string,
          currentStep: data.currentStep as number,
          totalSteps: data.totalSteps as number,
          hasStarted: data.hasStarted as boolean,
          isCompleted: data.isCompleted as boolean,
          participantName: data.participantName as string,
          timestamp: Date.now(),
          currentAnswers: data.currentAnswers as Record<string, string> | undefined,
        }
        setRemoteBlockNavigation(prev => {
          const newMap = new Map(prev)
          newMap.set(navState.blockId, navState)
          return newMap
        })
      }
    }

    addCommandListener('block-navigation', handleBlockNavigation)
    return () => removeCommandListener('block-navigation', handleBlockNavigation)
  }, [connectionStatus, addCommandListener, removeCommandListener])

  // Clear stale cursor after 3 seconds of inactivity
  useEffect(() => {
    if (!remoteCursor) return

    const timeout = setTimeout(() => {
      if (remoteCursor && Date.now() - remoteCursor.timestamp > 3000) {
        setRemoteCursor(null)
      }
    }, 3000)

    return () => clearTimeout(timeout)
  }, [remoteCursor])

  // Update cursor position (throttled to 60fps max)
  const updateCursorPosition = useCallback((x: number, y: number, containerRect: DOMRect) => {
    const now = Date.now()
    if (now - cursorThrottleRef.current < 16) return // ~60fps
    cursorThrottleRef.current = now

    // Convert to percentage for responsive positioning
    const relativeX = ((x - containerRect.left) / containerRect.width) * 100
    const relativeY = ((y - containerRect.top) / containerRect.height) * 100

    sendCommand('cursor-sync', {
      type: 'CURSOR_MOVE',
      x: relativeX,
      y: relativeY,
      participantId: isTeacher ? 'teacher' : 'student',
      participantName,
      isTeacher,
    })
  }, [sendCommand, isTeacher, participantName])

  // Update text selection
  const updateTextSelection = useCallback((selection: TextSelection | null) => {
    if (selection) {
      // Optimistic update: Show the selection immediately for the local user
      setLocalSelection({
        ...selection,
        participantId: isTeacher ? 'teacher' : 'student',
        participantName,
        isTeacher,
      })

      sendCommand('selection-sync', {
        type: 'TEXT_SELECT',
        ...selection,
        participantId: isTeacher ? 'teacher' : 'student',
        participantName,
        isTeacher,
      })
    } else {
      // Optimistic update: Clear selection locally
      setLocalSelection(null)

      sendCommand('selection-sync', {
        type: 'TEXT_DESELECT',
        participantId: isTeacher ? 'teacher' : 'student',
      })
    }
  }, [sendCommand, isTeacher, participantName])

  // Audio sync functions
  const syncAudioPlay = useCallback((blockId: string, currentTime: number) => {
    sendCommand('audio-sync', {
      type: 'AUDIO_PLAY',
      blockId,
      currentTime,
      participantId: isTeacher ? 'teacher' : 'student',
    })
  }, [sendCommand, isTeacher])

  const syncAudioPause = useCallback((blockId: string, currentTime: number) => {
    sendCommand('audio-sync', {
      type: 'AUDIO_PAUSE',
      blockId,
      currentTime,
      participantId: isTeacher ? 'teacher' : 'student',
    })
  }, [sendCommand, isTeacher])

  const syncAudioSeek = useCallback((blockId: string, currentTime: number) => {
    sendCommand('audio-sync', {
      type: 'AUDIO_SEEK',
      blockId,
      currentTime,
      participantId: isTeacher ? 'teacher' : 'student',
    })
  }, [sendCommand, isTeacher])

  // Send interactive block response (student answers)
  const sendBlockResponse = useCallback((
    blockId: string,
    blockType: string,
    response: unknown,
    isCorrect?: boolean,
    score?: number
  ) => {
    sendCommand('block-response', {
      type: 'BLOCK_RESPONSE',
      blockId,
      blockType,
      response,
      isCorrect,
      score,
      participantId: isTeacher ? 'teacher' : 'student',
      participantName,
      isTeacher,
    })
  }, [sendCommand, isTeacher, participantName])

  // Clear a block response
  const clearBlockResponse = useCallback((blockId: string) => {
    sendCommand('block-response', {
      type: 'BLOCK_RESPONSE_CLEAR',
      blockId,
      participantId: isTeacher ? 'teacher' : 'student',
    })
  }, [sendCommand, isTeacher])

  // Sync block navigation state (for multi-step blocks)
  const syncBlockNavigation = useCallback((
    blockId: string,
    currentStep: number,
    totalSteps: number,
    hasStarted: boolean,
    isCompleted: boolean,
    currentAnswers?: Record<string, string>
  ) => {
    sendCommand('block-navigation', {
      type: 'BLOCK_NAVIGATION',
      blockId,
      currentStep,
      totalSteps,
      hasStarted,
      isCompleted,
      currentAnswers,
      participantName,
    })
  }, [sendCommand, participantName])

  return (
    <CollaborationContext.Provider
      value={{
        remoteCursor,
        updateCursorPosition,
        remoteSelection,
        localSelection,
        updateTextSelection,
        remoteAudioState,
        syncAudioPlay,
        syncAudioPause,
        syncAudioSeek,
        remoteBlockResponses,
        sendBlockResponse,
        clearBlockResponse,
        remoteBlockNavigation,
        syncBlockNavigation,
        isRemoteScreenSharing,
        remoteScreenTrack,
        isTeacher,
        participantName,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  )
}
