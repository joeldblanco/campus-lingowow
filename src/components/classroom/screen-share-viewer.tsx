'use client'

import { useEffect, useRef, useState } from 'react'
import { useLiveKit } from './livekit-context'
import { Monitor, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Track } from 'livekit-client'

interface ScreenShareViewerProps {
  isTeacher: boolean
}

export function ScreenShareViewer({ isTeacher }: ScreenShareViewerProps) {
  const { isScreenSharing, toggleScreenShare, localScreenShareTrack, remoteScreenShareTrack } = useLiveKit()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Determine which track to show
  const screenTrack = isTeacher ? localScreenShareTrack : remoteScreenShareTrack
  const hasScreenShare = !!screenTrack

  // Attach screen share track to video element
  useEffect(() => {
    if (!videoRef.current || !screenTrack) return

    const video = videoRef.current
    const track = screenTrack as Track & { attach: (el: HTMLVideoElement) => void; detach: (el: HTMLVideoElement) => void }
    
    if (track.attach) {
      track.attach(video)
    }

    return () => {
      if (track.detach) {
        track.detach(video)
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

  // If there's a screen share track, show it
  if (hasScreenShare) {
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
