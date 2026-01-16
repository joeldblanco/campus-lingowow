'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaveformAudioPlayerProps {
  url: string
  title?: string
  className?: string
}

export function WaveformAudioPlayer({ url, title, className }: WaveformAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [waveform] = useState(() => Array.from({ length: 32 }, () => Math.random() * 0.7 + 0.3))
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

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
  }

  const handleEnded = () => {
    setIsPlaying(false)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      audioRef.current.currentTime = pct * duration
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("bg-card border rounded-xl p-4 shadow-sm", className)}>
      <div className="flex items-center gap-4">
        <audio
          ref={audioRef}
          src={url}
          className="hidden"
          onEnded={handleEnded}
          onPause={() => setIsPlaying(false)}
          onPlay={handlePlayStart}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />

        <button
          onClick={togglePlay}
          className={cn(
            "h-12 w-12 flex items-center justify-center rounded-full transition-all shadow-md shrink-0",
            isPlaying
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
              : "bg-blue-900 text-white hover:bg-blue-800 hover:scale-105"
          )}
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 space-y-1.5">
          {title && (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <span>{title}</span>
            </div>
          )}
          
          <div
            className="h-10 flex items-center justify-between gap-0.5 cursor-pointer"
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
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
