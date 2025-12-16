'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Video, 
  Copy, 
  Check, 
  Users, 
  Monitor,
  Smartphone,
  Info,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { TestVideoCall } from '@/components/jitsi/TestVideoCall'

export default function VideoTestPage() {
  const [roomCode, setRoomCode] = useState('')
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isInMeeting, setIsInMeeting] = useState(false)

  const generateRoomCode = () => {
    const code = `test-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
    setRoomCode(code)
    toast.success('Código de sala generado')
  }

  const copyRoomCode = async () => {
    if (!roomCode) return
    
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      toast.success('Código copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar')
    }
  }

  const copyJoinUrl = async () => {
    if (!roomCode) return
    
    const url = `${window.location.origin}/video-test/${roomCode}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL copiada al portapapeles')
    } catch {
      toast.error('Error al copiar URL')
    }
  }

  const startMeeting = () => {
    if (!roomCode.trim()) {
      toast.error('Ingresa o genera un código de sala')
      return
    }
    setActiveRoom(roomCode)
    setIsInMeeting(true)
  }

  const handleMeetingEnd = useCallback(() => {
    setIsInMeeting(false)
    setActiveRoom(null)
    toast.success('Videollamada de prueba finalizada')
  }, [])

  // Verificar si hay un código de sala en la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const roomParam = params.get('room')
      if (roomParam) {
        setRoomCode(roomParam)
      }
    }
  }, [])

  if (isInMeeting && activeRoom) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 text-white">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
              Modo Prueba
            </Badge>
            <span className="text-sm font-medium">Sala: {activeRoom}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleMeetingEnd}
          >
            Finalizar Prueba
          </Button>
        </div>
        <div className="flex-1">
          <TestVideoCall
            roomName={activeRoom}
            onMeetingEnd={handleMeetingEnd}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prueba de Videollamadas</h1>
        <p className="text-muted-foreground">
          Prueba la funcionalidad de videollamadas desde múltiples dispositivos sin necesidad de agendar una clase.
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">¿Cómo funciona?</AlertTitle>
        <AlertDescription className="text-blue-700">
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Genera o ingresa un código de sala único</li>
            <li>Copia el código o la URL y ábrela en otro dispositivo/navegador</li>
            <li>Ambos dispositivos deben iniciar sesión con cuentas diferentes</li>
            <li>Únete a la misma sala desde ambos dispositivos para probar</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              Configurar Sala
            </CardTitle>
            <CardDescription>
              Genera un código único o ingresa uno existente para unirte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Código de sala (ej: test-abc123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={generateRoomCode}
                title="Generar código"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {roomCode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRoomCode}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copiar Código
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyJoinUrl}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL
                </Button>
              </div>
            )}

            <Button
              onClick={startMeeting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
              disabled={!roomCode.trim()}
            >
              <Video className="h-5 w-5 mr-2" />
              Iniciar Videollamada
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Instrucciones de Prueba
            </CardTitle>
            <CardDescription>
              Sigue estos pasos para probar con múltiples dispositivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-purple-100">
                  <Monitor className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dispositivo 1 (Este)</p>
                  <p className="text-xs text-muted-foreground">
                    Genera el código y únete a la sala
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-blue-100">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dispositivo 2</p>
                  <p className="text-xs text-muted-foreground">
                    Abre la URL copiada (accesible para cualquier usuario autenticado)
                  </p>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-800 text-xs">
                  <strong>Nota:</strong> Cada dispositivo debe tener una sesión activa con una cuenta diferente para simular una clase real entre profesor y estudiante.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Características a Probar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Video', icon: '📹' },
              { label: 'Audio', icon: '🎤' },
              { label: 'Compartir Pantalla', icon: '🖥️' },
              { label: 'Calidad de Conexión', icon: '📶' },
              { label: 'Latencia', icon: '⏱️' },
              { label: 'Grabación', icon: '⏺️' },
              { label: 'Chat (deshabilitado)', icon: '💬' },
              { label: 'Controles', icon: '🎛️' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm"
              >
                <span>{feature.icon}</span>
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
