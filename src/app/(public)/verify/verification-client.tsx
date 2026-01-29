'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Calendar, CheckCircle, User, XCircle } from 'lucide-react'
import { VerificationAttempt } from '@/types/exam'

interface VerificationClientProps {
  attempt?: VerificationAttempt
  verificationCode?: string
  error?: string
}

export default function VerificationClient({ attempt, verificationCode, error }: VerificationClientProps) {
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Verificación Fallida</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Por favor, verifica el código e intenta nuevamente.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-800">Datos No Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">No se encontraron datos del intento de examen</p>
            <p className="text-sm text-gray-500">
              Por favor, contacta al administrador si el problema persiste.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scorePercentage = attempt?.maxPoints && attempt.maxPoints > 0 
    ? Math.round(((attempt.totalPoints || 0) / attempt.maxPoints) * 100) 
    : 0

  const passed = attempt?.score !== null ? attempt.score >= 70 : false

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resultados Verificados ✓
          </h1>
          <p className="text-gray-600">
            Los resultados de este examen han sido validados exitosamente
          </p>
        </div>

        {/* Verification Code */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Código de Verificación</p>
              <p className="text-xl font-mono font-bold text-blue-600 tracking-wider">
                {verificationCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Student Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Estudiante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-semibold">
                  {attempt?.user?.name && attempt?.user?.lastName 
                    ? `${attempt.user.name} ${attempt.user.lastName}` 
                    : attempt?.user?.name || 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-700">{attempt?.user?.email || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Información del Examen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Examen</p>
                <p className="font-semibold">{attempt?.exam?.title || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Intento</p>
                <p className="font-medium">#{attempt?.attemptNumber || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('es-ES') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge variant={passed ? "default" : "secondary"}>
                  {passed ? "Aprobado" : "Reprobado"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{scorePercentage}%</p>
                <p className="text-sm text-gray-500">Puntuación</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{attempt?.totalPoints || 0}</p>
                <p className="text-sm text-gray-500">Puntos Obtenidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{attempt?.maxPoints || 0}</p>
                <p className="text-sm text-gray-500">Puntos Máximos</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Este certificado es auténtico y ha sido verificado digitalmente</p>
          <p className="mt-1">Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}</p>
        </div>
      </div>
    </div>
  )
}
