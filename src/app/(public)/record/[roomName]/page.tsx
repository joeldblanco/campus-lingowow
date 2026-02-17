'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
    Room,
    RoomEvent,
    Track,
    RemoteParticipant,
    ConnectionState,
} from 'livekit-client'
import EgressHelper from '@livekit/egress-sdk'
import { RecordingLayout } from '@/components/classroom/recording-layout'
import { Loader2 } from 'lucide-react'

const FRAME_DECODE_TIMEOUT = 5000

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
    const startRecordingCalledRef = useRef(false)

    // Parse URL route params (roomName from the path)
    useEffect(() => {
        params.then(p => setRoomName(p.roomName))
    }, [params])

    // LiveKit egress provides url, token, and layout as query params
    // The egress headless browser opens: {customBaseUrl}/{roomName}?url=...&token=...&layout=...
    const [serverUrl, setServerUrl] = useState<string>('')
    const [token, setToken] = useState<string>('')
    const [layout, setLayout] = useState<string>('default')
    const [initError, setInitError] = useState<string | null>(null)

    // Read query params provided by LiveKit egress
    useEffect(() => {
        if (typeof window === 'undefined') return

        console.log('[Recording] Page loaded, URL:', window.location.href)
        const searchParams = new URLSearchParams(window.location.search)

        const urlParam = searchParams.get('url') || ''
        const tokenParam = searchParams.get('token') || ''
        const layoutParam = searchParams.get('layout') || 'default'

        console.log('[Recording] Query params - url:', urlParam ? 'present' : 'MISSING', 'token:', tokenParam ? 'present' : 'MISSING', 'layout:', layoutParam)

        if (!urlParam || !tokenParam) {
            console.error('[Recording] Missing required query params (url, token). This page must be opened by LiveKit egress.')
            setInitError('Missing required query params (url, token)')
            return
        }

        setServerUrl(urlParam)
        setToken(tokenParam)
        setLayout(layoutParam)
    }, [])

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

    // Connect to room using the token and URL provided by LiveKit egress
    useEffect(() => {
        if (!roomName || !token || !serverUrl) return

        const connectToRoom = async () => {
            try {
                setConnectionStatus('connecting')

                console.log('[Recording] Connecting to LiveKit:', serverUrl)
                console.log('[Recording] Room:', roomName)

                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                })

                roomRef.current = room

                // Register room with EgressHelper so it can signal START/END_RECORDING
                EgressHelper.setRoom(room)

                room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                    console.log('[Recording] Connection state changed:', state)
                    if (state === ConnectionState.Connected) {
                        setConnectionStatus('connected')
                        console.log('[Recording] Room connected successfully')
                    } else if (state === ConnectionState.Disconnected) {
                        setConnectionStatus('disconnected')
                        console.log('[Recording] Disconnected')
                    }
                })

                room.on(RoomEvent.ParticipantConnected, updateRemoteParticipant)
                room.on(RoomEvent.ParticipantDisconnected, removeRemoteParticipant)

                room.on(RoomEvent.TrackSubscribed, (_track, _publication, participant) => {
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

                room.on(RoomEvent.TrackMuted, (_pub, participant) => {
                    if (participant instanceof RemoteParticipant) {
                        updateRemoteParticipant(participant)
                    }
                })

                room.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
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

                // Signal START_RECORDING to egress using the same algorithm as the official template:
                // - If video tracks exist, wait for frames to be decoded
                // - If only audio tracks, start after a short delay
                // - Timeout after FRAME_DECODE_TIMEOUT ms
                const startTime = Date.now()
                const interval = setInterval(async () => {
                    if (startRecordingCalledRef.current) {
                        clearInterval(interval)
                        return
                    }

                    let shouldStartRecording = false
                    let hasVideoTracks = false
                    let hasSubscribedTracks = false
                    let hasDecodedFrames = false

                    for (const p of Array.from(room.remoteParticipants.values())) {
                        for (const pub of Array.from(p.trackPublications.values())) {
                            if (pub.isSubscribed) {
                                hasSubscribedTracks = true
                            }
                            if (pub.kind === Track.Kind.Video) {
                                hasVideoTracks = true
                                if (pub.videoTrack) {
                                    const stats = await pub.videoTrack.getRTCStatsReport()
                                    if (stats) {
                                        hasDecodedFrames = Array.from(stats).some(
                                            (item) => item[1].type === 'inbound-rtp' && (item[1] as { framesDecoded?: number }).framesDecoded !== undefined && (item[1] as { framesDecoded: number }).framesDecoded > 0,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    const timeDelta = Date.now() - startTime
                    if (hasDecodedFrames) {
                        shouldStartRecording = true
                    } else if (!hasVideoTracks && hasSubscribedTracks && timeDelta > 500) {
                        shouldStartRecording = true
                    } else if (timeDelta > FRAME_DECODE_TIMEOUT && hasSubscribedTracks) {
                        shouldStartRecording = true
                    }

                    if (shouldStartRecording) {
                        console.log('[Recording] Signaling START_RECORDING to egress', {
                            hasVideoTracks,
                            hasSubscribedTracks,
                            hasDecodedFrames,
                            timeDelta,
                        })
                        startRecordingCalledRef.current = true
                        EgressHelper.startRecording()
                        clearInterval(interval)
                    }
                }, 100)

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
    }, [roomName, token, serverUrl, updateRemoteParticipant, removeRemoteParticipant])

    if (initError) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md p-6 bg-gray-800 rounded-xl">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Error de Configuración</h2>
                    <p className="text-gray-300">{initError}</p>
                </div>
            </div>
        )
    }

    if ((connectionStatus === 'connecting' || !roomName || !token) && !initError) {
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

    if (connectionStatus === 'failed') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <div className="text-center max-w-md p-6 bg-gray-800 rounded-xl">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Error de Conexión</h2>
                    <p className="text-gray-300">
                        No se pudo conectar a la sala de grabación.
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
