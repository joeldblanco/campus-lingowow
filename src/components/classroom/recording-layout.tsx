'use client'

import React, { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface RecordingLayoutProps {
    roomName: string
    remoteTracks: VideoTrack[]
    activeContent: {
        type: 'lesson' | 'whiteboard' | 'screenshare'
        contentId?: string
        contentType?: string
    } | null
    remoteScreenShareTrack: Track | undefined
    remoteScreenShareAudioTrack: Track | undefined
    layout: string
}

// Video tile for recording
function RecordingVideoTile({ track }: { track: VideoTrack }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        const videoElement = videoRef.current
        if (track?.videoTrack && videoElement) {
            const lkTrack = track.videoTrack as unknown as {
                attach: (el: HTMLVideoElement) => void
                detach: (el: HTMLVideoElement) => void
            }
            if (lkTrack.attach) {
                lkTrack.attach(videoElement)
                return () => lkTrack.detach?.(videoElement)
            }
        }
    }, [track?.videoTrack])

    useEffect(() => {
        const audioElement = audioRef.current
        if (track?.audioTrack && audioElement) {
            const lkTrack = track.audioTrack as unknown as {
                attach: (el: HTMLAudioElement) => void
                detach: (el: HTMLAudioElement) => void
            }
            if (lkTrack.attach) {
                lkTrack.attach(audioElement)
                return () => lkTrack.detach?.(audioElement)
            }
        }
    }, [track?.audioTrack])

    return (
        <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
            {/* Audio */}
            <audio ref={audioRef} autoPlay />

            {/* Video or Avatar */}
            {track?.videoTrack && !track.isVideoMuted ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                    <Avatar className="w-16 h-16 border-2 border-white/20">
                        <AvatarFallback className="text-xl font-bold bg-blue-600 text-white">
                            {track.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            )}

            {/* Speaking indicator */}
            <div className={cn(
                "absolute inset-0 pointer-events-none transition-all duration-200",
                track.isSpeaking && "ring-3 ring-blue-500 ring-inset"
            )} />

            {/* Name and mute indicator */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-2 text-white text-sm font-medium">
                {track.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                <span>{track.isTeacher ? '👨‍🏫 ' : ''}{track.name}</span>
            </div>
        </div>
    )
}

// Screen share viewer for recording
function RecordingScreenShare({
    track,
    audioTrack
}: {
    track: Track | undefined
    audioTrack: Track | undefined
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        const videoElement = videoRef.current
        if (track && videoElement) {
            const lkTrack = track as unknown as {
                attach: (el: HTMLVideoElement) => void
                detach: (el: HTMLVideoElement) => void
            }
            if (lkTrack.attach) {
                lkTrack.attach(videoElement)
                return () => lkTrack.detach?.(videoElement)
            }
        }
    }, [track])

    useEffect(() => {
        const audioElement = audioRef.current
        if (audioTrack && audioElement) {
            const lkTrack = audioTrack as unknown as {
                attach: (el: HTMLAudioElement) => void
                detach: (el: HTMLAudioElement) => void
            }
            if (lkTrack.attach) {
                lkTrack.attach(audioElement)
                return () => lkTrack.detach?.(audioElement)
            }
        }
    }, [audioTrack])

    if (!track) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                Esperando pantalla compartida...
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="max-w-full max-h-full object-contain"
            />
            <audio ref={audioRef} autoPlay />
        </div>
    )
}

// Recording timestamp overlay
function RecordingOverlay({ roomName }: { roomName: string }) {
    const [elapsed, setElapsed] = React.useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(e => e + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="absolute top-3 left-3 flex items-center gap-3 z-50">
            {/* Recording indicator */}
            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>REC</span>
            </div>

            {/* Timer */}
            <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-mono">
                {formatTime(elapsed)}
            </div>

            {/* Room name */}
            <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
                {roomName}
            </div>
        </div>
    )
}

export function RecordingLayout({
    roomName,
    remoteTracks,
    activeContent,
    remoteScreenShareTrack,
    remoteScreenShareAudioTrack,
}: RecordingLayoutProps) {
    // Find teacher and student from remote tracks
    const teacher = remoteTracks.find(t => t.isTeacher)
    const student = remoteTracks.find(t => !t.isTeacher)

    return (
        <div className="w-screen h-screen bg-gray-900 flex overflow-hidden relative">
            {/* Recording overlay */}
            <RecordingOverlay roomName={roomName} />

            {/* Main content area - 70% width */}
            <main className="flex-1 flex items-center justify-center bg-gray-850 p-4">
                {activeContent?.type === 'screenshare' && remoteScreenShareTrack ? (
                    <RecordingScreenShare
                        track={remoteScreenShareTrack}
                        audioTrack={remoteScreenShareAudioTrack}
                    />
                ) : activeContent?.type === 'whiteboard' ? (
                    <div className="w-full h-full flex items-center justify-center bg-white rounded-lg">
                        <div className="text-gray-400 text-lg">
                            📝 Pizarra activa (sincronización en tiempo real)
                        </div>
                    </div>
                ) : activeContent?.type === 'lesson' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-gray-400 text-lg">
                            📚 Contenido: {activeContent.contentId || 'Sin contenido'}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-center text-gray-400">
                            <p className="text-xl mb-2">Lingowow</p>
                            <p className="text-sm">Esperando contenido...</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Sidebar with videos - 30% width */}
            <aside className="w-80 bg-gray-900 p-3 flex flex-col gap-3">
                {/* Teacher video */}
                <div className="flex-1">
                    {teacher ? (
                        <RecordingVideoTile track={teacher} />
                    ) : (
                        <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                            Esperando profesor...
                        </div>
                    )}
                </div>

                {/* Student video */}
                <div className="flex-1">
                    {student ? (
                        <RecordingVideoTile track={student} />
                    ) : (
                        <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                            Esperando estudiante...
                        </div>
                    )}
                </div>
            </aside>
        </div>
    )
}
