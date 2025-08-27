// Este archivo iría en /app/cursos/[courseId]/agendar/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AvailableTeachers } from '@/components/available-teachers'
import { CalendarIcon, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleClassPageProps {
  params: {
    courseId: string
  }
}

export default function ScheduleClassPage({ params }: ScheduleClassPageProps) {
  const [selectedTab, setSelectedTab] = useState<string>('calendar')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  // const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(0)
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [selectedEndTime, setSelectedEndTime] = useState<string>('')

  const router = useRouter()

  const handleSelectTimeSlot = (
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) => {
    setSelectedTeacher(teacherId)
    // setSelectedDayOfWeek(dayOfWeek)
    setSelectedStartTime(startTime)
    setSelectedEndTime(endTime)

    toast('Horario seleccionado. Ahora puedes confirmar tu clase')
  }

  const handleConfirmBooking = async () => {
    // Aquí normalmente enviaríamos los datos al servidor
    toast('¡Clase agendada con éxito!. Revisa tu email para los detalles de la clase.')

    // Redirigir al estudiante a su panel de clases
    router.push('/estudiante/mis-clases')
  }

  return (
    <div className="container py-6 max-w-5xl">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Volver al curso
      </Button>

      <h1 className="text-3xl font-bold mb-2">Agendar una clase</h1>
      <p className="text-muted-foreground mb-6">
        Selecciona un profesor y horario para tu próxima clase.
      </p>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Ver Calendario
          </TabsTrigger>
          <TabsTrigger value="teacher">Ver por Profesor</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario</CardTitle>
              <CardDescription>
                Selecciona una fecha para ver las clases disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Calendar mode="single" className="rounded-md border" />
            </CardContent>
          </Card>

          <p className="text-center text-muted-foreground">
            La vista de calendario está integrada con otro componente. Utiliza la pestaña &quot;Ver
            por Profesor&quot; para agendar una clase.
          </p>
        </TabsContent>

        <TabsContent value="teacher">
          <AvailableTeachers courseId={params.courseId} onSelectTimeSlot={handleSelectTimeSlot} />

          {selectedTeacher && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Confirmar Reserva</CardTitle>
                <CardDescription>Revisa los detalles antes de confirmar tu clase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">Detalles de la clase:</p>
                  <p className="text-sm">Curso: {params.courseId}</p>
                  <p className="text-sm">ID del profesor: {selectedTeacher}</p>
                  <p className="text-sm">
                    Horario: {selectedStartTime} - {selectedEndTime}
                  </p>
                </div>

                <Button className="w-full" onClick={handleConfirmBooking}>
                  Confirmar Reserva
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
