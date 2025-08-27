'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, CalendarIcon, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Tipos
interface Teacher {
  id: string
  name: string
  avatarUrl: string
  specialties: string[]
  availability: {
    dayOfWeek: number
    slots: Array<{
      startTime: string
      endTime: string
      isBooked: boolean
    }>
  }[]
  rating: number
  totalClasses: number
}

interface AvailableTeachersProps {
  courseId?: string
  onSelectTimeSlot?: (
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) => void
}

// Días de la semana en español
const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function AvailableTeachers({ courseId, onSelectTimeSlot }: AvailableTeachersProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 7) // 0 = domingo, ajustamos para que 1 = lunes

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        // En un caso real, añadiríamos parámetros como courseId
        const response = await fetch('/api/teachers/available')

        if (!response.ok) {
          throw new Error('Error al cargar profesores')
        }

        const data = await response.json()
        setTeachers(data)
      } catch (error) {
        console.error(error)
        toast.error(
          'Error de conexión. No pudimos cargar los profesores disponibles. Inténtalo de nuevo.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [courseId])

  const handleBookClass = (
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) => {
    if (onSelectTimeSlot) {
      onSelectTimeSlot(teacherId, dayOfWeek, startTime, endTime)
    } else {
      toast(
        `Horario seleccionado. Has seleccionado una clase el ${DAYS_OF_WEEK[dayOfWeek - 1]} de ${startTime} a ${endTime}`
      )
    }
  }

  // Para ajustar el día de la semana al formato que usamos (1-7 donde 1 es Lunes)
  //   const adjustDayOfWeek = (day: number): number => {
  //     return day === 0 ? 7 : day // Convertimos domingo (0) a 7
  //   }

  if (loading) {
    return <TeachersLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Profesores Disponibles</h2>

      <Tabs
        defaultValue={activeDay.toString()}
        onValueChange={(value) => setActiveDay(parseInt(value))}
      >
        <TabsList className="grid grid-cols-7 w-full mb-4">
          {DAYS_OF_WEEK.map((day, index) => (
            <TabsTrigger key={index} value={(index + 1).toString()} className="text-xs sm:text-sm">
              {day.substring(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>

        {DAYS_OF_WEEK.map((_, dayIndex) => {
          const dayValue = dayIndex + 1 // 1-7 (Lunes-Domingo)

          return (
            <TabsContent key={dayValue} value={dayValue.toString()} className="space-y-4">
              {teachers.length > 0 ? (
                <ScrollArea className="max-h-[600px]">
                  {teachers
                    .filter((teacher) =>
                      teacher.availability.some(
                        (a) => a.dayOfWeek === dayValue && a.slots.some((s) => !s.isBooked)
                      )
                    )
                    .map((teacher) => (
                      <TeacherCard
                        key={teacher.id}
                        teacher={teacher}
                        dayOfWeek={dayValue}
                        onBookClass={handleBookClass}
                      />
                    ))}

                  {teachers.filter((teacher) =>
                    teacher.availability.some(
                      (a) => a.dayOfWeek === dayValue && a.slots.some((s) => !s.isBooked)
                    )
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No hay profesores disponibles para este día</p>
                      <p className="text-sm mt-2">Prueba seleccionando otro día de la semana</p>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No se encontraron profesores disponibles</p>
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

function TeacherCard({
  teacher,
  dayOfWeek,
  onBookClass,
}: {
  teacher: Teacher
  dayOfWeek: number
  onBookClass: (teacherId: string, dayOfWeek: number, startTime: string, endTime: string) => void
}) {
  const availabilityForDay = teacher.availability.find((a) => a.dayOfWeek === dayOfWeek)
  const availableSlots = availabilityForDay?.slots.filter((slot) => !slot.isBooked) || []

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={teacher.avatarUrl} alt={teacher.name} />
          <AvatarFallback>{teacher.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <CardTitle>{teacher.name}</CardTitle>
          <CardDescription className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1" />
            {teacher.totalClasses} clases impartidas
          </CardDescription>
          <div className="flex flex-wrap gap-1 mt-1">
            {teacher.specialties.map((specialty, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Horarios disponibles - {DAYS_OF_WEEK[dayOfWeek - 1]}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableSlots.map((slot, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={() => onBookClass(teacher.id, dayOfWeek, slot.startTime, slot.endTime)}
            >
              {slot.startTime} - {slot.endTime}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TeachersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array(7)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
      </div>
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-1 mt-1">
                  {Array(3)
                    .fill(0)
                    .map((_, j) => (
                      <Skeleton key={j} className="h-5 w-16 rounded-full" />
                    ))}
                </div>
              </div>
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-3 gap-2">
              {Array(6)
                .fill(0)
                .map((_, j) => (
                  <Skeleton key={j} className="h-8" />
                ))}
            </div>
          </div>
        ))}
    </div>
  )
}
