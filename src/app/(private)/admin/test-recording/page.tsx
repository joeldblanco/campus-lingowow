'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Step = 'idle' | 'creating' | 'joined' | 'recording' | 'stopping' | 'done' | 'error'

interface EgressInfo {
  egressId: string
  status: number
  error?: string
  fileResults?: { filename?: string; size?: string }[]
}

const STATUS_LABELS: Record<number, string> = {
  0: 'STARTING',
  1: 'ACTIVE',
  2: 'ENDING',
  3: 'COMPLETE',
  4: 'COMPLETE',
  5: 'FAILED/ABORTED',
}

export default function TestRecordingPage() {
  const [step, setStep] = useState<Step>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [roomName, setRoomName] = useState('')
  const [egressId, setEgressId] = useState('')
  const [egressStatus, setEgressStatus] = useState<EgressInfo | null>(null)
  const [error, setError] = useState('')
  const roomRef = useRef<Room | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const log = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString()
    setLogs(prev => [`[${ts}] ${msg}`, ...prev])
  }, [])

  const apiCall = useCallback(async (action: string, extra: Record<string, string> = {}) => {
    const res = await fetch('/api/livekit/test-recording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    if (!res.ok) {
      const debugStr = data.debug ? ` [debug: host=${data.debug.livekitHost}, keyPresent=${data.debug.apiKeyPresent}, secretLen=${data.debug.apiSecretLen}]` : ''
      throw new Error((data.error || `HTTP ${res.status}`) + debugStr)
    }
    return data
  }, [])

  // Step 1: Create room + join with camera/mic
  const handleCreateRoom = useCallback(async () => {
    try {
      setStep('creating')
      setError('')
      setEgressStatus(null)
      log('Creando room de prueba...')

      const data = await apiCall('create-room')
      setRoomName(data.roomName)
      log(`Room creado: ${data.roomName}`)

      // Connect to room
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room

      room.on(RoomEvent.TrackPublished, () => log('Track publicado'))
      room.on(RoomEvent.Disconnected, () => {
        log('Desconectado del room')
        setStep('idle')
      })

      await room.connect(data.wsUrl, data.token)
      log('Conectado al room')

      // Enable camera + mic
      await room.localParticipant.enableCameraAndMicrophone()
      log('Cámara y micrófono habilitados')

      // Attach local video preview
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      if (camPub?.track && videoRef.current) {
        camPub.track.attach(videoRef.current)
        log('Vista previa de video adjuntada')
      }

      setStep('joined')
      log('✅ Listo para grabar. Haz clic en "Iniciar Grabación"')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStep('error')
      log(`❌ Error: ${msg}`)
    }
  }, [log, apiCall])

  // Step 2: Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      setStep('recording')
      log('Iniciando egress de grabación...')

      const data = await apiCall('start-recording', { roomName })
      setEgressId(data.egressId)
      log(`Egress iniciado: ${data.egressId} (status: ${STATUS_LABELS[data.status] || data.status})`)

      // Start polling status
      pollRef.current = setInterval(async () => {
        try {
          const status = await apiCall('check-status', { egressId: data.egressId })
          setEgressStatus(status)
          log(`Egress status: ${STATUS_LABELS[status.status] || status.status}${status.error ? ` - Error: ${status.error}` : ''}`)
          
          // Stop polling if egress is done or failed
          if (status.status >= 3) {
            if (pollRef.current) clearInterval(pollRef.current)
            if (status.status === 5) {
              setError(status.error || 'Egress falló')
              setStep('error')
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 5000)

      log('✅ Grabación en curso. Espera unos segundos y luego haz clic en "Detener Grabación"')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStep('error')
      log(`❌ Error iniciando grabación: ${msg}`)
    }
  }, [log, apiCall, roomName])

  // Step 3: Stop recording
  const handleStopRecording = useCallback(async () => {
    try {
      setStep('stopping')
      if (pollRef.current) clearInterval(pollRef.current)
      log('Deteniendo grabación...')

      const data = await apiCall('stop-recording', { egressId })
      log(`Egress detenido: status=${STATUS_LABELS[data.status] || data.status}${data.error ? `, error=${data.error}` : ''}`)

      if (data.fileResults?.length > 0) {
        const file = data.fileResults[0]
        log(`📁 Archivo: ${file.filename} (${file.size ? Math.round(Number(file.size) / 1024) + 'KB' : 'tamaño desconocido'})`)
      }

      // Final status check
      await new Promise(resolve => setTimeout(resolve, 3000))
      try {
        const finalStatus = await apiCall('check-status', { egressId })
        setEgressStatus(finalStatus)
        log(`Estado final: ${STATUS_LABELS[finalStatus.status] || finalStatus.status}`)
        if (finalStatus.fileResults?.length > 0) {
          log(`📁 Archivo final: ${finalStatus.fileResults[0].filename}`)
        }
      } catch {
        log('No se pudo verificar el estado final (puede que el egress ya haya terminado)')
      }

      setStep('done')
      log('✅ Prueba completada. Revisa los resultados arriba.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStep('error')
      log(`❌ Error deteniendo grabación: ${msg}`)
    }
  }, [log, apiCall, egressId])

  // Check recent egresses
  const handleCheckLogs = useCallback(async () => {
    try {
      log('Consultando egresses recientes...')
      const data = await apiCall('check-egress-logs')
      log(`Total egresses: ${data.total}`)
      if (data.recent?.length > 0) {
        data.recent.forEach((e: EgressInfo & { roomName?: string; startedAt?: string }) => {
          log(`  ${e.egressId} | room=${e.roomName} | status=${STATUS_LABELS[e.status] || e.status}${e.error ? ` | error=${e.error}` : ''}${e.fileResults?.length ? ` | file=${e.fileResults[0]?.filename}` : ''}`)
        })
      } else {
        log('  No hay egresses recientes')
      }
    } catch (err) {
      log(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [log, apiCall])

  // Cleanup on unmount
  const handleDisconnect = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    setStep('idle')
    setRoomName('')
    setEgressId('')
    setEgressStatus(null)
    setError('')
    log('Desconectado y limpio')
  }, [log])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prueba de Grabación LiveKit</h1>
          <p className="text-gray-500 mt-1">
            Prueba el flujo completo de grabación sin necesidad de crear una clase.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-3 h-3 rounded-full ${
              step === 'idle' ? 'bg-gray-400' :
              step === 'creating' ? 'bg-yellow-400 animate-pulse' :
              step === 'joined' ? 'bg-blue-400' :
              step === 'recording' ? 'bg-red-500 animate-pulse' :
              step === 'stopping' ? 'bg-orange-400 animate-pulse' :
              step === 'done' ? 'bg-green-500' :
              'bg-red-600'
            }`} />
            <span className="font-medium text-gray-700">
              {step === 'idle' && 'Esperando...'}
              {step === 'creating' && 'Creando room...'}
              {step === 'joined' && 'Conectado al room'}
              {step === 'recording' && 'Grabando...'}
              {step === 'stopping' && 'Deteniendo grabación...'}
              {step === 'done' && 'Prueba completada'}
              {step === 'error' && `Error: ${error}`}
            </span>
          </div>

          {roomName && (
            <div className="text-sm text-gray-500 mb-2">
              <strong>Room:</strong> {roomName}
            </div>
          )}
          {egressId && (
            <div className="text-sm text-gray-500 mb-2">
              <strong>Egress ID:</strong> {egressId}
            </div>
          )}
          {egressStatus && (
            <div className="text-sm text-gray-500 mb-2">
              <strong>Egress Status:</strong> {STATUS_LABELS[egressStatus.status] || egressStatus.status}
              {egressStatus.error && <span className="text-red-500 ml-2">({egressStatus.error})</span>}
            </div>
          )}
        </div>

        {/* Video Preview + Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {step === 'idle' ? (
              <span className="text-gray-500 text-sm">Vista previa del video aparecerá aquí</span>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Pasos de la prueba</h3>

            {/* Step 1 */}
            <button
              onClick={handleCreateRoom}
              disabled={step !== 'idle' && step !== 'error' && step !== 'done'}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
            >
              1. Crear Room y Conectar (Cámara + Mic)
            </button>

            {/* Step 2 */}
            <button
              onClick={handleStartRecording}
              disabled={step !== 'joined'}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white"
            >
              2. Iniciar Grabación (Egress)
            </button>

            {/* Step 3 */}
            <button
              onClick={handleStopRecording}
              disabled={step !== 'recording'}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-700 text-white"
            >
              3. Detener Grabación
            </button>

            <hr className="my-2" />

            {/* Utilities */}
            <button
              onClick={handleCheckLogs}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Ver Egresses Recientes
            </button>

            <button
              onClick={handleDisconnect}
              disabled={step === 'idle'}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Desconectar y Reiniciar
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Logs</h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Limpiar
            </button>
          </div>
          <div className="h-64 overflow-y-auto font-mono text-xs space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-gray-600">Los logs aparecerán aquí...</p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={`${
                    l.includes('❌') ? 'text-red-400' :
                    l.includes('✅') ? 'text-green-400' :
                    l.includes('📁') ? 'text-yellow-300' :
                    'text-gray-300'
                  }`}
                >
                  {l}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <h3 className="font-semibold mb-2">Instrucciones</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Haz clic en <strong>&quot;Crear Room y Conectar&quot;</strong> — esto crea un room temporal en LiveKit y te conecta con cámara y micrófono.</li>
            <li>Haz clic en <strong>&quot;Iniciar Grabación&quot;</strong> — esto inicia un egress que graba el room usando el template de grabación.</li>
            <li>Espera al menos <strong>10-15 segundos</strong> para que el egress se estabilice.</li>
            <li>Haz clic en <strong>&quot;Detener Grabación&quot;</strong> — esto para el egress y debería subir el archivo a R2.</li>
            <li>Verifica en los logs que el egress completó correctamente y se generó un archivo MP4.</li>
          </ol>
          <p className="mt-2"><strong>Si el egress falla con &quot;Start signal not received&quot;</strong>, significa que el template de grabación no está emitiendo la señal correctamente.</p>
        </div>
      </div>
    </div>
  )
}
