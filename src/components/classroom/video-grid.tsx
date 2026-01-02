'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Hand, MicOff } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

// Track interface compatible with both Jitsi and LiveKit
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
  videoTrack?: unknown // LiveKit Track or Jitsi Track
  audioTrack?: unknown
}

interface VideoGridProps {
  localTrack?: VideoTrack
  remoteTracks?: VideoTrack[]
  isTeacher?: boolean
}

// Helper to render a single video tile
function VideoTile({ track }: { track: VideoTrack; isTeacher: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

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

  if (!track) return null

  return (
    <Card className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border-0 shadow-md">
      {/* Video Element */}
      {track?.videoTrack && !track.isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={track.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <Avatar className="w-12 h-12 border-2 border-white/20">
            <AvatarImage src={track.avatar} />
            <AvatarFallback className="text-base font-bold bg-blue-600 text-white">
              {track.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Speaking Badge - Top Right */}
      {track.isSpeaking && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
          SPEAKING
        </div>
      )}

      {/* Hand Raised Indicator */}
      {track.isHandRaised && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
          <Hand className="w-4 h-4" />
        </div>
      )}

      {/* Name Badge - Bottom Left */}
      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1.5 text-white text-xs font-medium">
        {track.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
        <span>{track.isLocal ? 'You' : track.name}</span>
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

export function VideoGrid({ localTrack, remoteTracks = [], isTeacher }: VideoGridProps) {
  // Mock data for visualization if no tracks provided
  const mockTeacher: VideoTrack = {
    participantId: 't1',
    name: 'Teacher Sarah',
    isLocal: false,
    isMuted: false,
    isVideoMuted: true,
    isTeacher: true,
  }

  const mockStudent: VideoTrack = {
    participantId: 's1',
    name: 'You',
    isLocal: true,
    isMuted: true,
    isVideoMuted: false,
  }

  // Use props or fallbacks
  // Ensure we always have a defined object to prevent crashes
  const safeTeacherMock = { ...mockTeacher, name: isTeacher ? 'Tú (Profesor)' : 'Profesor' }
  const safeStudentMock = { ...mockStudent, name: isTeacher ? 'Estudiante' : 'Tú' }

  const teacherTrack = isTeacher
    ? localTrack || safeTeacherMock
    : remoteTracks.find((t) => t.isTeacher) || safeTeacherMock

  const studentTrack = isTeacher
    ? remoteTracks[0] || safeStudentMock
    : localTrack || safeStudentMock

  return (
    <div className="flex flex-col gap-2">
      {/* Teacher Video */}
      <VideoTile track={teacherTrack!} isTeacher={true} />
      {/* Student Video */}
      <VideoTile track={studentTrack!} isTeacher={false} />
    </div>
  )
}
