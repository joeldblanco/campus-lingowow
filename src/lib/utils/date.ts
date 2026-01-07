/**
 * Utilidades para manejo de fechas usando date-fns
 * Centraliza todas las operaciones de fecha para evitar problemas de zona horaria
 */

import {
  parseISO,
  format,
  getDay,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isBefore,
  isAfter,
  isSameDay,
  differenceInDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  getMonth,
  getYear,
  isWithinInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'

/**
 * Parsea una fecha en formato ISO (YYYY-MM-DD) a objeto Date
 */
export function parseDateString(dateString: string): Date {
  return parseISO(dateString)
}

/**
 * Formatea una fecha a string ISO (YYYY-MM-DD)
 */
export function formatToISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Formatea una fecha para mostrar en español
 * Ejemplo: "viernes, 3 de octubre de 2025"
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Formatea una fecha para mostrar en español (formato corto)
 * Ejemplo: "3 de octubre de 2025"
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Obtiene el día de la semana (0 = domingo, 6 = sábado)
 */
export function getDayOfWeek(date: Date | string): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return getDay(dateObj)
}

/**
 * Obtiene el nombre del día de la semana en minúsculas (en inglés)
 */
export function getDayName(date: Date | string): string {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return dayNames[getDayOfWeek(date)]
}

/**
 * Genera un array de fechas entre dos fechas (inclusive)
 */
export function getDateRange(startDate: string, endDate: string): Date[] {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  return eachDayOfInterval({ start, end })
}

/**
 * Filtra fechas por día de la semana
 */
export function filterByDayOfWeek(dates: Date[], dayNumbers: number[]): Date[] {
  return dates.filter((date) => dayNumbers.includes(getDay(date)))
}

/**
 * Convierte nombre de día (en inglés) a número
 */
export function dayNameToNumber(dayName: string): number {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  return dayMap[dayName.toLowerCase()] ?? -1
}

/**
 * Crea una fecha con hora específica (útil para evitar problemas de zona horaria)
 */
export function createDateWithTime(
  date: Date | string,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0
): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return setMilliseconds(setSeconds(setMinutes(setHours(dateObj, hours), minutes), seconds), 0)
}

/**
 * Obtiene el inicio del día (00:00:00)
 */
export function getStartOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return startOfDay(dateObj)
}

/**
 * Obtiene el fin del día (23:59:59.999)
 */
export function getEndOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return endOfDay(dateObj)
}

/**
 * Suma días a una fecha
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return addDays(dateObj, days)
}

/**
 * Suma semanas a una fecha
 */
export function addWeeksToDate(date: Date | string, weeks: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return addWeeks(dateObj, weeks)
}

/**
 * Suma meses a una fecha
 */
export function addMonthsToDate(date: Date | string, months: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return addMonths(dateObj, months)
}

/**
 * Verifica si una fecha está antes que otra
 */
export function isBeforeDate(date: Date | string, dateToCompare: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
  return isBefore(dateObj, compareObj)
}

/**
 * Verifica si una fecha está después que otra
 */
export function isAfterDate(date: Date | string, dateToCompare: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
  return isAfter(dateObj, compareObj)
}

/**
 * Verifica si dos fechas son el mismo día
 */
export function isSameDayDate(date: Date | string, dateToCompare: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
  return isSameDay(dateObj, compareObj)
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function getDaysDifference(date: Date | string, dateToCompare: Date | string): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
  return differenceInDays(dateObj, compareObj)
}

/**
 * Obtiene el mes de una fecha (0-11)
 */
export function getMonthNumber(date: Date | string): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return getMonth(dateObj)
}

/**
 * Obtiene el año de una fecha
 */
export function getYearNumber(date: Date | string): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return getYear(dateObj)
}

/**
 * Crea una fecha a partir de año, mes y día
 */
export function createDate(year: number, month: number, day: number = 1): Date {
  // month es 0-indexed en JavaScript (0 = enero, 11 = diciembre)
  return new Date(year, month, day)
}

/**
 * Obtiene el inicio del año
 */
export function getStartOfYear(year: number): Date {
  return startOfYear(new Date(year, 0, 1))
}

/**
 * Obtiene el fin del año
 */
export function getEndOfYear(year: number): Date {
  return endOfYear(new Date(year, 11, 31))
}

/**
 * Obtiene el inicio del mes
 */
export function getStartOfMonth(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return startOfMonth(dateObj)
}

/**
 * Obtiene el fin del mes
 */
export function getEndOfMonth(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return endOfMonth(dateObj)
}

/**
 * Verifica si una fecha está dentro de un intervalo
 */
export function isDateWithinInterval(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const startObj = typeof start === 'string' ? parseISO(start) : start
  const endObj = typeof end === 'string' ? parseISO(end) : end
  return isWithinInterval(dateObj, { start: startObj, end: endObj })
}

/**
 * Formatea una fecha en formato numérico (DD/MM/YYYY)
 */
export function formatDateNumeric(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy')
}

/**
 * Formatea una fecha con hora (DD/MM/YYYY HH:mm)
 */
export function formatDateWithTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es })
}

/**
 * Obtiene la fecha actual (útil para tests y consistencia)
 */
export function getCurrentDate(): Date {
  return new Date()
}

/**
 * Obtiene la fecha actual al inicio del día
 */
export function getTodayStart(): Date {
  return startOfDay(new Date())
}

/**
 * Obtiene la fecha actual al fin del día
 */
export function getTodayEnd(): Date {
  return endOfDay(new Date())
}

// =============================================
// UTILIDADES PARA MANEJO DE UTC
// =============================================

/**
 * Convierte una fecha local a UTC manteniendo la misma hora
 * Ejemplo: Si son las 14:00 en tu zona, se guarda como 14:00 UTC
 * Útil para fechas que representan "días" sin considerar zona horaria
 */
export function toUTCDate(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return new Date(
    Date.UTC(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      dateObj.getHours(),
      dateObj.getMinutes(),
      dateObj.getSeconds()
    )
  )
}

/**
 * Convierte una fecha UTC a hora local del navegador
 * Útil para mostrar fechas al usuario
 */
export function fromUTCDate(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Date(
    dateObj.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  )
}

/**
 * Obtiene la fecha actual en UTC
 */
export function getCurrentUTCDate(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )
  )
}

/**
 * Obtiene el inicio del día en UTC (00:00:00 UTC)
 * Útil para comparaciones con fechas de la DB que están en UTC
 */
export function getStartOfDayUTC(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    )
  )
}

/**
 * Obtiene el fin del día en UTC (23:59:59.999 UTC)
 * Útil para comparaciones con fechas de la DB que están en UTC
 */
export function getEndOfDayUTC(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999
    )
  )
}

/**
 * Convierte una fecha string YYYY-MM-DD a UTC Date (inicio del día en UTC)
 * Útil para guardar fechas de clases en la DB
 */
export function dateStringToUTC(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * Convierte una fecha UTC a string YYYY-MM-DD
 * Útil para mostrar fechas en inputs de tipo date
 */
export function utcDateToString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getUTCFullYear()
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formatea una fecha UTC para mostrar en la zona horaria local del usuario
 * Ejemplo: "viernes, 3 de octubre de 2025"
 */
export function formatUTCDateLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Formatea una fecha UTC con hora en la zona horaria local
 * Ejemplo: "03/10/2025 14:30"
 */
export function formatUTCDateWithTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es })
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD (en la zona horaria local)
 * Útil para comparaciones y valores por defecto en inputs
 */
export function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Compara si una fecha (string YYYY-MM-DD) es hoy en la zona horaria local
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayString()
}

/**
 * Compara si una fecha (string YYYY-MM-DD) es pasada en la zona horaria local
 */
export function isPastDate(dateString: string): boolean {
  return dateString < getTodayString()
}

/**
 * Compara si una fecha (string YYYY-MM-DD) es futura en la zona horaria local
 */
export function isFutureDate(dateString: string): boolean {
  return dateString > getTodayString()
}

// =============================================
// UTILIDADES PARA CONVERSIÓN DE TIMESLOT
// =============================================

/**
 * Convierte un timeSlot de hora local a UTC
 * @param day - Fecha en formato YYYY-MM-DD (en hora local del usuario)
 * @param timeSlot - Horario en formato HH:MM-HH:MM (en hora local del usuario)
 * @param timezone - Zona horaria del usuario (default: America/Lima)
 * @returns Objeto con day y timeSlot en UTC
 */
export function convertTimeSlotToUTC(
  day: string,
  timeSlot: string,
  timezone: string = 'America/Lima'
): { day: string; timeSlot: string } {
  const [startTime, endTime] = timeSlot.split('-')
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  // Crear string ISO con la hora local y parsear considerando la zona horaria
  // Formato: YYYY-MM-DDTHH:mm:ss
  const startISOString = `${day}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`
  const endISOString = `${day}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`

  // fromZonedTime convierte una fecha en una zona horaria específica a UTC
  const startUTC = fromZonedTime(startISOString, timezone)
  const endUTC = fromZonedTime(endISOString, timezone)

  // Obtener componentes UTC
  const utcStartYear = startUTC.getUTCFullYear()
  const utcStartMonth = String(startUTC.getUTCMonth() + 1).padStart(2, '0')
  const utcStartDay = String(startUTC.getUTCDate()).padStart(2, '0')
  const utcStartHour = String(startUTC.getUTCHours()).padStart(2, '0')
  const utcStartMinute = String(startUTC.getUTCMinutes()).padStart(2, '0')

  const utcEndHour = String(endUTC.getUTCHours()).padStart(2, '0')
  const utcEndMinute = String(endUTC.getUTCMinutes()).padStart(2, '0')

  return {
    day: `${utcStartYear}-${utcStartMonth}-${utcStartDay}`,
    timeSlot: `${utcStartHour}:${utcStartMinute}-${utcEndHour}:${utcEndMinute}`,
  }
}

/**
 * Convierte un timeSlot de UTC a hora local
 * @param day - Fecha en formato YYYY-MM-DD (en UTC)
 * @param timeSlot - Horario en formato HH:MM-HH:MM (en UTC)
 * @param timezone - Zona horaria del usuario (default: America/Lima)
 * @returns Objeto con day y timeSlot en hora local del usuario
 */
export function convertTimeSlotFromUTC(
  day: string,
  timeSlot: string,
  timezone: string = 'America/Lima'
): { day: string; timeSlot: string } {
  const [startTime, endTime] = timeSlot.split('-')
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  // Crear fechas UTC
  const startUTC = new Date(Date.UTC(
    parseInt(day.split('-')[0]),
    parseInt(day.split('-')[1]) - 1,
    parseInt(day.split('-')[2]),
    startHour,
    startMinute,
    0,
    0
  ))
  const endUTC = new Date(Date.UTC(
    parseInt(day.split('-')[0]),
    parseInt(day.split('-')[1]) - 1,
    parseInt(day.split('-')[2]),
    endHour,
    endMinute,
    0,
    0
  ))

  // Convertir a la zona horaria del usuario usando date-fns-tz
  const localStart = toZonedTime(startUTC, timezone)
  const localEnd = toZonedTime(endUTC, timezone)

  // Formatear los componentes
  const localStartYear = localStart.getFullYear()
  const localStartMonth = String(localStart.getMonth() + 1).padStart(2, '0')
  const localStartDay = String(localStart.getDate()).padStart(2, '0')
  const localStartHour = String(localStart.getHours()).padStart(2, '0')
  const localStartMinute = String(localStart.getMinutes()).padStart(2, '0')

  const localEndHour = String(localEnd.getHours()).padStart(2, '0')
  const localEndMinute = String(localEnd.getMinutes()).padStart(2, '0')

  return {
    day: `${localStartYear}-${localStartMonth}-${localStartDay}`,
    timeSlot: `${localStartHour}:${localStartMinute}-${localEndHour}:${localEndMinute}`,
  }
}

// =============================================
// UTILIDADES PARA ZONA HORARIA (NUEVO)
// =============================================

/**
 * Convierte un horario recurrente (dayOfWeek + time) de hora local a UTC
 * Usa una fecha de referencia para calcular el offset correcto (considera DST)
 * 
 * @param dayOfWeek - Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) en hora local
 * @param startTime - Hora de inicio en formato HH:MM (hora local)
 * @param endTime - Hora de fin en formato HH:MM (hora local)
 * @param timezone - Zona horaria del usuario (ej: 'America/Lima')
 * @param referenceDate - Fecha de referencia para calcular offset (default: hoy)
 * @returns Objeto con dayOfWeek, startTime y endTime en UTC
 */
export function convertRecurringScheduleToUTC(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  timezone: string = 'America/Lima',
  referenceDate: Date = new Date()
): { dayOfWeek: number; startTime: string; endTime: string } {
  // Encontrar la próxima fecha que corresponda a ese día de la semana
  const refDay = referenceDate.getDay()
  let daysUntilTarget = dayOfWeek - refDay
  if (daysUntilTarget < 0) daysUntilTarget += 7
  
  const targetDate = new Date(referenceDate)
  targetDate.setDate(targetDate.getDate() + daysUntilTarget)
  const dateStr = format(targetDate, 'yyyy-MM-dd')
  
  // Usar convertTimeSlotToUTC para la conversión
  const utcData = convertTimeSlotToUTC(dateStr, `${startTime}-${endTime}`, timezone)
  
  // Extraer el día de la semana UTC de la fecha convertida
  const [year, month, day] = utcData.day.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const utcDayOfWeek = utcDate.getUTCDay()
  
  const [utcStartTime, utcEndTime] = utcData.timeSlot.split('-')
  
  return {
    dayOfWeek: utcDayOfWeek,
    startTime: utcStartTime,
    endTime: utcEndTime,
  }
}

/**
 * Convierte un horario recurrente (dayOfWeek + time) de UTC a hora local
 * Usa una fecha de referencia para calcular el offset correcto (considera DST)
 * 
 * @param dayOfWeek - Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) en UTC
 * @param startTime - Hora de inicio en formato HH:MM (UTC)
 * @param endTime - Hora de fin en formato HH:MM (UTC)
 * @param timezone - Zona horaria del usuario (ej: 'America/Lima')
 * @param referenceDate - Fecha de referencia para calcular offset (default: hoy)
 * @returns Objeto con dayOfWeek, startTime y endTime en hora local
 */
export function convertRecurringScheduleFromUTC(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  timezone: string = 'America/Lima',
  referenceDate: Date = new Date()
): { dayOfWeek: number; startTime: string; endTime: string } {
  // Encontrar la próxima fecha UTC que corresponda a ese día de la semana
  const refDay = referenceDate.getUTCDay()
  let daysUntilTarget = dayOfWeek - refDay
  if (daysUntilTarget < 0) daysUntilTarget += 7
  
  const targetDate = new Date(referenceDate)
  targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilTarget)
  const dateStr = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.getUTCDate()).padStart(2, '0')}`
  
  // Usar convertTimeSlotFromUTC para la conversión
  const localData = convertTimeSlotFromUTC(dateStr, `${startTime}-${endTime}`, timezone)
  
  // Extraer el día de la semana local de la fecha convertida
  const [year, month, day] = localData.day.split('-').map(Number)
  const localDate = new Date(year, month - 1, day, 12, 0, 0)
  const localDayOfWeek = localDate.getDay()
  
  const [localStartTime, localEndTime] = localData.timeSlot.split('-')
  
  return {
    dayOfWeek: localDayOfWeek,
    startTime: localStartTime,
    endTime: localEndTime,
  }
}

/**
 * Convierte un día de la semana en texto a número y viceversa
 */
export const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export const DAY_NUMBER_TO_NAME: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/**
 * Convierte disponibilidad (day name + time) de hora local a UTC
 */
export function convertAvailabilityToUTC(
  dayName: string,
  startTime: string,
  endTime: string,
  timezone: string = 'America/Lima'
): { day: string; startTime: string; endTime: string } {
  const dayOfWeek = DAY_NAME_TO_NUMBER[dayName.toLowerCase()]
  if (dayOfWeek === undefined) {
    throw new Error(`Invalid day name: ${dayName}`)
  }
  
  const utcData = convertRecurringScheduleToUTC(dayOfWeek, startTime, endTime, timezone)
  
  return {
    day: DAY_NUMBER_TO_NAME[utcData.dayOfWeek],
    startTime: utcData.startTime,
    endTime: utcData.endTime,
  }
}

/**
 * Convierte disponibilidad (day name + time) de UTC a hora local
 */
export function convertAvailabilityFromUTC(
  dayName: string,
  startTime: string,
  endTime: string,
  timezone: string = 'America/Lima'
): { day: string; startTime: string; endTime: string } {
  const dayOfWeek = DAY_NAME_TO_NUMBER[dayName.toLowerCase()]
  if (dayOfWeek === undefined) {
    throw new Error(`Invalid day name: ${dayName}`)
  }
  
  const localData = convertRecurringScheduleFromUTC(dayOfWeek, startTime, endTime, timezone)
  
  return {
    day: DAY_NUMBER_TO_NAME[localData.dayOfWeek],
    startTime: localData.startTime,
    endTime: localData.endTime,
  }
}

/**
 * Formatea una fecha en la zona horaria especificada
 */
export function formatInTimeZone(date: Date | string, formatStr: string, timeZone: string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatTz(dateObj, formatStr, { timeZone, locale: es })
}

/**
 * Convierte una fecha UTC (u otra) a la zona horaria especificada
 * Devuelve un objeto Date que representa la hora en esa zona
 */
export function convertToTimeZone(date: Date | string, timeZone: string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(dateObj, timeZone)
}

/**
 * Combina una fecha (YYYY-MM-DD) y hora (HH:mm) UTC a un objeto Date
 */
export function combineDateAndTimeUTC(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
}
