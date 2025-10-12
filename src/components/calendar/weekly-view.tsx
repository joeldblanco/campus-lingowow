'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeSlotWithStudent } from '@/components/calendar/time-slot-with-students'
import { generateTimeSlots, AvailabilityRange, isTimeSlotInAnyRange } from '@/lib/utils/calendar'
import { UserRole } from '@prisma/client'
import { useEffect } from 'react'

interface WeeklyViewProps {
  userRole: UserRole
  teacherAvailability: Record<string, AvailabilityRange[]>
  bookedSlots: Record<string, string[]>
  onSlotAction: (day: string, time: string) => void
  slotDuration: number
  startHour: number
  endHour: number
  isDragging: boolean
  onStartDrag: (day: string, time: string, isAvailable: boolean) => void
  onDrag: (day: string, time: string, isAvailable: boolean) => void
  onEndDrag: () => void
  showStudentNames?: boolean
  getStudentInfo?: (day: string, time: string) => { name: string; color: string } | null
  bookingMode?: '40min' | '90min'
  is12HourFormat?: boolean
}

export function WeeklyView({
  userRole,
  teacherAvailability,
  bookedSlots,
  onSlotAction,
  startHour,
  endHour,
  isDragging,
  onStartDrag,
  onDrag,
  onEndDrag,
  showStudentNames,
  getStudentInfo,
  bookingMode = '40min',
  is12HourFormat = false,
}: WeeklyViewProps) {
  const weekDaysEs = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
  const weekDaysEn = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  // Para profesores, siempre usamos slots de 60 minutos
  // Para estudiantes, usamos slots que empiezan en hora exacta (independientemente de la duración)
  const allTimeSlots = generateTimeSlots(
    userRole === UserRole.TEACHER ? 60 : 60, // Siempre generar slots de 60 min para la visualización
    startHour,
    endHour
  )

  // Listen for mouseup event globally to end dragging even if cursor leaves the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        onEndDrag()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, onEndDrag])

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDaysEs.map((dayEs, index) => {
        const dayEn = weekDaysEn[index]
        const dayRanges = teacherAvailability[dayEn] || []

        return (
          <Card key={dayEn} className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-center">{dayEs}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allTimeSlots.length > 0 ? (
                allTimeSlots.map((time) => {
                  // Solo para uso en onStartDrag y onDrag, determinamos si el slot es actualmente disponible
                  const isAvailable =
                    userRole === UserRole.TEACHER ? isTimeSlotInAnyRange(time, dayRanges) : false

                  const studentInfo =
                    showStudentNames && getStudentInfo ? getStudentInfo(dayEn, time) : null

                  return (
                    <TimeSlotWithStudent
                      key={`${dayEn}-${time}`}
                      time={time}
                      day={dayEn}
                      userRole={userRole}
                      teacherAvailability={teacherAvailability}
                      bookedSlots={bookedSlots}
                      onClick={() => !isDragging && onSlotAction(dayEn, time)}
                      onMouseDown={() =>
                        userRole === UserRole.TEACHER && onStartDrag(dayEn, time, isAvailable)
                      }
                      onMouseEnter={() =>
                        userRole === UserRole.TEACHER &&
                        isDragging &&
                        onDrag(dayEn, time, isAvailable)
                      }
                      onMouseUp={() => userRole === UserRole.TEACHER && onEndDrag()}
                      studentInfo={studentInfo}
                      bookingMode={bookingMode}
                      is12HourFormat={is12HourFormat}
                      showStudentNames={showStudentNames}
                    />
                  )
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  {userRole === UserRole.STUDENT
                    ? 'No hay horarios disponibles'
                    : 'Haz clic para establecer disponibilidad'}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
