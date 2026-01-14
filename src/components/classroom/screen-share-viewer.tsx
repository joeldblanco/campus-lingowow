'use client'

import { useEffect, useRef, useState } from 'react'
import { useLiveKit } from './livekit-context'
import { Monitor, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Track } from 'livekit-client'

export function ScreenShareViewer() {
  const {
    isScreenSharing,
    toggleScreenShare,
    localScreenShareTrack,
    remoteScreenShareTrack,
    remoteScreenShareAudioTrack
  } = useLiveKit()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Determine which track to show - prioritize remote screen share, fallback to local for preview
  // Now both teachers and students can see their local preview when sharing
  const screenTrack = remoteScreenShareTrack || localScreenShareTrack
  // Only play audio from REMOTE screen share to avoid audio loop
  // The person sharing can hear their own audio directly from the source
  const screenAudioTrack = remoteScreenShareAudioTrack
  const hasScreenShare = !!screenTrack

  // Check if someone else is already sharing (used to disable the button)
  const someoneElseIsSharing = !!remoteScreenShareTrack && !isScreenSharing

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

  // Attach screen share audio track to audio element
  useEffect(() => {
    if (!audioRef.current || !screenAudioTrack) return

    const audio = audioRef.current
    const track = screenAudioTrack as Track & { attach: (el: HTMLAudioElement) => void; detach: (el: HTMLAudioElement) => void }

    if (track.attach) {
      track.attach(audio)
    }

    return () => {
      if (track.detach) {
        track.detach(audio)
      }
    }
  }, [screenAudioTrack])

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
            <span>
              {isScreenSharing
                ? 'Compartiendo tu pantalla'
                : 'Pantalla compartida'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isScreenSharing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={toggleScreenShare}
                className="gap-1"
              >
                <Monitor className="w-3 h-3" />
                Dejar de compartir
              </Button>
            )}
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
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain"
          />
          <audio ref={audioRef} autoPlay />
        </div>
      </div>
    )
  }

  // No screen share - show controls for any participant
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center text-gray-500 space-y-4">
        <Monitor className={cn(
          "w-16 h-16 mx-auto",
          isScreenSharing ? "text-green-500" : "opacity-50"
        )} />
        <div>
          <p className="text-lg font-medium">
            {someoneElseIsSharing
              ? 'Otro participante está compartiendo'
              : 'Compartir Pantalla'}
          </p>
          <p className="text-sm">
            {someoneElseIsSharing
              ? 'Solo una persona puede compartir a la vez'
              : 'Comparte tu pantalla con los demás participantes'}
          </p>
        </div>
        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? "destructive" : "default"}
          className="gap-2"
          disabled={someoneElseIsSharing}
        >
          <Monitor className="w-4 h-4" />
          {isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
        </Button>
      </div>
    </div>
  )
}
