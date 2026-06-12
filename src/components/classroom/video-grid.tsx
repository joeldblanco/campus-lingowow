'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Hand, MicOff, UserRound } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

// Track interface for LiveKit
export interface VideoTrack {
  participantId: string
  name: string
  avatar?: string
  isLocal: boolean
  isMuted: boolean
  isVideoMuted: boolean
  isTeacher?: boolean
  isHandRaised?: boolean
  isSpeaking?: boolean
  videoTrack?: unknown // LiveKit Track
  audioTrack?: unknown
}

interface VideoGridProps {
  localTrack?: VideoTrack
  remoteTracks?: VideoTrack[]
  isTeacher?: boolean
  compact?: boolean
}

// Helper to render a single video tile
function VideoTile({ track }: { track: VideoTrack; isTeacher: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  React.useEffect(() => {
    const videoElement = videoRef.current
    if (track?.videoTrack && videoElement) {
      const liveKitTrack = track.videoTrack as { attach: (el: HTMLVideoElement) => HTMLVideoElement; detach: (el: HTMLVideoElement) => HTMLVideoElement }
      if (typeof liveKitTrack.attach === 'function') {
        liveKitTrack.attach(videoElement)
        return () => {
          if (typeof liveKitTrack.detach === 'function') {
            liveKitTrack.detach(videoElement)
          }
        }
      }
    }
  }, [track?.videoTrack])

  React.useEffect(() => {
    const audioElement = audioRef.current
    if (track?.audioTrack && audioElement && !track.isLocal) {
      const liveKitTrack = track.audioTrack as { attach: (el: HTMLAudioElement) => HTMLAudioElement; detach: (el: HTMLAudioElement) => HTMLAudioElement }
      if (typeof liveKitTrack.attach === 'function') {
        liveKitTrack.attach(audioElement)
        return () => {
          if (typeof liveKitTrack.detach === 'function') {
            liveKitTrack.detach(audioElement)
          }
        }
      }
    }
  }, [track?.audioTrack, track?.isLocal])

  if (!track) return null

  return (
    <Card className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border-0 shadow-sm">
      {/* Audio Element for remote participants */}
      {!track.isLocal && !!track.audioTrack && (
        <audio ref={audioRef} autoPlay />
      )}
      {/* Video Element */}
      {track?.videoTrack && !track.isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={track.isLocal}
          className={`w-full h-full object-cover ${track.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarImage src={track.avatar} />
            <AvatarFallback className="text-sm font-bold bg-blue-600 text-white">
              {track.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Speaking Badge - Top Right */}
      {track.isSpeaking && (
        <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
          HABLANDO
        </div>
      )}

      {/* Hand Raised Indicator */}
      {track.isHandRaised && (
        <div className="absolute top-1 right-1 bg-yellow-500 text-white p-1 rounded-full shadow-lg animate-bounce">
          <Hand className="w-3 h-3" />
        </div>
      )}

      {/* Name Badge - Bottom Left */}
      <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1 text-white text-[10px] font-medium">
        {track.isMuted && <MicOff className="w-2.5 h-2.5 text-red-400" />}
        <span>{track.isLocal ? 'Tú' : track.name}</span>
      </div>

      {/* Speaking Border */}
      <div 
        className={cn(
          "absolute inset-0 rounded-xl pointer-events-none transition-all duration-200",
          track.isSpeaking 
            ? "ring-2 ring-blue-500 ring-offset-1" 
            : ""
        )} 
      />
    </Card>
  )
}

// Empty-state tile shown while the other participant (or the local camera)
// has not joined yet — visually distinct from a connected participant tile
// so an empty room never looks occupied.
function WaitingTile({ label }: { label: string }) {
  return (
    <Card className="relative w-full h-full rounded-lg overflow-hidden border border-dashed border-white/15 bg-gray-900/50 shadow-none">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <UserRound className="w-8 h-8 text-white/25 motion-safe:animate-pulse" />
        <span className="text-xs font-medium text-white/50">{label}</span>
      </div>
    </Card>
  )
}

export function VideoGrid({ localTrack, remoteTracks = [], isTeacher, compact = false }: VideoGridProps) {
  // Buscar el profesor por su flag isTeacher en lugar de asumir remoteTracks[0]
  const remoteTeacher = remoteTracks.find(t => t.isTeacher)
  const remoteStudent = remoteTracks.find(t => !t.isTeacher)

  // Determine teacher and student tracks. No mocks: an absent participant
  // renders a waiting state instead of a fake tile.
  const teacherTrack = isTeacher ? localTrack : remoteTeacher ?? remoteTracks[0]
  const studentTrack = isTeacher ? remoteStudent ?? remoteTracks[0] : localTrack

  const teacherSlot = teacherTrack ? (
    <VideoTile track={teacherTrack} isTeacher={true} />
  ) : (
    <WaitingTile label={isTeacher ? 'Conectando tu cámara...' : 'Esperando al profesor...'} />
  )

  const studentSlot = studentTrack ? (
    <VideoTile track={studentTrack} isTeacher={false} />
  ) : (
    <WaitingTile label={isTeacher ? 'Esperando al estudiante...' : 'Conectando tu cámara...'} />
  )

  if (compact) {
    return (
      <div className="flex flex-col gap-1 w-full h-full">
        {/* Teacher video - top */}
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden">{teacherSlot}</div>
        {/* Student video - bottom */}
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden">{studentSlot}</div>
      </div>
    )
  }

  return (
    <div className="flex w-full h-full bg-[#202124] gap-2">
      {/* Teacher video - left half */}
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden">{teacherSlot}</div>

      {/* Student video - right half */}
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden">{studentSlot}</div>
    </div>
  )
}
