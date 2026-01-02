'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScheduleSelector } from '@/components/checkout/schedule-selector'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ProrationResult {
  planId: string
  planName: string
  originalPrice: number
  proratedPrice: number
  classesFromNow: number
  totalClassesInFullPeriod: number
  classesPerWeek: number
  periodStart: string
  periodEnd: string
  enrollmentStart: string
  daysRemaining: number
  weeksRemaining: number
  allowProration: boolean
  schedule: ScheduleSlot[]
}

interface Teacher {
  id: string
  name: string
  lastName: string | null
  image: string | null
}

interface Course {
  id: string
  title: string
}

interface Enrollment {
  id: string
  course: Course
  schedules?: Array<{
    teacher: Teacher
  }>
}

interface ScheduleSetupProps {
  enrollment: Enrollment
  hasExistingSchedules: boolean
}

export function ScheduleSetup({ enrollment, hasExistingSchedules }: ScheduleSetupProps) {
  const router = useRouter()
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSlot[]>([])
  const [proration, setProration] = useState<ProrationResult | null>(null)
  const [saving, setSaving] = useState(false)

  const handleScheduleSelected = (schedule: ScheduleSlot[], prorationData: ProrationResult) => {
    setSelectedSchedule(schedule)
    setProration(prorationData)
  }

  const handleSaveSchedule = async () => {
    if (selectedSchedule.length === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }

    try {
      setSaving(true)

      // Crear los horarios en la base de datos
      const response = await fetch('/api/enrollments/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          schedule: selectedSchedule,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar el horario')

      toast.success('Horario guardado correctamente')
      router.push('/classes')
      router.refresh()
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Error al guardar el horario')
    } finally {
      setSaving(false)
    }
  }

  if (hasExistingSchedules) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Horario Configurado
          </CardTitle>
          <CardDescription>
            Ya tienes un horario configurado para este curso. Puedes ver tus clases en la sección
            de Mis Clases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Si necesitas modificar tu horario, contacta con el equipo académico.
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/classes')}>Ver Mis Clases</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Selecciona los días y horarios en los que deseas tomar tus clases. Puedes elegir
          múltiples horarios por semana según tu disponibilidad.
        </AlertDescription>
      </Alert>

      <ScheduleSelector
        planId={enrollment.id}
        courseId={enrollment.course.id}
        onScheduleSelected={handleScheduleSelected}
      />

      {proration && selectedSchedule.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSaveSchedule}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? 'Guardando...' : 'Confirmar Horario'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
