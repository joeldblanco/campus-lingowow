'use client'

import { TimeSlotWithStudent } from '@/components/calendar/time-slot-with-students'
import { AvailabilityRange, generateTimeSlots, isTimeSlotInAnyRange } from '@/lib/utils/calendar'
import { UserRole } from '@prisma/client'

interface DayContentProps {
  day: string
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
  is12HourFormat?: boolean
}

export function DayContent({
  day,
  userRole,
  teacherAvailability,
  bookedSlots,
  onSlotAction,
  slotDuration,
  startHour,
  endHour,
  isDragging,
  onStartDrag,
  onDrag,
  onEndDrag,
  showStudentNames,
  getStudentInfo,
  is12HourFormat = false,
}: DayContentProps) {
  const allTimeSlots = generateTimeSlots(slotDuration, startHour, endHour)
  const availabilityForDay = teacherAvailability[day] || []

  return (
    <div className="space-y-2">
      {allTimeSlots.length > 0 ? (
        allTimeSlots.map((time) => {
          // La disponibilidad y reserva ahora se determinan dentro del componente TimeSlotWithStudent
          const isAvailable =
            userRole === UserRole.TEACHER ? isTimeSlotInAnyRange(time, availabilityForDay) : false // Para uso en onStartDrag y onDrag solamente

          const studentInfo = showStudentNames && getStudentInfo ? getStudentInfo(day, time) : null

          return (
            <TimeSlotWithStudent
              key={`${day}-${time}`}
              time={time}
              day={day}
              userRole={userRole}
              teacherAvailability={teacherAvailability}
              bookedSlots={bookedSlots}
              onClick={() => !isDragging && onSlotAction(day, time)}
              onMouseDown={() =>
                userRole === UserRole.TEACHER && onStartDrag(day, time, isAvailable)
              }
              onMouseEnter={() =>
                userRole === UserRole.TEACHER && isDragging && onDrag(day, time, isAvailable)
              }
              onMouseUp={() => userRole === UserRole.TEACHER && onEndDrag()}
              studentInfo={studentInfo}
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
    </div>
  )
}
