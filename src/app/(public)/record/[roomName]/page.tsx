'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
    Room,
    RoomEvent,
    Track,
    RemoteParticipant,
    ConnectionState,
} from 'livekit-client'
import { RecordingLayout } from '@/components/classroom/recording-layout'
import { Loader2 } from 'lucide-react'

interface VideoTrack {
    participantId: string
    name: string
    isLocal: boolean
    isMuted: boolean
    isVideoMuted: boolean
    isSpeaking: boolean
    isTeacher: boolean
    videoTrack: Track | undefined
    audioTrack: Track | undefined
}

export default function RecordingPage({
    params
}: {
    params: Promise<{ roomName: string }>
}) {
    const [roomName, setRoomName] = useState<string>('')
    const [connectionStatus, setConnectionStatus] = useState<
        'disconnected' | 'connecting' | 'connected' | 'failed'
    >('disconnected')
    const [remoteTracks, setRemoteTracks] = useState<VideoTrack[]>([])
    const [activeContent, setActiveContent] = useState<{
        type: 'lesson' | 'whiteboard' | 'screenshare'
        contentId?: string
        contentType?: string
    } | null>(null)
    const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<Track | undefined>()
    const [remoteScreenShareAudioTrack, setRemoteScreenShareAudioTrack] = useState<Track | undefined>()

    const roomRef = useRef<Room | null>(null)

    // Parse URL params
    useEffect(() => {
        params.then(p => setRoomName(p.roomName))
    }, [params])

    // Token and layout state
    const [token, setToken] = useState<string | null>(null)
    const [layout, setLayout] = useState<string>('default')
    const [tokenError, setTokenError] = useState<string | null>(null)

    // Get layout from URL search params
    useEffect(() => {
        if (typeof window !== 'undefined') {
            console.log('[Recording] Page loaded, URL:', window.location.href)
            const searchParams = new URLSearchParams(window.location.search)
            setLayout(searchParams.get('layout') || 'default')
        }
    }, [])

    // Fetch recording token automatically when roomName is available
    useEffect(() => {
        if (!roomName) return

        const fetchToken = async () => {
            try {
                // Use absolute URL to ensure it works from egress headless browser
                const baseUrl = typeof window !== 'undefined' 
                    ? window.location.origin 
                    : process.env.NEXT_PUBLIC_APP_URL || 'https://www.lingowow.com'
                
                console.log('[Recording] Fetching token for room:', roomName, 'from:', baseUrl)
                
                const url = `${baseUrl}/api/livekit/recording-token?roomName=${encodeURIComponent(roomName)}`
                
                const response = await fetch(url)
                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Failed to fetch token: ${response.status} - ${errorText}`)
                }
                const data = await response.json()
                if (data.token) {
                    console.log('[Recording] Token received successfully')
                    setToken(data.token)
                } else {
                    throw new Error('No token in response')
                }
            } catch (error) {
                console.error('[Recording] Failed to fetch token:', error)
                setTokenError(error instanceof Error ? error.message : 'Failed to fetch token')
            }
        }

        fetchToken()
    }, [roomName])

    const updateRemoteParticipant = useCallback((participant: RemoteParticipant) => {
        setRemoteTracks((prev) => {
            const filtered = prev.filter(t => t.participantId !== participant.identity)

            let videoTrack: Track | undefined
            let audioTrack: Track | undefined
            let screenShareTrack: Track | undefined
            let screenShareAudioTrack: Track | undefined
            let isMuted = true
            let isVideoMuted = true
            let isTeacherRole = false

            try {
                if (participant.metadata) {
                    const meta = JSON.parse(participant.metadata)
                    isTeacherRole = meta.isModerator === true
                }
            } catch {
                // Ignore parse errors
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

            // Update screen share tracks
            if (screenShareTrack) {
                setRemoteScreenShareTrack(screenShareTrack)
                setActiveContent({ type: 'screenshare' })
            }
            if (screenShareAudioTrack) {
                setRemoteScreenShareAudioTrack(screenShareAudioTrack)
            }

            const newTrack: VideoTrack = {
                participantId: participant.identity,
                name: participant.name || participant.identity,
                isLocal: false,
                isMuted,
                isVideoMuted,
                isSpeaking: participant.isSpeaking,
                isTeacher: isTeacherRole,
                videoTrack,
                audioTrack,
            }

            return [...filtered, newTrack]
        })
    }, [])

    const removeRemoteParticipant = useCallback((participant: RemoteParticipant) => {
        // Clear screen share if this participant was sharing
        participant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.ScreenShare) {
                setRemoteScreenShareTrack(undefined)
                setActiveContent((prev) =>
                    prev?.type === 'screenshare' ? { type: 'lesson' } : prev
                )
            }
            if (pub.source === Track.Source.ScreenShareAudio) {
                setRemoteScreenShareAudioTrack(undefined)
            }
        })

        setRemoteTracks((prev) => prev.filter(t => t.participantId !== participant.identity))
    }, [])

    // Connect to room as observer (no publishing)
    useEffect(() => {
        if (!roomName || !token) return

        const connectToRoom = async () => {
            try {
                setConnectionStatus('connecting')

                // Hardcode the LiveKit URL to ensure it works in egress headless browser
                // NEXT_PUBLIC_ env vars may not be available in the egress context
                const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://meet.lingowow.com'
                
                console.log('[Recording] Connecting to LiveKit:', serverUrl)
                console.log('[Recording] Room:', roomName)
                console.log('[Recording] Token length:', token?.length)

                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                })

                roomRef.current = room

                room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                    console.log('[Recording] Connection state changed:', state)
                    if (state === ConnectionState.Connected) {
                        setConnectionStatus('connected')
                        console.log('[Recording] Connected! Calling START_RECORDING...')
                        // Signal to egress that recording can start
                        if (typeof window !== 'undefined' && (window as unknown as { START_RECORDING?: () => void }).START_RECORDING) {
                            console.log('[Recording] START_RECORDING function exists, calling it')
                            ;(window as unknown as { START_RECORDING: () => void }).START_RECORDING()
                        } else {
                            console.log('[Recording] START_RECORDING function NOT found on window')
                        }
                    } else if (state === ConnectionState.Disconnected) {
                        setConnectionStatus('disconnected')
                        console.log('[Recording] Disconnected! Calling END_RECORDING...')
                        // Signal to egress that recording should end
                        if (typeof window !== 'undefined' && (window as unknown as { END_RECORDING?: () => void }).END_RECORDING) {
                            (window as unknown as { END_RECORDING: () => void }).END_RECORDING()
                        }
                    }
                })

                room.on(RoomEvent.ParticipantConnected, updateRemoteParticipant)
                room.on(RoomEvent.ParticipantDisconnected, removeRemoteParticipant)

                room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    updateRemoteParticipant(participant)
                })

                room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                    if (publication.source === Track.Source.ScreenShare) {
                        setRemoteScreenShareTrack((current) => current === track ? undefined : current)
                        setActiveContent((prev) =>
                            prev?.type === 'screenshare' ? { type: 'lesson' } : prev
                        )
                    }
                    if (publication.source === Track.Source.ScreenShareAudio) {
                        setRemoteScreenShareAudioTrack((current) => current === track ? undefined : current)
                    }
                    updateRemoteParticipant(participant)
                })

                room.on(RoomEvent.TrackMuted, (pub, participant) => {
                    if (participant instanceof RemoteParticipant) {
                        updateRemoteParticipant(participant)
                    }
                })

                room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
                    if (participant instanceof RemoteParticipant) {
                        updateRemoteParticipant(participant)
                    }
                })

                room.on(RoomEvent.ActiveSpeakersChanged, () => {
                    room.remoteParticipants.forEach(updateRemoteParticipant)
                })

                // Listen for content sync commands
                room.on(RoomEvent.DataReceived, (payload) => {
                    try {
                        const decoder = new TextDecoder()
                        const data = JSON.parse(decoder.decode(payload))

                        if (data.command === 'set-lesson' && data.values?.type === 'SET_LESSON') {
                            const { lessonId, contentType } = data.values
                            if (lessonId) {
                                setActiveContent({
                                    type: 'lesson',
                                    contentId: lessonId,
                                    contentType,
                                })
                            } else {
                                setActiveContent(null)
                            }
                        }

                        if (data.command === 'whiteboard-sync' && data.values?.type === 'WHITEBOARD_UPDATE') {
                            // When whiteboard is active, set content type
                            setActiveContent((prev) =>
                                prev?.type !== 'screenshare' ? { type: 'whiteboard' } : prev
                            )
                        }
                    } catch {
                        // Ignore parse errors
                    }
                })

                await room.connect(serverUrl, token)

                // Sync existing participants
                room.remoteParticipants.forEach(updateRemoteParticipant)

            } catch (e) {
                console.error('[Recording] Connect Exception:', e)
                setConnectionStatus('failed')
            }
        }

        connectToRoom()

        return () => {
            if (roomRef.current) {
                roomRef.current.disconnect()
                roomRef.current = null
            }
        }
    }, [roomName, token, updateRemoteParticipant, removeRemoteParticipant])

    if ((connectionStatus === 'connecting' || !roomName || !token) && !tokenError) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white">Iniciando grabación...</h2>
                    <p className="text-gray-400">Conectando a la sala: {roomName || '...'}</p>
                </div>
            </div>
        )
    }

    if (connectionStatus === 'failed' || tokenError) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md p-6 bg-gray-800 rounded-xl">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Error de Conexión</h2>
                    <p className="text-gray-300">
                        {tokenError || 'No se pudo conectar a la sala de grabación.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <RecordingLayout
            roomName={roomName}
            remoteTracks={remoteTracks}
            activeContent={activeContent}
            remoteScreenShareTrack={remoteScreenShareTrack}
            remoteScreenShareAudioTrack={remoteScreenShareAudioTrack}
            layout={layout}
        />
    )
}
