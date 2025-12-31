'use client'

import { UserRole } from '@prisma/client'
import {
  AvailabilityRange,
  isTimeSlotInAnyRange,
  isTimeSlotBooked,
  splitTimeSlot,
  formatTimeSlotTo12Hour,
} from '@/lib/utils/calendar'
import { isSlotAvailableForDuration, isSlotOverlappingWithBookings } from '@/lib/utils/booking'

interface TimeSlotWithStudentProps {
  time: string
  day: string
  userRole: UserRole
  teacherAvailability: Record<string, AvailabilityRange[]>
  bookedSlots: Record<string, string[]>
  onClick: () => void
  onMouseEnter?: () => void
  onMouseDown?: () => void
  onMouseUp?: () => void
  studentInfo?: { name: string; color: string; bookingId?: string } | null
  bookingMode?: string // Identificador del modo de reserva (puede ser cualquier string)
  is12HourFormat?: boolean
  showStudentNames?: boolean
}

// Componente TimeSlot con información de estudiante
export function TimeSlotWithStudent({
  time,
  day,
  userRole,
  teacherAvailability,
  bookedSlots,
  onClick,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  studentInfo,
  bookingMode = '40min',
  is12HourFormat = false,
}: TimeSlotWithStudentProps) {
  // Determinar disponibilidad y reserva
  const availabilityRanges = teacherAvailability[day] || []
  const bookedSlotsForDay = bookedSlots[day] || []

  // Duración en minutos según el modo seleccionado (para estudiantes)
  // Extraer la duración directamente del bookingMode si es posible
  let durationMinutes = 60; // Valor por defecto para profesores
  
  if (userRole === UserRole.STUDENT) {
    // Intentar extraer la duración del bookingMode (formato: '40min', '90min', etc.)
    const durationMatch = bookingMode?.match(/^(\d+)min$/);
    if (durationMatch && durationMatch[1]) {
      durationMinutes = parseInt(durationMatch[1], 10);
    } else {
      // Si no se puede extraer, usar valores predeterminados
      durationMinutes = bookingMode === '40min' ? 40 : (bookingMode === '90min' ? 90 : 60);
    }
  }

  // Verificar disponibilidad según duración para estudiantes
  const isAvailable =
    userRole === UserRole.TEACHER
      ? isTimeSlotInAnyRange(time, availabilityRanges)
      : isSlotAvailableForDuration(time, availabilityRanges, durationMinutes)

  // Verificar si está reservado o se superpone con otras reservas (para estudiantes)
  const isBooked =
    userRole === UserRole.TEACHER
      ? isTimeSlotBooked(time, bookedSlotsForDay)
      : isSlotOverlappingWithBookings(time, bookedSlotsForDay, durationMinutes)

  // Para estudiantes, verificar si este slot específico está reservado por ellos
  const isBookedByMe =
    userRole === UserRole.STUDENT &&
    bookedSlotsForDay.some((slot) => {
      const [start] = splitTimeSlot(slot)
      const [thisStart] = splitTimeSlot(time)
      return start === thisStart
    })

  // Determinar estado y estilo del slot
  const getSlotStatus = () => {
    if (userRole === UserRole.TEACHER) {
      // Si hay información de estudiante (de horarios recurrentes o bookings), mostrarla
      if (studentInfo) {
        return {
          label: studentInfo.name,
          className: `flex flex-col items-center justify-center p-2 rounded-md cursor-pointer transition-colors select-none ${studentInfo.color || 'bg-primary/20 hover:bg-primary/30'}`,
        }
      }

      return {
        label: '', // Sin etiqueta para disponible/no disponible
        className: `flex items-center justify-center p-2 rounded-md cursor-pointer transition-colors select-none ${
          isAvailable
            ? 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50'
            : 'text-muted-foreground bg-muted hover:bg-muted/80'
        }`,
      }
    } else {
      // Para estudiantes
      if (!isAvailable) {
        return {
          label: '',
          className:
            'flex items-center justify-center p-2 rounded-md bg-muted text-muted-foreground select-none',
        }
      } else if (isBookedByMe) {
        return {
          label: 'Tu reserva',
          className:
            'flex items-center justify-between p-2 rounded-md bg-primary/20 hover:bg-primary/30 cursor-pointer select-none',
        }
      } else if (isBooked) {
        return {
          label: 'Ocupado',
          className:
            'flex items-center justify-between p-2 rounded-md bg-yellow-100 text-yellow-800 select-none',
        }
      } else {
        return {
          label: '',
          className:
            'flex items-center justify-center p-2 rounded-md bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 cursor-pointer select-none',
        }
      }
    }
  }

  const { label, className } = getSlotStatus()
  const displayTime = is12HourFormat ? formatTimeSlotTo12Hour(time) : time

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {/* Si hay estudiante, mostrar nombre arriba y hora abajo */}
      {label && userRole === UserRole.TEACHER && (
        <>
          <span className="text-xs font-semibold text-center">{label}</span>
          <span className="text-xs text-center opacity-75">{displayTime}</span>
        </>
      )}
      
      {/* Si no hay estudiante o es estudiante, mostrar solo la hora */}
      {(!label || userRole === UserRole.STUDENT) && (
        <span className="font-medium text-sm">{displayTime}</span>
      )}
      
      {/* Para estudiantes, mostrar el label adicional si existe */}
      {label && userRole === UserRole.STUDENT && (
        <span className="text-xs font-medium">{label}</span>
      )}
    </div>
  )
}
