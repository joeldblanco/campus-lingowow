'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCollaboration } from './collaboration-context'
import { cn } from '@/lib/utils'
import { Play, Pause, Mic } from 'lucide-react'

interface SyncedAudioPlayerProps {
  blockId: string
  url: string
  title?: string
  maxReplays?: number
  duration?: number
}

export function SyncedAudioPlayer({
  blockId,
  url,
  title,
  maxReplays = 0,
  duration: initialDuration,
}: SyncedAudioPlayerProps) {
  const { 
    remoteAudioState, 
    syncAudioPlay, 
    syncAudioPause, 
    syncAudioSeek,
    isTeacher 
  } = useCollaboration()

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [replayCount, setReplayCount] = useState(0)
  const [waveform] = useState(() => Array.from({ length: 32 }, () => Math.random() * 0.7 + 0.3))
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastSyncRef = useRef<number>(0)

  const canPlay = maxReplays === 0 || replayCount < maxReplays

  // Handle remote audio sync
  useEffect(() => {
    if (!remoteAudioState || remoteAudioState.blockId !== blockId) return
    if (!audioRef.current) return
    
    // Prevent sync loops - only sync if the event is recent (within 2 seconds)
    const timeSinceSync = Date.now() - remoteAudioState.timestamp
    if (timeSinceSync > 2000) return
    
    // Prevent processing our own events
    if (Date.now() - lastSyncRef.current < 100) return

    const audio = audioRef.current

    // Sync the current time if significantly different (more than 1 second)
    const timeDiff = Math.abs(audio.currentTime - remoteAudioState.currentTime)
    if (timeDiff > 1) {
      audio.currentTime = remoteAudioState.currentTime
    }

    // Sync play/pause state
    if (remoteAudioState.isPlaying && audio.paused) {
      audio.play().catch(console.error)
    } else if (!remoteAudioState.isPlaying && !audio.paused) {
      audio.pause()
    }
  }, [remoteAudioState, blockId])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      lastSyncRef.current = Date.now()
      syncAudioPause(blockId, audioRef.current.currentTime)
    } else {
      if (!canPlay) return
      audioRef.current.play().catch(console.error)
      lastSyncRef.current = Date.now()
      syncAudioPlay(blockId, audioRef.current.currentTime)
    }
  }, [isPlaying, canPlay, blockId, syncAudioPlay, syncAudioPause])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime
      const dur = audioRef.current.duration
      setCurrentTime(curr)
      setProgress((curr / dur) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handlePlayStart = () => {
    setIsPlaying(true)
    if (audioRef.current && audioRef.current.currentTime < 0.5) {
      setReplayCount(prev => prev + 1)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canPlay && !isPlaying) return
    if (!audioRef.current || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    const newTime = pct * duration
    
    audioRef.current.currentTime = newTime
    lastSyncRef.current = Date.now()
    syncAudioSeek(blockId, newTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <Mic className="h-5 w-5" />
        <span>Pronunciación</span>
        {!isTeacher && (
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Sincronizado con el profesor
          </span>
        )}
      </div>

      {title && (
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
      )}

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <audio
            ref={audioRef}
            src={url}
            className="hidden"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={handlePlayStart}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />

          <button
            onClick={togglePlay}
            disabled={!isPlaying && !canPlay}
            className={cn(
              "h-14 w-14 flex items-center justify-center rounded-full transition-all shadow-md shrink-0",
              isPlaying
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                : (!canPlay
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-blue-900 text-white hover:bg-blue-800 hover:scale-105")
            )}
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
          </button>

          <div className="flex-1 space-y-2">
            {/* Waveform Visualization */}
            <div
              className="h-12 flex items-center justify-between gap-0.5 cursor-pointer"
              onClick={handleSeek}
            >
              {waveform.map((height, i) => {
                const barPct = (i / waveform.length) * 100
                const isPlayed = progress > barPct
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-colors duration-200",
                      isPlayed ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    style={{
                      height: `${height * 100}%`,
                      minHeight: '20%'
                    }}
                  />
                )
              })}
            </div>

            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span className="flex items-center gap-2">
                {maxReplays > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider",
                    canPlay ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {replayCount} / {maxReplays} Usos
                  </span>
                )}
                <span>{formatTime(duration)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
