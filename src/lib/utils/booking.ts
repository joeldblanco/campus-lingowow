// Funciones para manejar reservas de diferentes duraciones

import { AvailabilityRange, timeToMinutes, splitTimeSlot } from '@/lib/utils/calendar'

// Verifica si un slot está completamente disponible para la duración especificada
export function isSlotAvailableForDuration(
  timeSlot: string,
  availabilityRanges: AvailabilityRange[],
  durationMinutes: number
): boolean {
  if (!availabilityRanges || availabilityRanges.length === 0) {
    return false
  }

  // Obtener el horario de inicio del slot
  const [startTime] = splitTimeSlot(timeSlot)
  const startMinutes = timeToMinutes(startTime)

  // Calcular el tiempo final según la duración
  const endMinutes = startMinutes + durationMinutes
  //   const endHour = Math.floor(endMinutes / 60)
  //   const endMinute = endMinutes % 60
  //   const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

  // Verificar si el rango completo está dentro de alguna disponibilidad
  return availabilityRanges.some((range) => {
    const rangeStartMinutes = timeToMinutes(range.startTime)
    const rangeEndMinutes = timeToMinutes(range.endTime)

    return startMinutes >= rangeStartMinutes && endMinutes <= rangeEndMinutes
  })
}

// Verifica si un slot está reservado o se superpone con alguna reserva existente
export function isSlotOverlappingWithBookings(
  timeSlot: string,
  bookedSlots: string[],
  durationMinutes: number
): boolean {
  if (!bookedSlots || bookedSlots.length === 0) {
    return false
  }

  // Obtener horario de inicio y calcular el final basado en la duración
  const [startTime] = splitTimeSlot(timeSlot)
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = startMinutes + durationMinutes

  // Verificar si hay superposición con alguna reserva existente
  return bookedSlots.some((bookedSlot) => {
    // Validar que bookedSlot exista y tenga formato válido
    if (!bookedSlot || typeof bookedSlot !== 'string') {
      return false
    }
    
    const [bookedStart, bookedEnd] = splitTimeSlot(bookedSlot)
    
    // Validar que bookedStart y bookedEnd existan
    if (!bookedStart || !bookedEnd) {
      return false
    }
    
    const bookedStartMinutes = timeToMinutes(bookedStart)
    const bookedEndMinutes = timeToMinutes(bookedEnd)

    // Hay superposición si:
    // El inicio del nuevo slot es < el fin de una reserva existente Y
    // El fin del nuevo slot es > el inicio de una reserva existente
    return startMinutes < bookedEndMinutes && endMinutes > bookedStartMinutes
  })
}

// Genera un time slot con la duración especificada
export function generateTimeSlotWithDuration(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = startMinutes + durationMinutes

  const endHour = Math.floor(endMinutes / 60)
  const endMinute = endMinutes % 60
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

  return `${startTime}-${endTime}`
}
