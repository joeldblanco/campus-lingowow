/**
 * Utilidades para validar el acceso a las clases según horario y rol
 */

import { convertTimeSlotFromUTC } from '@/lib/utils/date'

export interface ClassAccessValidation {
  canAccess: boolean
  reason?: string
  minutesUntilStart?: number
  minutesUntilEnd?: number
  secondsUntilStart?: number
  secondsUntilEnd?: number
}

/**
 * Valida si un usuario puede acceder a una clase según su rol y el horario
 * @param day - Fecha de la clase en formato ISO (YYYY-MM-DD) en UTC
 * @param timeSlot - Horario de la clase (ej: "14:00-15:00") en UTC
 * @param isTeacher - Si el usuario es profesor
 * @returns Objeto con información de acceso
 */
export function validateClassAccess(
  day: string,
  timeSlot: string,
  isTeacher: boolean
): ClassAccessValidation {
  try {
    // Convertir de UTC a hora local para validar
    const localData = convertTimeSlotFromUTC(day, timeSlot)
    
    // Parsear el timeSlot local para obtener hora de inicio y fin
    const [startTime, endTime] = localData.timeSlot.split('-')
    if (!startTime || !endTime) {
      return { canAccess: false, reason: 'Horario de clase inválido' }
    }

    // Crear objetos Date para la fecha y hora de la clase en hora local
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    // Obtener la fecha actual en hora local
    const now = new Date()
    
    // Parsear el día local (YYYY-MM-DD) y crear fecha en hora local
    const [year, month, dayOfMonth] = localData.day.split('-').map(Number)
    
    // Crear fecha de inicio de la clase en hora local
    const classStartDate = new Date(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0)

    // Crear fecha de fin de la clase en hora local
    const classEndDate = new Date(year, month - 1, dayOfMonth, endHour, endMinute, 0, 0)

    // Calcular diferencias en minutos y segundos
    const millisecondsUntilStart = classStartDate.getTime() - now.getTime()
    const millisecondsUntilEnd = classEndDate.getTime() - now.getTime()
    
    const minutesUntilStart = Math.floor(millisecondsUntilStart / (1000 * 60))
    const minutesUntilEnd = Math.floor(millisecondsUntilEnd / (1000 * 60))
    
    const secondsUntilStart = Math.floor(millisecondsUntilStart / 1000)
    const secondsUntilEnd = Math.floor(millisecondsUntilEnd / 1000)

    // Si la clase ya terminó, nadie puede acceder
    if (minutesUntilEnd < 0) {
      return {
        canAccess: false,
        reason: 'La clase ya ha finalizado',
        minutesUntilStart,
        minutesUntilEnd,
        secondsUntilStart,
        secondsUntilEnd,
      }
    }

    // Profesores pueden acceder 10 minutos antes
    if (isTeacher) {
      if (minutesUntilStart > 10) {
        const waitMinutes = minutesUntilStart - 10
        const hours = Math.floor(waitMinutes / 60)
        const mins = waitMinutes % 60
        
        let reason = 'Faltan '
        if (hours > 0) {
          reason += `${hours} ${hours === 1 ? 'hora' : 'horas'}`
          if (mins > 0) reason += ` y ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`
        } else {
          reason += `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`
        }
        reason += ' para poder acceder a la clase'
        
        return {
          canAccess: false,
          reason,
          minutesUntilStart,
          minutesUntilEnd,
          secondsUntilStart,
          secondsUntilEnd,
        }
      }
      return {
        canAccess: true,
        minutesUntilStart,
        minutesUntilEnd,
        secondsUntilStart,
        secondsUntilEnd,
      }
    }

    // Estudiantes solo pueden acceder desde la hora de inicio
    if (secondsUntilStart > 0) {
      // Calcular horas, minutos y segundos restantes
      const hours = Math.floor(secondsUntilStart / 3600)
      const mins = Math.floor((secondsUntilStart % 3600) / 60)
      const secs = secondsUntilStart % 60
      
      // Construir mensaje de forma natural
      let reason = 'La clase comenzará en '
      if (hours > 0) {
        reason += `${hours} ${hours === 1 ? 'hora' : 'horas'}, `
      }
      if (mins > 0 || hours > 0) {
        reason += `${mins} ${mins === 1 ? 'minuto' : 'minutos'} y `
      }
      reason += `${secs} ${secs === 1 ? 'segundo' : 'segundos'}`
      
      return {
        canAccess: false,
        reason,
        minutesUntilStart,
        minutesUntilEnd,
        secondsUntilStart,
        secondsUntilEnd,
      }
    }

    return {
      canAccess: true,
      minutesUntilStart,
      minutesUntilEnd,
      secondsUntilStart,
      secondsUntilEnd,
    }
  } catch (error) {
    console.error('Error validating class access:', error)
    return { canAccess: false, reason: 'Error al validar el acceso a la clase' }
  }
}

/**
 * Verifica si faltan 5 minutos o menos para que termine la clase
 */
export function shouldShowEndWarning(minutesUntilEnd: number): boolean {
  return minutesUntilEnd > 0 && minutesUntilEnd <= 5
}
