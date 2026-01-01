'use client'

import { useEffect, useRef, useState } from 'react'
import { useLiveKit } from './livekit-context'
import { Monitor, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Track, RemoteTrackPublication } from 'livekit-client'

interface ScreenShareViewerProps {
  isTeacher: boolean
}

export function ScreenShareViewer({ isTeacher }: ScreenShareViewerProps) {
  const { remoteTracks, isScreenSharing, toggleScreenShare } = useLiveKit()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasRemoteScreenShare, setHasRemoteScreenShare] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [screenTrack, setScreenTrack] = useState<any>(null)

  // Find screen share track from remote participants
  useEffect(() => {
    let foundScreenTrack = null
    
    for (const participant of remoteTracks) {
      // Check if this participant has a screen share track
      // The track would be of source Screen
      const participantData = participant as unknown as { 
        screenTrack?: Track
        trackPublications?: Map<string, RemoteTrackPublication>
      }
      
      if (participantData.screenTrack) {
        foundScreenTrack = participantData.screenTrack
        break
      }
    }

    setScreenTrack(foundScreenTrack)
    setHasRemoteScreenShare(!!foundScreenTrack)
  }, [remoteTracks])

  // Attach screen share track to video element
  useEffect(() => {
    if (!videoRef.current || !screenTrack) return

    const video = videoRef.current
    
    if (screenTrack.attach) {
      screenTrack.attach(video)
    }

    return () => {
      if (screenTrack.detach) {
        screenTrack.detach(video)
      }
    }
  }, [screenTrack])

  const toggleFullscreen = () => {
    if (!videoRef.current) return

    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // If there's a remote screen share, show it
  if (hasRemoteScreenShare && screenTrack) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex-none p-2 bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-sm">
            <Monitor className="w-4 h-4 text-green-400" />
            <span>Pantalla compartida</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    )
  }

  // No remote screen share - show placeholder or controls for teacher
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center text-gray-500 space-y-4">
        <Monitor className={cn(
          "w-16 h-16 mx-auto",
          isScreenSharing ? "text-green-500" : "opacity-50"
        )} />
        <div>
          <p className="text-lg font-medium">
            {isScreenSharing ? 'Compartiendo tu pantalla' : 'Compartir Pantalla'}
          </p>
          <p className="text-sm">
            {isTeacher 
              ? (isScreenSharing 
                ? 'Los estudiantes pueden ver tu pantalla' 
                : 'Comparte tu pantalla con los estudiantes')
              : 'El profesor puede compartir su pantalla aquí'
            }
          </p>
        </div>
        {isTeacher && (
          <Button
            onClick={toggleScreenShare}
            variant={isScreenSharing ? "destructive" : "default"}
            className="gap-2"
          >
            <Monitor className="w-4 h-4" />
            {isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
          </Button>
        )}
      </div>
    </div>
  )
}
