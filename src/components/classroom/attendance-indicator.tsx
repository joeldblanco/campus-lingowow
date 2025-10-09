'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttendanceIndicatorProps {
  bookingId: string
  userRole: 'teacher' | 'student'
  className?: string
}

interface AttendanceStatus {
  teacherPresent: boolean
  studentPresent: boolean
  bothPresent: boolean
  teacherAttendance: {
    timestamp: Date
    status: string
  } | null
  studentAttendance: {
    timestamp: Date
    status: string
  } | null
}

export function AttendanceIndicator({ 
  bookingId, 
  userRole,
  className 
}: AttendanceIndicatorProps) {
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAttendance() {
      try {
        const response = await fetch('/api/attendance/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAttendance({
              teacherPresent: data.teacherPresent,
              studentPresent: data.studentPresent,
              bothPresent: data.bothPresent,
              teacherAttendance: data.teacherAttendance,
              studentAttendance: data.studentAttendance,
            })
          }
        }
      } catch (error) {
        console.error('Error verificando asistencia:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAttendance()

    // Verificar cada 10 segundos
    const interval = setInterval(checkAttendance, 10000)

    return () => clearInterval(interval)
  }, [bookingId])

  if (loading) {
    return (
      <Card className={cn('border-gray-200', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Verificando asistencia...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!attendance) {
    return null
  }

  return (
    <Card className={cn('border-gray-200', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Estado de Asistencia</span>
          </div>

          <div className="space-y-2">
            {/* Asistencia del Profesor */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Profesor</span>
              {attendance.teacherPresent ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Presente
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  Ausente
                </Badge>
              )}
            </div>

            {/* Asistencia del Estudiante */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estudiante</span>
              {attendance.studentPresent ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Presente
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  Ausente
                </Badge>
              )}
            </div>
          </div>

          {/* Estado de Clase Pagable */}
          <div className="pt-2 border-t">
            {attendance.bothPresent ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Clase pagable confirmada</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {userRole === 'teacher' 
                    ? 'Esperando al estudiante...' 
                    : 'Esperando al profesor...'}
                </span>
              </div>
            )}
          </div>

          {/* Información adicional */}
          {attendance.bothPresent && (
            <div className="text-xs text-muted-foreground pt-1">
              Esta clase será contabilizada para el pago del profesor.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
