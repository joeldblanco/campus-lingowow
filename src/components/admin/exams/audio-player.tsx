'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AudioPlayerProps {
  audioUrl: string
  maxPlays?: number
  autoplay?: boolean
  pausable?: boolean
  onPlayCountChange?: (count: number) => void
}

export function AudioPlayer({
  audioUrl,
  maxPlays,
  autoplay = false,
  pausable = false,
  onPlayCountChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const canPlay = maxPlays === undefined || maxPlays === null || playCount < maxPlays
  const remainingPlays = maxPlays ? maxPlays - playCount : null

  useEffect(() => {
    if (autoplay && !hasAutoPlayed && audioRef.current && canPlay) {
      audioRef.current.play()
      setHasAutoPlayed(true)
    }
  }, [autoplay, hasAutoPlayed, canPlay])

  const handlePlay = () => {
    if (!audioRef.current || !canPlay) return

    if (isPlaying && pausable) {
      // Solo permitir pausar si pausable está habilitado
      audioRef.current.pause()
    } else if (!isPlaying) {
      audioRef.current.play()
    }
  }

  const handleAudioPlay = () => {
    setIsPlaying(true)
    const newCount = playCount + 1
    setPlayCount(newCount)
    onPlayCountChange?.(newCount)
  }

  const handleAudioPause = () => {
    setIsPlaying(false)
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={canPlay ? 'default' : 'secondary'}
          onClick={handlePlay}
          disabled={!canPlay || (isPlaying && !pausable)}
          className="flex-shrink-0"
          title={isPlaying && !pausable ? 'No se puede pausar este audio' : ''}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isPlaying ? (pausable ? 'Pausar' : 'Reproduciendo...') : 'Reproducir'}
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Audio de listening</span>
        </div>

        {maxPlays && (
          <div className="text-sm text-muted-foreground">
            {remainingPlays !== null && remainingPlays > 0 ? (
              <span>
                {remainingPlays} {remainingPlays === 1 ? 'reproducción' : 'reproducciones'} restante
                {remainingPlays === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-destructive font-medium">Sin reproducciones</span>
            )}
          </div>
        )}
      </div>

      {maxPlays && playCount >= maxPlays && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Has alcanzado el límite de reproducciones para este audio
          </AlertDescription>
        </Alert>
      )}

      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleAudioEnded}
        preload="metadata"
      />
    </Card>
  )
}
