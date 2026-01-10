'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Pause, Send, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import { saveBlockResponse } from '@/lib/actions/block-responses'
import { toast } from 'sonner'

interface RecordingBlockData {
  prompt?: string
  timeLimit?: number
  maxAttempts?: number
}

interface SavedResponse {
  response: {
    audioUrl?: string
    duration?: number
  }
  score?: number | null
  feedback?: string | null
  gradedAt?: string | null
}

interface InteractiveRecordingBlockProps {
  blockId: string
  contentId: string
  block: RecordingBlockData
  initialResponse?: SavedResponse
  onResponseSaved?: () => void
}

export function InteractiveRecordingBlock({
  blockId,
  contentId,
  block,
  initialResponse,
  onResponseSaved
}: InteractiveRecordingBlockProps) {
  const [isRecording, setIsRecording] = useState(false)
    const [timeElapsed, setTimeElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(initialResponse?.response?.audioUrl || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!initialResponse)
  const [feedback] = useState(initialResponse?.feedback || null)
  const [attempts, setAttempts] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const timeLimit = block.timeLimit || 60
  const maxAttempts = block.maxAttempts || 3
  const canRecord = attempts < maxAttempts

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl && !initialResponse?.response?.audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl, initialResponse])

  const startRecording = useCallback(async () => {
    if (!canRecord) {
      toast.error(`Has alcanzado el máximo de ${maxAttempts} intentos`)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setTimeElapsed(0)
      setIsSaved(false)

      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          if (prev >= timeLimit - 1) {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop()
              setIsRecording(false)
              setAttempts(p => p + 1)
              if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
              }
            }
            return timeLimit
          }
          return prev + 1
        })
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('No se pudo acceder al micrófono')
    }
  }, [canRecord, maxAttempts, timeLimit])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAttempts(prev => prev + 1)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const deleteRecording = useCallback(() => {
    if (audioUrl && !initialResponse?.response?.audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setTimeElapsed(0)
    setIsSaved(false)
  }, [audioUrl, initialResponse])

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, audioUrl])

  const handleSave = useCallback(async () => {
    if (!audioBlob && !audioUrl) {
      toast.error('No hay grabación para guardar')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveBlockResponse({
        contentId,
        blockId,
        blockType: 'recording',
        response: {
          audioUrl: audioUrl,
          duration: timeElapsed
        },
        maxScore: 100
      })

      if (result.success) {
        setIsSaved(true)
        toast.success('Grabación guardada correctamente')
        onResponseSaved?.()
      } else {
        toast.error(result.error || 'Error al guardar la grabación')
      }
    } catch (error) {
      console.error('Error saving recording:', error)
      toast.error('Error al guardar la grabación')
    } finally {
      setIsSaving(false)
    }
  }, [contentId, blockId, audioBlob, audioUrl, timeElapsed, onResponseSaved])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Mic className="h-5 w-5" />
          <span>Grabación de Audio</span>
        </div>
        <div className="flex items-center gap-2">
          {isSaved && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
              <CheckCircle className="h-3 w-3" />
              <span>Guardado</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            Intentos: {attempts}/{maxAttempts}
          </span>
        </div>
      </div>

      {block.prompt && (
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-foreground">{block.prompt}</h3>
          <p className="text-xs text-muted-foreground">
            Tiempo máximo: {formatTime(timeLimit)}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
        {isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="size-20 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                REC
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatTime(timeElapsed)} / {formatTime(timeLimit)}
            </div>
            <Button
              variant="destructive"
              size="lg"
              onClick={stopRecording}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Detener Grabación
            </Button>
          </div>
        ) : audioUrl ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayback}
                className="size-14 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <div className="text-lg font-mono text-foreground">
                Duración: {formatTime(timeElapsed)}
              </div>
            </div>
            <div className="flex gap-2">
              {canRecord && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteRecording}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar y Regrabar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="size-20 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Haz clic en el botón para comenzar a grabar
            </p>
            <Button
              size="lg"
              onClick={startRecording}
              disabled={!canRecord}
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              Iniciar Grabación
            </Button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
            Retroalimentación del Profesor
          </h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">{feedback}</p>
        </div>
      )}

      {audioUrl && !isSaved && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Grabación
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
