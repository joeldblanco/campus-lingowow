/**
 * Utilidades para validar el acceso a las clases según horario y rol
 */

export interface ClassAccessValidation {
  canAccess: boolean
  reason?: string
  minutesUntilStart?: number
  minutesUntilEnd?: number
  secondsUntilStart?: number
  secondsUntilEnd?: number
}

/**
 * Valida si un usuario puede acceder a una clase según su rol y el horario.
 *
 * `day` y `timeSlot` ya vienen en UTC, por lo que el instante absoluto de la clase
 * queda totalmente determinado y la comparación con la hora actual es independiente
 * de la zona horaria. NO se debe derivar la hora de la clase a partir de una zona de
 * visualización: antes se convertía a la hora local y se reconstruía con
 * `new Date(año, mes, …)`, que interpreta esos números en la zona del ENTORNO de
 * ejecución (el navegador). Durante una suplantación la zona del usuario suplantado
 * (p. ej. Venezuela, GMT-4) difería de la del admin (p. ej. Perú, GMT-5), lo que
 * desplazaba la hora de la clase una hora y bloqueaba el ingreso.
 *
 * @param day - Fecha de la clase en formato ISO (YYYY-MM-DD) en UTC
 * @param timeSlot - Horario de la clase (ej: "14:00-15:00") en UTC
 * @param isTeacher - Si el usuario es profesor
 * @param timezone - Obsoleto: ya no influye en el resultado. Se conserva por
 *   compatibilidad con las llamadas existentes.
 * @returns Objeto con información de acceso
 */
export function validateClassAccess(
  day: string,
  timeSlot: string,
  isTeacher: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timezone: string = 'America/Lima'
): ClassAccessValidation {
  try {
    // Parsear inicio y fin (en UTC) directamente del timeSlot.
    const [startTime, endTime] = timeSlot.split('-')
    if (!startTime || !endTime) {
      return { canAccess: false, reason: 'Horario de clase inválido' }
    }

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    const [year, month, dayOfMonth] = day.split('-').map(Number)

    if (
      [year, month, dayOfMonth, startHour, startMinute, endHour, endMinute].some((value) =>
        Number.isNaN(value)
      )
    ) {
      return { canAccess: false, reason: 'Horario de clase inválido' }
    }

    // Instantes absolutos (UTC) de inicio y fin de la clase.
    const classStartDate = new Date(Date.UTC(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0))
    const classEndDate = new Date(Date.UTC(year, month - 1, dayOfMonth, endHour, endMinute, 0, 0))

    // Hora actual (instante absoluto).
    const now = new Date()

    // Calcular diferencias en minutos y segundos
    const millisecondsUntilStart = classStartDate.getTime() - now.getTime()
    const millisecondsUntilEnd = classEndDate.getTime() - now.getTime()
    
    const minutesUntilStart = Math.floor(millisecondsUntilStart / (1000 * 60))
    const minutesUntilEnd = Math.floor(millisecondsUntilEnd / (1000 * 60))
    
    const secondsUntilStart = Math.floor(millisecondsUntilStart / 1000)
    const secondsUntilEnd = Math.floor(millisecondsUntilEnd / 1000)

    // La clase ya terminó: nadie (profesor ni estudiante) puede acceder.
    if (secondsUntilEnd <= 0) {
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

/**
 * Decide si se debe seguir mostrando el aula (manteniendo la sesión de LiveKit
 * montada) para un usuario que ya está dentro.
 *
 * `validateClassAccess` es una compuerta de ENTRADA: decide si alguien puede
 * empezar una clase según el horario. NO debe usarse para EXPULSAR a quien ya
 * entró: el aula solo se cierra de forma manual. Antes, la página revalidaba el
 * acceso cada segundo y, en el instante exacto del fin (`secondsUntilEnd <= 0`),
 * `canAccess` pasaba a `false`, lo que desmontaba el aula y desconectaba a ambos
 * participantes a la vez (p. ej. 19:39:59 y 19:40:00).
 *
 * Una vez que el usuario entró (`hasJoined`), permanece dentro aunque el reloj
 * cruce la hora de fin. Quien nunca entró (clase aún no empieza, o ya terminó
 * antes de abrir el aula) sigue bloqueado por `canAccessNow`.
 *
 * @param canAccessNow - Resultado actual de `validateClassAccess(...).canAccess`.
 * @param hasJoined - Si el usuario ya obtuvo acceso al aula en algún momento.
 */
export function shouldRemainInClassroom(canAccessNow: boolean, hasJoined: boolean): boolean {
  return hasJoined || canAccessNow
}
