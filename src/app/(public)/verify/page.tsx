'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import VerificationClient from './verification-client'
import { getExamAttemptByVerificationCode } from '@/lib/actions/exams'
import { VerificationAttempt } from '@/types/exam'
import { Search, CheckCircle, XCircle } from 'lucide-react'

export default function VerifyFormPage() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attempt, setAttempt] = useState<VerificationAttempt | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) {
      setError('Por favor ingresa un código de verificación')
      return
    }

    setIsLoading(true)
    setError(null)
    setAttempt(null)

    try {
      // Validar formato del código
      if (!code.startsWith('LW-EXAM-')) {
        setError('Código de verificación inválido')
        return
      }

      // Buscar el intento por código de verificación
      const result: VerificationAttempt | null = await getExamAttemptByVerificationCode(code)

      if (!result) {
        setError('Código de verificación no encontrado')
        return
      }

      // Verificar si permite verificación pública
      if (!result.allowPublicVerification) {
        setError('Este examen no permite verificación pública')
        return
      }

      setAttempt(result)
    } catch (error) {
      console.error('Error verifying exam results:', error)
      setError('Error al verificar los resultados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setCode('')
    setAttempt(null)
    setError(null)
  }

  // Si ya hay un intento verificado, mostrar los resultados
  if (attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="mb-4"
            >
              ← Verificar otro código
            </Button>
          </div>
          <VerificationClient attempt={attempt} verificationCode={code} />
        </div>
      </div>
    )
  }

  // Mostrar formulario de verificación
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verificación de Resultados
          </h1>
          <p className="text-gray-600">
            Ingresa el código de verificación para validar los resultados del examen
          </p>
        </div>

        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Ingresa el Código de Verificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Código de Verificación</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="LW-EXAM-XXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono text-center tracking-wider"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 text-center">
                  Formato: LW-EXAM- seguido de 6 caracteres
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Verificar Resultados
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            ¿No tienes un código de verificación?
          </p>
          <p>
            El código se encuentra en el reporte de resultados generado al completar el examen.
          </p>
        </div>
      </div>
    </div>
  )
}
