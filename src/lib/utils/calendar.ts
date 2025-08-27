import { UserRole } from '@prisma/client'

// Tipo para representar rangos de disponibilidad del profesor
export interface AvailabilityRange {
  startTime: string // formato "HH:MM"
  endTime: string // formato "HH:MM"
}

// Función modificada para generar slots que comienzan en horas exactas
export function generateTimeSlots(
  slotDuration: number,
  startHour: number = 8,
  endHour: number = 16.5
) {
  const timeSlots: string[] = []
  const formatTime = (hour: number, minute: number) => {
    return `${Math.floor(hour).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Recorrer cada hora del rango
  for (let hour = Math.floor(startHour); hour < Math.ceil(endHour); hour++) {
    // Solo crear un slot por hora que comience en punto (minuto 0)
    const startMinute = 0

    // Comprobar que la hora de inicio está dentro del rango
    if (hour < startHour) continue

    // Calcular hora y minuto final
    const endTimeMinutes = hour * 60 + startMinute + slotDuration
    const endHourValue = Math.floor(endTimeMinutes / 60)
    const endMinuteValue = endTimeMinutes % 60

    // Comprobar que la hora final no excede el rango
    const endTimeInMinutes = endHourValue * 60 + endMinuteValue
    const endHourInMinutes = endHour * 60 + (endHour % 1 === 0.5 ? 30 : 0)

    if (endTimeInMinutes <= endHourInMinutes) {
      const timeSlot = `${formatTime(hour, startMinute)}-${formatTime(endHourValue, endMinuteValue)}`
      timeSlots.push(timeSlot)
    }
  }

  return timeSlots
}

// Convertir hora (HH:MM) a minutos desde medianoche
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Dividir un slot "09:00-10:30" en ["09:00", "10:30"]
export function splitTimeSlot(timeSlot: string): [string, string] {
  const [start, end] = timeSlot.split('-')
  return [start, end]
}

// Convertir time slot a minutos desde medianoche
export function timeSlotToMinutes(timeSlot: string): { start: number; end: number } {
  const [start, end] = splitTimeSlot(timeSlot)
  return {
    start: timeToMinutes(start),
    end: timeToMinutes(end),
  }
}

// Verificar si un slot está dentro de algún rango de disponibilidad
export function isTimeSlotInAnyRange(
  timeSlot: string,
  availabilityRanges: AvailabilityRange[]
): boolean {
  if (!availabilityRanges || availabilityRanges.length === 0) {
    return false
  }

  const slotMinutes = timeSlotToMinutes(timeSlot)

  // Un slot está disponible si está completamente dentro de algún rango
  return availabilityRanges.some((range) => {
    const rangeStartMinutes = timeToMinutes(range.startTime)
    const rangeEndMinutes = timeToMinutes(range.endTime)

    // El slot está dentro del rango si:
    // Su inicio es >= al inicio del rango Y su fin es <= al fin del rango
    return slotMinutes.start >= rangeStartMinutes && slotMinutes.end <= rangeEndMinutes
  })
}

// Verificar si un slot está reservado
export function isTimeSlotBooked(timeSlot: string, bookedSlots: string[]): boolean {
  if (!bookedSlots || bookedSlots.length === 0) {
    return false
  }

  const slotMinutes = timeSlotToMinutes(timeSlot)

  // Verificar si el slot se superpone con alguna reserva
  return bookedSlots.some((bookedSlot) => {
    const bookedMinutes = timeSlotToMinutes(bookedSlot)

    // Hay superposición si:
    // El inicio del slot es < el fin de la reserva Y el fin del slot es > el inicio de la reserva
    return slotMinutes.start < bookedMinutes.end && slotMinutes.end > bookedMinutes.start
  })
}

// Filtrar slots de tiempo disponibles
export function filterAvailableTimeSlots(
  allTimeSlots: string[],
  availabilityRanges: AvailabilityRange[],
  userRole: UserRole
): string[] {
  // Para profesores, mostrar todos los slots
  if (userRole === UserRole.TEACHER) {
    return allTimeSlots
  }

  // Para estudiantes, solo mostrar slots donde haya disponibilidad
  if (availabilityRanges && availabilityRanges.length > 0) {
    return allTimeSlots.filter((slot) => isTimeSlotInAnyRange(slot, availabilityRanges))
  }

  return []
}

// Convertir los timeSlots del formato antiguo a rangos de disponibilidad
export function convertSlotsToRanges(timeSlots: string[]): AvailabilityRange[] {
  if (!timeSlots || timeSlots.length === 0) return []

  // Ordenar slots por hora de inicio
  const sortedSlots = [...timeSlots].sort((a, b) => {
    const startA = timeSlotToMinutes(a).start
    const startB = timeSlotToMinutes(b).start
    return startA - startB
  })

  const ranges: AvailabilityRange[] = []
  let currentRange: AvailabilityRange | null = null

  sortedSlots.forEach((slot) => {
    const [start, end] = splitTimeSlot(slot)

    if (!currentRange) {
      currentRange = { startTime: start, endTime: end }
    } else {
      // Si este slot comienza exactamente donde terminó el anterior, extender el rango
      if (currentRange.endTime === start) {
        currentRange.endTime = end
      } else {
        // Si hay una brecha, guardar el rango actual y comenzar uno nuevo
        ranges.push(currentRange)
        currentRange = { startTime: start, endTime: end }
      }
    }
  })

  // Agregar el último rango
  if (currentRange) {
    ranges.push(currentRange)
  }

  return ranges
}

// Función para fusionar rangos superpuestos
export function mergeOverlappingRanges(ranges: AvailabilityRange[]): AvailabilityRange[] {
  if (!ranges || ranges.length <= 1) return ranges

  // Ordenar rangos por hora de inicio
  const sortedRanges = [...ranges].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  )

  const mergedRanges: AvailabilityRange[] = []
  let currentRange = sortedRanges[0]

  for (let i = 1; i < sortedRanges.length; i++) {
    const range = sortedRanges[i]
    const currentEndMinutes = timeToMinutes(currentRange.endTime)
    const nextStartMinutes = timeToMinutes(range.startTime)

    // Si hay superposición o los rangos son contiguos
    if (nextStartMinutes <= currentEndMinutes) {
      // Extender el rango actual si es necesario
      if (timeToMinutes(range.endTime) > currentEndMinutes) {
        currentRange.endTime = range.endTime
      }
    } else {
      // No hay superposición, guardar el rango actual e iniciar uno nuevo
      mergedRanges.push(currentRange)
      currentRange = range
    }
  }

  // Añadir el último rango
  mergedRanges.push(currentRange)

  return mergedRanges
}
