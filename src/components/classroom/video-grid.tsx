'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { MicOff } from 'lucide-react'
import React from 'react'

// Placeholder for a track object from Jitsi
export interface VideoTrack {
  participantId: string
  name: string
  avatar?: string
  isLocal: boolean
  isMuted: boolean
  isVideoMuted: boolean
  isTeacher?: boolean
  videoTrack?: unknown // JitsiLocalTrack | JitsiRemoteTrack
  audioTrack?: unknown
}

interface VideoGridProps {
  localTrack?: VideoTrack
  remoteTracks?: VideoTrack[]
  isTeacher?: boolean
}

// Helper to render a single video tile
function VideoTile({ track, isTeacher }: { track: VideoTrack; isTeacher: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const videoElement = videoRef.current
    if (track?.videoTrack && videoElement) {
      const jitsiTrack = track.videoTrack as { attach: (el: HTMLVideoElement) => void; detach: (el: HTMLVideoElement) => void }
      jitsiTrack.attach(videoElement)
      return () => {
        jitsiTrack.detach(videoElement)
      }
    }
  }, [track?.videoTrack])

  if (!track) return null

  return (
    <Card className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-0 shadow-lg group">
      {/* Video Element */}
      {track?.videoTrack && !track.isVideoMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={track.isLocal} // Always mute local to avoid echo
          className="w-full h-full object-cover"
        />
      ) : (
        /* Avatar Fallback when video is off */
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <Avatar className="w-20 h-20 border-4 border-gray-700">
            <AvatarImage src={track.avatar} />
            <AvatarFallback className="text-2xl font-bold bg-blue-600 text-white">
              {track.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlays / Status Icons */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-white text-sm font-medium">
        {track.isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
        <span>
          {track.isLocal ? 'Tú' : track.name}
          {isTeacher && <span className="text-blue-300 ml-1">(Profesor)</span>}
        </span>
      </div>

      {/* Speaking Indicator Border */}
      <div className="absolute inset-0 border-4 border-blue-500 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
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
    <div className="flex flex-col gap-4 h-full">
      {/* Teacher View (Top usually) */}
      <div className="flex-none">
        <VideoTile track={teacherTrack!} isTeacher={true} />
      </div>

      {/* Student View (Bottom usually) */}
      <div className="flex-none">
        <VideoTile track={studentTrack!} isTeacher={false} />
      </div>

      {/* Removed internal Chat placeholder to avoid duplication with sidebar tabs */}
    </div>
  )
}
