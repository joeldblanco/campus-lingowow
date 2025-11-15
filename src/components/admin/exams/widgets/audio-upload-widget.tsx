'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Upload, X, Volume2, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { uploadAudioFile } from '@/lib/actions/cloudinary'

interface AudioUploadWidgetProps {
  audioUrl?: string
  audioPosition?: 'BEFORE_QUESTION' | 'AFTER_QUESTION' | 'BEFORE_OPTIONS' | 'SECTION_TOP'
  maxAudioPlays?: number
  audioAutoplay?: boolean
  audioPausable?: boolean
  onAudioChange: (config: {
    audioUrl?: string
    audioPosition?: 'BEFORE_QUESTION' | 'AFTER_QUESTION' | 'BEFORE_OPTIONS' | 'SECTION_TOP'
    maxAudioPlays?: number
    audioAutoplay?: boolean
    audioPausable?: boolean
  }) => void
}

export function AudioUploadWidget({
  audioUrl,
  audioPosition = 'BEFORE_QUESTION',
  maxAudioPlays,
  audioAutoplay = false,
  audioPausable = false,
  onAudioChange,
}: AudioUploadWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('audio/')) {
      toast.error('Por favor selecciona un archivo de audio válido')
      return
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB')
      return
    }

    setUploading(true)
    try {
      // Crear FormData para subir el archivo
      const formData = new FormData()
      formData.append('file', file)

      // Subir usando server action (más seguro)
      const result = await uploadAudioFile(formData, 'exam-audios')

      if (result.success && result.data) {
        onAudioChange({
          audioUrl: result.data.secure_url,
          audioPosition,
          maxAudioPlays,
          audioAutoplay,
          audioPausable,
        })

        toast.success('Audio subido exitosamente')
      } else {
        toast.error(result.error || 'Error al subir el audio')
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
      toast.error('Error al subir el audio. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    onAudioChange({
      audioUrl: url || undefined,
      audioPosition,
      maxAudioPlays,
      audioAutoplay,
      audioPausable,
    })
  }

  const handlePositionChange = (position: string) => {
    onAudioChange({
      audioUrl,
      audioPosition: position as typeof audioPosition,
      maxAudioPlays,
      audioAutoplay,
      audioPausable,
    })
  }

  const handleMaxPlaysChange = (value: string) => {
    const numValue = parseInt(value)
    onAudioChange({
      audioUrl,
      audioPosition,
      maxAudioPlays: numValue > 0 ? numValue : undefined,
      audioAutoplay,
      audioPausable,
    })
  }

  const handleAutoplayChange = (checked: boolean) => {
    onAudioChange({
      audioUrl,
      audioPosition,
      maxAudioPlays,
      audioAutoplay: checked,
      audioPausable,
    })
  }

  const handlePausableChange = (checked: boolean) => {
    onAudioChange({
      audioUrl,
      audioPosition,
      maxAudioPlays,
      audioAutoplay,
      audioPausable: checked,
    })
  }

  const handleRemoveAudio = () => {
    onAudioChange({
      audioUrl: undefined,
      audioPosition: 'BEFORE_QUESTION',
      maxAudioPlays: undefined,
      audioAutoplay: false,
      audioPausable: false,
    })
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Audio para Listening
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!audioUrl ? (
          <div className="space-y-3">
            {/* File Upload */}
            <div>
              <Label>Subir archivo de audio</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos: MP3, WAV, OGG. Máximo 10MB
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O</span>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <Label>URL del audio</Label>
              <Input
                type="url"
                placeholder="https://ejemplo.com/audio.mp3"
                onChange={(e) => handleUrlChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ingresa la URL de un audio alojado externamente
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Audio Player Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-sm truncate">{audioUrl}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveAudio}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
            </div>

            {/* Audio Configuration */}
            <div className="space-y-3">
              <div>
                <Label>Posición del reproductor</Label>
                <Select value={audioPosition} onValueChange={handlePositionChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEFORE_QUESTION">Antes de la pregunta</SelectItem>
                    <SelectItem value="AFTER_QUESTION">Después de la pregunta</SelectItem>
                    <SelectItem value="BEFORE_OPTIONS">Antes de las opciones</SelectItem>
                    <SelectItem value="SECTION_TOP">Al inicio de la sección</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reproducciones máximas</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={maxAudioPlays || ''}
                  onChange={(e) => handleMaxPlaysChange(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deja en blanco para reproducciones ilimitadas
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reproducción automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Reproducir al cargar la pregunta
                  </p>
                </div>
                <Switch
                  checked={audioAutoplay}
                  onCheckedChange={handleAutoplayChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir pausar</Label>
                  <p className="text-xs text-muted-foreground">
                    El estudiante puede pausar el audio
                  </p>
                </div>
                <Switch
                  checked={audioPausable}
                  onCheckedChange={handlePausableChange}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
