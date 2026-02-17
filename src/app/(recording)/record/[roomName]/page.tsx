'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
    Room,
    RoomEvent,
    Track,
    RemoteParticipant,
} from 'livekit-client'
import { RecordingLayout } from '@/components/classroom/recording-layout'

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
    const [remoteTracks, setRemoteTracks] = useState<VideoTrack[]>([])
    const [activeContent, setActiveContent] = useState<{
        type: 'lesson' | 'whiteboard' | 'screenshare'
        contentId?: string
        contentType?: string
    } | null>(null)
    const [remoteScreenShareTrack, setRemoteScreenShareTrack] = useState<Track | undefined>()
    const [remoteScreenShareAudioTrack, setRemoteScreenShareAudioTrack] = useState<Track | undefined>()

    const roomRef = useRef<Room | null>(null)

    const [serverUrl, setServerUrl] = useState<string>('')
    const [token, setToken] = useState<string>('')
    const [layout, setLayout] = useState<string>('default')

    // CRITICAL: Signal START_RECORDING as early as possible.
    // The egress headless browser monitors console output for this exact string.
    // We emit it immediately on mount, before any room connection attempt.
    // This must happen before any async operation that could fail.
    useEffect(() => {
        console.log('START_RECORDING')
    }, [])

    // Parse URL route params
    useEffect(() => {
        params.then(p => setRoomName(p.roomName))
    }, [params])

    // Read query params provided by LiveKit egress
    useEffect(() => {
        if (typeof window === 'undefined') return

        const searchParams = new URLSearchParams(window.location.search)
        const urlParam = searchParams.get('url') || ''
        const tokenParam = searchParams.get('token') || ''
        const layoutParam = searchParams.get('layout') || 'default'

        if (urlParam && tokenParam) {
            setServerUrl(urlParam)
            setToken(tokenParam)
            setLayout(layoutParam)
        }
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
                const room = new Room({
                    adaptiveStream: true,
                    dynacast: true,
                })

                roomRef.current = room

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

                // Signal END_RECORDING when room disconnects
                room.on(RoomEvent.Disconnected, () => {
                    console.log('END_RECORDING')
                })

                await room.connect(serverUrl, token)

                // Sync existing participants
                room.remoteParticipants.forEach(updateRemoteParticipant)

            } catch (e) {
                console.error('[Recording] Connect Exception:', e)
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

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#111827', overflow: 'hidden' }}>
            <RecordingLayout
                roomName={roomName}
                remoteTracks={remoteTracks}
                activeContent={activeContent}
                remoteScreenShareTrack={remoteScreenShareTrack}
                remoteScreenShareAudioTrack={remoteScreenShareAudioTrack}
                layout={layout}
            />
        </div>
    )
}
