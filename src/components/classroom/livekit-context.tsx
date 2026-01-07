'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalTrackPublication,
  ConnectionState,
} from 'livekit-client'
import { VideoTrack } from './video-grid'

interface LiveKitContextType {
  isInitialized: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed'
  localTracks: VideoTrack | undefined
  remoteTracks: VideoTrack[]
  joinRoom: (roomName: string, token: string | null) => Promise<void>
  leaveRoom: () => Promise<void>
  toggleAudio: () => Promise<void>
  toggleVideo: () => Promise<void>
  isAudioMuted: boolean
  isVideoMuted: boolean
  sendCommand: (name: string, values: Record<string, unknown>) => void
  toggleScreenShare: () => Promise<void>
  toggleRaiseHand: () => Promise<void>
  isScreenSharing: boolean
  isHandRaised: boolean
  addCommandListener: (command: string, handler: (values: Record<string, unknown>) => void) => void
  removeCommandListener: (command: string, handler: (values: Record<string, unknown>) => void) => void
  localScreenShareTrack: Track | undefined
  remoteScreenShareTrack: Track | undefined
}

const LiveKitContext = createContext<LiveKitContextType | null>(null)

export function useLiveKit() {
  const context = useContext(LiveKitContext)
  if (!context) throw new Error('useLiveKit must be used within a LiveKitProvider')
  return context
}

export function LiveKitProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'failed'
  >('disconnected')
  const connectionStatusRef = useRef(connectionStatus)
  connectionStatusRef.current = connectionStatus

  const roomRef = useRef<Room | null>(null)
  const commandListenersRef = useRef<Map<string, Set<(values: Record<string, unknown>) => void>>>(new Map())
  const isConnectingRef = useRef(false)

  const [localVideoTrack, setLocalVideoTrack] = useState<Track | undefined>(undefined)
  const [localAudioTrack, setLocalAudioTrack] = useState<Track | undefined>(undefined)
  const [localScreenShareTrack, setLocalScreenShareTrack] = useState<Track | undefined>(undefined)
  const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<Track | undefined>(undefined)
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, VideoTrack>>(new Map())

  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set())

  const updateRemoteParticipant = useCallback((participant: RemoteParticipant) => {
    setRemoteParticipants((prev) => {
      const newMap = new Map(prev)
      
      let videoTrack: Track | undefined
      let audioTrack: Track | undefined
      let screenShareTrack: Track | undefined
      let isMuted = true
      let isVideoMuted = true

      participant.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            videoTrack = pub.track
            isVideoMuted = pub.isMuted
          } else if (pub.track.kind === Track.Kind.Audio) {
            audioTrack = pub.track
            isMuted = pub.isMuted
          } else if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
            screenShareTrack = pub.track
          }
        }
      })

      // Update remote screen share track - only set if found, only clear if THIS participant was sharing
      if (screenShareTrack) {
        setRemoteScreenShareTrack(screenShareTrack)
      } else {
        // Only clear if the current screen share belongs to this participant
        setRemoteScreenShareTrack((current) => {
          // We need to check if current track belongs to this participant
          // If no screen share from this participant, keep the existing one (from another participant)
          return current
        })
      }

      newMap.set(participant.identity, {
        participantId: participant.identity,
        name: participant.name || participant.identity,
        isLocal: false,
        isMuted,
        isVideoMuted,
        isSpeaking: participant.isSpeaking,
        videoTrack,
        audioTrack,
      })

      return newMap
    })
  }, [])

  const removeRemoteParticipant = useCallback((participant: RemoteParticipant) => {
    // Only clear remote screen share if THIS participant was the one sharing
    setRemoteScreenShareTrack((current) => {
      // Check if the current screen share track belongs to the disconnecting participant
      // by checking if any of their track publications match the current screen share
      let wasSharing = false
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.source === Track.Source.ScreenShare && pub.track === current) {
          wasSharing = true
        }
      })
      return wasSharing ? undefined : current
    })
    
    setRemoteParticipants((prev) => {
      const newMap = new Map(prev)
      newMap.delete(participant.identity)
      return newMap
    })
  }, [])

  const joinRoom = useCallback(async (roomName: string, token: string | null) => {
    if (!token) {
      console.error('[LiveKit] No token provided')
      setConnectionStatus('failed')
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || roomRef.current) {
      console.log('[LiveKit] Already connecting or connected, skipping')
      return
    }

    try {
      isConnectingRef.current = true
      setConnectionStatus('connecting')

      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!serverUrl) {
        throw new Error('NEXT_PUBLIC_LIVEKIT_URL not configured')
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Increase connection timeout for slower networks
        disconnectOnPageLeave: true,
      })

      roomRef.current = room

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[LiveKit] Connection state:', state)
        if (state === ConnectionState.Connected) {
          setConnectionStatus('connected')
        } else if (state === ConnectionState.Disconnected) {
          if (connectionStatusRef.current !== 'failed') {
            setConnectionStatus('disconnected')
          }
        }
      })

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant connected:', participant.identity)
        updateRemoteParticipant(participant)
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity)
        removeRemoteParticipant(participant)
      })

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track subscribed:', track.kind, participant.identity)
        updateRemoteParticipant(participant)
      })

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track unsubscribed:', track.kind, participant.identity)
        updateRemoteParticipant(participant)
      })

      room.on(RoomEvent.TrackMuted, (publication, participant) => {
        if (participant instanceof RemoteParticipant) {
          updateRemoteParticipant(participant)
        }
      })

      room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        if (participant instanceof RemoteParticipant) {
          updateRemoteParticipant(participant)
        }
      })

      // Speaking detection
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakingIds = new Set(speakers.map(s => s.identity))
        setSpeakingParticipants(speakingIds)
        setIsSpeaking(speakingIds.has(room.localParticipant.identity))
        
        // Update remote participants with speaking status
        room.remoteParticipants.forEach((participant) => {
          updateRemoteParticipant(participant)
        })
      })

      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const decoder = new TextDecoder()
          const data = JSON.parse(decoder.decode(payload))
          const command = data.command
          const values = data.values

          if (command && commandListenersRef.current.has(command)) {
            commandListenersRef.current.get(command)?.forEach((handler) => {
              handler(values)
            })
          }
        } catch (e) {
          console.error('[LiveKit] Error parsing data message', e)
        }
      })

      room.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
        const track = publication.track
        if (track) {
          if (track.kind === Track.Kind.Video && publication.source === Track.Source.Camera) {
            setLocalVideoTrack(track)
          } else if (track.kind === Track.Kind.Audio) {
            setLocalAudioTrack(track)
          } else if (track.kind === Track.Kind.Video && publication.source === Track.Source.ScreenShare) {
            setLocalScreenShareTrack(track)
          }
        }
      })

      room.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
        if (publication.source === Track.Source.Camera) {
          setLocalVideoTrack(undefined)
        } else if (publication.track?.kind === Track.Kind.Audio) {
          setLocalAudioTrack(undefined)
        } else if (publication.source === Track.Source.ScreenShare) {
          setLocalScreenShareTrack(undefined)
        }
      })

      await room.connect(serverUrl, token)

      await room.localParticipant.enableCameraAndMicrophone()

      room.remoteParticipants.forEach((participant) => {
        updateRemoteParticipant(participant)
      })

      const localParticipant = room.localParticipant
      localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            setLocalVideoTrack(pub.track)
          } else if (pub.track.kind === Track.Kind.Audio) {
            setLocalAudioTrack(pub.track)
          }
        }
      })

      setConnectionStatus('connected')
    } catch (e) {
      console.error('[LiveKit] Connect Exception:', e)
      setConnectionStatus('failed')
      isConnectingRef.current = false
      roomRef.current = null
    }
  }, [updateRemoteParticipant, removeRemoteParticipant])

  const leaveRoom = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
    }
    isConnectingRef.current = false
    setLocalVideoTrack(undefined)
    setLocalAudioTrack(undefined)
    setLocalScreenShareTrack(undefined)
    setRemoteScreenShareTrack(undefined)
    setRemoteParticipants(new Map())
    setConnectionStatus('disconnected')
  }, [])

  const toggleAudio = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant
    
    if (isAudioMuted) {
      await localParticipant.setMicrophoneEnabled(true)
    } else {
      await localParticipant.setMicrophoneEnabled(false)
    }
    setIsAudioMuted(!isAudioMuted)
  }, [isAudioMuted])

  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant
    
    const newMutedState = !isVideoMuted
    await localParticipant.setCameraEnabled(!newMutedState)
    setIsVideoMuted(newMutedState)
    
    // Update local video track reference after toggling
    if (!newMutedState) {
      // Camera enabled - wait a bit for track to be ready
      setTimeout(() => {
        localParticipant.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            setLocalVideoTrack(pub.track)
          }
        })
      }, 100)
    } else {
      setLocalVideoTrack(undefined)
    }
  }, [isVideoMuted])

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant

    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false)
      setIsScreenSharing(false)
    } else {
      try {
        await localParticipant.setScreenShareEnabled(true)
        setIsScreenSharing(true)
      } catch (e) {
        console.error('[LiveKit] Error starting screen share', e)
      }
    }
  }, [isScreenSharing])

  const toggleRaiseHand = useCallback(async () => {
    if (!roomRef.current) return
    const newStatus = !isHandRaised
    
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify({
      command: 'raise-hand',
      values: { raised: newStatus }
    }))
    
    await roomRef.current.localParticipant.publishData(data, { reliable: true })
    setIsHandRaised(newStatus)
  }, [isHandRaised])

  const sendCommand = useCallback((name: string, values: Record<string, unknown>) => {
    if (!roomRef.current) return
    
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify({
      command: name,
      values
    }))
    
    roomRef.current.localParticipant.publishData(data, { reliable: true })
  }, [])

  const addCommandListener = useCallback((command: string, handler: (values: Record<string, unknown>) => void) => {
    if (!commandListenersRef.current.has(command)) {
      commandListenersRef.current.set(command, new Set())
    }
    commandListenersRef.current.get(command)?.add(handler)
  }, [])

  const removeCommandListener = useCallback((command: string, handler: (values: Record<string, unknown>) => void) => {
    commandListenersRef.current.get(command)?.delete(handler)
  }, [])

  const localTrackFormatted: VideoTrack | undefined =
    localVideoTrack || localAudioTrack
      ? {
          participantId: 'local',
          name: 'You',
          isLocal: true,
          isMuted: isAudioMuted,
          isVideoMuted: isVideoMuted,
          isHandRaised: isHandRaised,
          isSpeaking: isSpeaking,
          videoTrack: localVideoTrack,
          audioTrack: localAudioTrack,
        }
      : undefined

  // Cleanup on unmount - disconnect from room when navigating away
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        console.log('[LiveKit] Cleaning up - disconnecting from room')
        roomRef.current.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  return (
    <LiveKitContext.Provider
      value={{
        isInitialized,
        connectionStatus,
        localTracks: localTrackFormatted,
        remoteTracks: Array.from(remoteParticipants.values()),
        joinRoom,
        leaveRoom,
        toggleAudio,
        toggleVideo,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        isHandRaised,
        toggleScreenShare,
        toggleRaiseHand,
        sendCommand,
        addCommandListener,
        removeCommandListener,
        localScreenShareTrack,
        remoteScreenShareTrack,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  )
}
