'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Calendar, Clock } from 'lucide-react'

interface PendingEnrollment {
  id: string
  daysSinceEnrollment: number
  isUrgent: boolean
  daysRemaining: number
  course: {
    id: string
    title: string
    description: string
  }
  academicPeriod: {
    name: string
    season: {
      name: string
      year: number
    }
  }
}

interface PendingScheduleResponse {
  enrollments: PendingEnrollment[]
  count: number
  hasUrgent: boolean
}

export function PendingScheduleBanner() {
  const router = useRouter()
  const [data, setData] = useState<PendingScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingSchedules()
  }, [])

  const fetchPendingSchedules = async () => {
    try {
      const response = await fetch('/api/enrollments/pending-schedule')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching pending schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data || data.count === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {data.hasUrgent && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">¡Acción Urgente Requerida!</AlertTitle>
          <AlertDescription>
            Tienes inscripciones que necesitan configuración de horario. Si no configuras tu
            horario pronto, tu acceso a las clases será suspendido.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Configura tu Horario de Clases
              </h3>
              <p className="text-amber-800 mb-4">
                Tienes {data.count} {data.count === 1 ? 'curso' : 'cursos'} esperando que
                selecciones tu horario para comenzar las clases.
              </p>

              <div className="space-y-3">
                {data.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-white rounded-lg p-4 border border-amber-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{enrollment.course.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {enrollment.academicPeriod.season.name}{' '}
                          {enrollment.academicPeriod.season.year}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {enrollment.isUrgent ? (
                              <span className="text-red-600 font-semibold">
                                ¡Solo quedan {enrollment.daysRemaining} días!
                              </span>
                            ) : (
                              <span>
                                Inscrito hace {enrollment.daysSinceEnrollment}{' '}
                                {enrollment.daysSinceEnrollment === 1 ? 'día' : 'días'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push(`/enrollments/${enrollment.id}/schedule`)}
                        variant={enrollment.isUrgent ? 'destructive' : 'default'}
                        size="sm"
                      >
                        Configurar Ahora
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
