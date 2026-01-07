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

interface CollaborationContextType {
  // Cursor
  remoteCursor: CursorPosition | null
  updateCursorPosition: (x: number, y: number, containerRect: DOMRect) => void

  // Text Selection
  remoteSelection: TextSelection | null
  updateTextSelection: (selection: TextSelection | null) => void

  // Audio Sync
  remoteAudioState: AudioSyncState | null
  syncAudioPlay: (blockId: string, currentTime: number) => void
  syncAudioPause: (blockId: string, currentTime: number) => void
  syncAudioSeek: (blockId: string, currentTime: number) => void

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

  // Audio sync state
  const [remoteAudioState, setRemoteAudioState] = useState<AudioSyncState | null>(null)

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
      setRemoteSelection({
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
      setRemoteSelection(null)

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

  return (
    <CollaborationContext.Provider
      value={{
        remoteCursor,
        updateCursorPosition,
        remoteSelection,
        updateTextSelection,
        remoteAudioState,
        syncAudioPlay,
        syncAudioPause,
        syncAudioSeek,
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
