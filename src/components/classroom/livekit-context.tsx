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

interface DeviceError {
  type: 'camera' | 'microphone' | 'both'
  message: string
  canRetry: boolean
}

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
  localScreenShareAudioTrack: Track | undefined
  remoteScreenShareAudioTrack: Track | undefined
  deviceError: DeviceError | null
  clearDeviceError: () => void
  retryDeviceAccess: () => Promise<void>
  cameraUnavailable: boolean
  microphoneUnavailable: boolean
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
  const isScreenSharingRef = useRef(false)
  const wasScreenSharingBeforeReconnectRef = useRef(false)

  const [localVideoTrack, setLocalVideoTrack] = useState<Track | undefined>(undefined)
  const [localAudioTrack, setLocalAudioTrack] = useState<Track | undefined>(undefined)
  const [localScreenShareTrack, setLocalScreenShareTrack] = useState<Track | undefined>(undefined)
  const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<Track | undefined>(undefined)
  const [localScreenShareAudioTrack, setLocalScreenShareAudioTrack] = useState<Track | undefined>(undefined)
  const [remoteScreenShareAudioTrack, setRemoteScreenShareAudioTrack] = useState<Track | undefined>(undefined)
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, VideoTrack>>(new Map())

  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  // Keep ref in sync with state for use in event handlers
  isScreenSharingRef.current = isScreenSharing
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set())

  const [deviceError, setDeviceError] = useState<DeviceError | null>(null)
  const [cameraUnavailable, setCameraUnavailable] = useState(false)
  const [microphoneUnavailable, setMicrophoneUnavailable] = useState(false)
  const [isLocalTeacher, setIsLocalTeacher] = useState(false)

  const updateRemoteParticipant = useCallback((participant: RemoteParticipant) => {
    setRemoteParticipants((prev) => {
      const newMap = new Map(prev)

      let videoTrack: Track | undefined
      let audioTrack: Track | undefined
      let screenShareTrack: Track | undefined
      let screenShareAudioTrack: Track | undefined
      let isMuted = true
      let isVideoMuted = true

      // Leer metadata del participante para determinar si es profesor
      let isTeacherRole = false
      try {
        if (participant.metadata) {
          const meta = JSON.parse(participant.metadata)
          isTeacherRole = meta.isModerator === true
        }
      } catch {
        // Ignorar errores de parseo
      }

      participant.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            videoTrack = pub.track
            isVideoMuted = pub.isMuted
          } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone) {
            audioTrack = pub.track
            isMuted = pub.isMuted
          } else if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
            screenShareTrack = pub.track
          } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.ScreenShareAudio) {
            screenShareAudioTrack = pub.track
          }
        }
      })

      // Update remote screen share tracks - only set if found, only clear if THIS participant was sharing
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

      // Update remote screen share audio track
      if (screenShareAudioTrack) {
        setRemoteScreenShareAudioTrack(screenShareAudioTrack)
      } else {
        setRemoteScreenShareAudioTrack((current) => current)
      }

      newMap.set(participant.identity, {
        participantId: participant.identity,
        name: participant.name || participant.identity,
        isLocal: false,
        isMuted,
        isVideoMuted,
        isSpeaking: participant.isSpeaking,
        isTeacher: isTeacherRole,
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

    // Also clear screen share audio if this participant was sharing
    setRemoteScreenShareAudioTrack((current) => {
      let wasSharing = false
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.source === Track.Source.ScreenShareAudio && pub.track === current) {
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

  // Helper para obtener mensajes de error amigables (definido antes de joinRoom para evitar problemas de hoisting)
  const getDeviceErrorMessage = (error: unknown, device: 'camera' | 'microphone'): string => {
    const deviceName = device === 'camera' ? 'cámara' : 'micrófono'
    const err = error as Error

    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      return `Permiso denegado para ${deviceName}. Verifica los permisos del navegador.`
    }
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      return `No se encontró ${deviceName}. Verifica que esté conectado.`
    }
    if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      return `${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)} en uso por otra aplicación. Cierra otras apps que la usen.`
    }
    if (err?.name === 'OverconstrainedError') {
      return `${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)} no soporta la configuración solicitada.`
    }
    return `Error al acceder a ${deviceName}. Intenta de nuevo.`
  }

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

      // Handle reconnection events to prevent InvalidAccessError from stale RTCRtpSender references
      room.on(RoomEvent.Reconnecting, () => {
        console.log('[LiveKit] Reconnecting - clearing screen share state to prevent stale sender errors')
        // Save user's screen sharing intent before clearing state
        wasScreenSharingBeforeReconnectRef.current = isScreenSharingRef.current
        // Clear screen share state immediately when reconnection starts
        // This prevents LiveKit from trying to remove tracks with stale RTCRtpSender references
        if (isScreenSharingRef.current) {
          setIsScreenSharing(false)
        }
        setLocalScreenShareTrack(undefined)
        setLocalScreenShareAudioTrack(undefined)
      })

      room.on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit] Reconnected - re-syncing participant state')
        // Re-sync all remote participants after reconnection
        room.remoteParticipants.forEach((participant) => {
          updateRemoteParticipant(participant)
        })
        // Re-sync local tracks
        const localParticipant = room.localParticipant
        localParticipant.trackPublications.forEach((pub) => {
          if (pub.track) {
            if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
              setLocalVideoTrack(pub.track)
            } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone) {
              setLocalAudioTrack(pub.track)
            } else if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
              // Only restore screen share state if user was actually sharing before reconnection
              if (wasScreenSharingBeforeReconnectRef.current) {
                setLocalScreenShareTrack(pub.track)
                setIsScreenSharing(true)
              }
            } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.ScreenShareAudio) {
              if (wasScreenSharingBeforeReconnectRef.current) {
                setLocalScreenShareAudioTrack(pub.track)
              }
            }
          }
        })
        // Reset the flag after reconnection is complete
        wasScreenSharingBeforeReconnectRef.current = false
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
        console.log('[LiveKit] Track subscribed:', track.kind, 'source:', publication.source, 'from:', participant.identity)
        updateRemoteParticipant(participant)
      })

      // Manejar cuando un participante remoto publica un nuevo track
      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log('[LiveKit] Track published:', publication.kind, 'source:', publication.source, 'from:', participant.identity)
        // Forzar actualización del participante cuando publica un track
        if (participant instanceof RemoteParticipant) {
          updateRemoteParticipant(participant)
        }
      })

      // Manejar cambios en el estado de suscripción (importante para reconexiones)
      room.on(RoomEvent.TrackSubscriptionStatusChanged, (publication, status, participant) => {
        console.log('[LiveKit] Track subscription status changed:', publication.kind, 'status:', status, 'from:', participant?.identity)
        if (participant instanceof RemoteParticipant) {
          updateRemoteParticipant(participant)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track unsubscribed:', track.kind, participant.identity)
        // Clear remote screen share if this was the screen share track being unsubscribed
        if (publication.source === Track.Source.ScreenShare) {
          setRemoteScreenShareTrack((current) => current === track ? undefined : current)
        }
        // Clear remote screen share audio if this was the audio track being unsubscribed
        if (publication.source === Track.Source.ScreenShareAudio) {
          setRemoteScreenShareAudioTrack((current) => current === track ? undefined : current)
        }
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
          } else if (track.kind === Track.Kind.Video && publication.source === Track.Source.ScreenShare) {
            setLocalScreenShareTrack(track)
          } else if (track.kind === Track.Kind.Audio && publication.source === Track.Source.ScreenShareAudio) {
            setLocalScreenShareAudioTrack(track)
          } else if (track.kind === Track.Kind.Audio && publication.source === Track.Source.Microphone) {
            setLocalAudioTrack(track)
          }
        }
      })

      room.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
        console.log('[LiveKit] Local track unpublished:', publication.source)
        if (publication.source === Track.Source.Camera) {
          setLocalVideoTrack(undefined)
        } else if (publication.source === Track.Source.Microphone) {
          setLocalAudioTrack(undefined)
        } else if (publication.source === Track.Source.ScreenShare) {
          setLocalScreenShareTrack(undefined)
          setIsScreenSharing(false)
        } else if (publication.source === Track.Source.ScreenShareAudio) {
          setLocalScreenShareAudioTrack(undefined)
        }
      })

      await room.connect(serverUrl, token)

      // Habilitar cámara y micrófono por separado con fallback graceful (estilo Google Meet)
      let cameraError: string | null = null
      let micError: string | null = null

      // Intentar habilitar micrófono primero (más importante para comunicación)
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setIsAudioMuted(false)
        setMicrophoneUnavailable(false)
      } catch (micException) {
        console.warn('[LiveKit] No se pudo habilitar el micrófono:', micException)
        micError = getDeviceErrorMessage(micException, 'microphone')
        setIsAudioMuted(true)
        setMicrophoneUnavailable(true)
      }

      // Intentar habilitar cámara
      try {
        await room.localParticipant.setCameraEnabled(true)
        setIsVideoMuted(false)
        setCameraUnavailable(false)
      } catch (camException) {
        console.warn('[LiveKit] No se pudo habilitar la cámara:', camException)
        cameraError = getDeviceErrorMessage(camException, 'camera')
        setIsVideoMuted(true)
        setCameraUnavailable(true)
      }

      // Notificar al usuario sobre problemas de dispositivos (pero permitir continuar)
      if (cameraError || micError) {
        const errorType: DeviceError['type'] =
          cameraError && micError ? 'both' :
            cameraError ? 'camera' : 'microphone'

        const messages: string[] = []
        if (micError) messages.push(micError)
        if (cameraError) messages.push(cameraError)

        setDeviceError({
          type: errorType,
          message: messages.join(' '),
          canRetry: true
        })
      }

      // Forzar actualización de participantes remotos existentes con delay para asegurar tracks
      const syncRemoteParticipants = () => {
        room.remoteParticipants.forEach((participant) => {
          console.log('[LiveKit] Sincronizando participante remoto:', participant.identity,
            'tracks:', participant.trackPublications.size)
          updateRemoteParticipant(participant)
        })
      }

      // Sincronizar inmediatamente
      syncRemoteParticipants()

      // Sincronizar de nuevo después de un pequeño delay para capturar tracks tardíos
      setTimeout(syncRemoteParticipants, 500)
      setTimeout(syncRemoteParticipants, 1500)
      setTimeout(syncRemoteParticipants, 3000) // Additional sync at 3s for slow connections

      // Periodic verification of tracks - runs every 5 seconds to catch any missed subscriptions
      const trackVerificationInterval = setInterval(() => {
        if (room.state !== ConnectionState.Connected) {
          return
        }

        room.remoteParticipants.forEach((participant) => {
          let hasVideoTrack = false
          let hasAudioTrack = false
          let hasUnsubscribedTracks = false

          participant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Camera && pub.kind === Track.Kind.Video) {
              if (pub.isSubscribed && pub.track) {
                hasVideoTrack = true
              } else if (!pub.isSubscribed) {
                hasUnsubscribedTracks = true
              }
            }
            if (pub.source === Track.Source.Microphone && pub.kind === Track.Kind.Audio) {
              if (pub.isSubscribed && pub.track) {
                hasAudioTrack = true
              } else if (!pub.isSubscribed) {
                hasUnsubscribedTracks = true
              }
            }
          })

          // If participant has publications but missing subscribed tracks, force update
          if (hasUnsubscribedTracks || (participant.trackPublications.size > 0 && !hasVideoTrack && !hasAudioTrack)) {
            console.log('[LiveKit] Detected missing tracks for participant:', participant.identity,
              '- forcing re-sync')
            updateRemoteParticipant(participant)
          }
        })
      }, 5000)

      // Store interval reference for cleanup
      const cleanupTrackVerification = () => {
        clearInterval(trackVerificationInterval)
      }

      // Clean up on disconnect
      room.once(RoomEvent.Disconnected, cleanupTrackVerification)

      const localParticipant = room.localParticipant

      // Leer metadata del participante local para determinar si es profesor
      try {
        if (localParticipant.metadata) {
          const meta = JSON.parse(localParticipant.metadata)
          setIsLocalTeacher(meta.isModerator === true)
        }
      } catch {
        // Ignorar errores de parseo
      }

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

  const clearDeviceError = useCallback(() => {
    setDeviceError(null)
  }, [])

  const retryDeviceAccess = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant

    setDeviceError(null)
    let newCameraError: string | null = null
    let newMicError: string | null = null

    // Reintentar micrófono si estaba no disponible
    if (microphoneUnavailable) {
      try {
        await localParticipant.setMicrophoneEnabled(true)
        setIsAudioMuted(false)
        setMicrophoneUnavailable(false)
      } catch (e) {
        newMicError = getDeviceErrorMessage(e, 'microphone')
      }
    }

    // Reintentar cámara si estaba no disponible
    if (cameraUnavailable) {
      try {
        await localParticipant.setCameraEnabled(true)
        setIsVideoMuted(false)
        setCameraUnavailable(false)
      } catch (e) {
        newCameraError = getDeviceErrorMessage(e, 'camera')
      }
    }

    if (newCameraError || newMicError) {
      const errorType: DeviceError['type'] =
        newCameraError && newMicError ? 'both' :
          newCameraError ? 'camera' : 'microphone'

      const messages: string[] = []
      if (newMicError) messages.push(newMicError)
      if (newCameraError) messages.push(newCameraError)

      setDeviceError({
        type: errorType,
        message: messages.join(' '),
        canRetry: true
      })
    }
  }, [cameraUnavailable, microphoneUnavailable])

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
    setLocalScreenShareAudioTrack(undefined)
    setRemoteScreenShareAudioTrack(undefined)
    setRemoteParticipants(new Map())
    setConnectionStatus('disconnected')
  }, [])

  const toggleAudio = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant

    if (isAudioMuted) {
      try {
        await localParticipant.setMicrophoneEnabled(true)
        setIsAudioMuted(false)
        setMicrophoneUnavailable(false)
        // Limpiar error si se resolvió
        setDeviceError((prev) => {
          if (!prev) return null
          if (prev.type === 'microphone') return null
          if (prev.type === 'both' && !cameraUnavailable) return null
          if (prev.type === 'both') return { ...prev, type: 'camera' }
          return prev
        })
      } catch (e) {
        console.warn('[LiveKit] Error al habilitar micrófono:', e)
        setMicrophoneUnavailable(true)
        setDeviceError({
          type: cameraUnavailable ? 'both' : 'microphone',
          message: getDeviceErrorMessage(e, 'microphone'),
          canRetry: true
        })
      }
    } else {
      await localParticipant.setMicrophoneEnabled(false)
      setIsAudioMuted(true)
    }
  }, [isAudioMuted, cameraUnavailable])

  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant

    const newMutedState = !isVideoMuted

    if (!newMutedState) {
      // Intentando habilitar cámara
      try {
        await localParticipant.setCameraEnabled(true)
        setIsVideoMuted(false)
        setCameraUnavailable(false)
        // Limpiar error si se resolvió
        setDeviceError((prev) => {
          if (!prev) return null
          if (prev.type === 'camera') return null
          if (prev.type === 'both' && !microphoneUnavailable) return null
          if (prev.type === 'both') return { ...prev, type: 'microphone' }
          return prev
        })
        // Camera enabled - wait a bit for track to be ready
        setTimeout(() => {
          localParticipant.trackPublications.forEach((pub) => {
            if (pub.track && pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
              setLocalVideoTrack(pub.track)
            }
          })
        }, 100)
      } catch (e) {
        console.warn('[LiveKit] Error al habilitar cámara:', e)
        setCameraUnavailable(true)
        setDeviceError({
          type: microphoneUnavailable ? 'both' : 'camera',
          message: getDeviceErrorMessage(e, 'camera'),
          canRetry: true
        })
      }
    } else {
      await localParticipant.setCameraEnabled(false)
      setIsVideoMuted(true)
      setLocalVideoTrack(undefined)
    }
  }, [isVideoMuted, microphoneUnavailable])

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return
    const localParticipant = roomRef.current.localParticipant

    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false)
      setIsScreenSharing(false)
    } else {
      try {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
          systemAudio: 'include',
        })
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
        isTeacher: isLocalTeacher,
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
        localScreenShareAudioTrack,
        remoteScreenShareAudioTrack,
        deviceError,
        clearDeviceError,
        retryDeviceAccess,
        cameraUnavailable,
        microphoneUnavailable,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  )
}
