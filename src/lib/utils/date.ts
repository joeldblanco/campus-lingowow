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
export function createDateWithTime(date: Date | string, hours: number = 0, minutes: number = 0, seconds: number = 0): Date {
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
export function isDateWithinInterval(date: Date | string, start: Date | string, end: Date | string): boolean {
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
  return new Date(Date.UTC(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    dateObj.getHours(),
    dateObj.getMinutes(),
    dateObj.getSeconds()
  ))
}

/**
 * Convierte una fecha UTC a hora local del navegador
 * Útil para mostrar fechas al usuario
 */
export function fromUTCDate(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Date(dateObj.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
}

/**
 * Obtiene la fecha actual en UTC
 */
export function getCurrentUTCDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ))
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
 * @param day - Fecha en formato YYYY-MM-DD (en hora local)
 * @param timeSlot - Horario en formato HH:MM-HH:MM (en hora local)
 * @returns Objeto con day y timeSlot en UTC
 */
export function convertTimeSlotToUTC(day: string, timeSlot: string): { day: string; timeSlot: string } {
  const [startTime, endTime] = timeSlot.split('-')
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const [year, month, dayOfMonth] = day.split('-').map(Number)

  // Crear fechas en hora local
  const startLocal = new Date(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0)
  const endLocal = new Date(year, month - 1, dayOfMonth, endHour, endMinute, 0, 0)

  // Obtener componentes UTC
  const utcStartYear = startLocal.getUTCFullYear()
  const utcStartMonth = String(startLocal.getUTCMonth() + 1).padStart(2, '0')
  const utcStartDay = String(startLocal.getUTCDate()).padStart(2, '0')
  const utcStartHour = String(startLocal.getUTCHours()).padStart(2, '0')
  const utcStartMinute = String(startLocal.getUTCMinutes()).padStart(2, '0')

  const utcEndHour = String(endLocal.getUTCHours()).padStart(2, '0')
  const utcEndMinute = String(endLocal.getUTCMinutes()).padStart(2, '0')

  return {
    day: `${utcStartYear}-${utcStartMonth}-${utcStartDay}`,
    timeSlot: `${utcStartHour}:${utcStartMinute}-${utcEndHour}:${utcEndMinute}`
  }
}

/**
 * Convierte un timeSlot de UTC a hora local
 * @param day - Fecha en formato YYYY-MM-DD (en UTC)
 * @param timeSlot - Horario en formato HH:MM-HH:MM (en UTC)
 * @returns Objeto con day y timeSlot en hora local
 */
export function convertTimeSlotFromUTC(day: string, timeSlot: string): { day: string; timeSlot: string } {
  const [startTime, endTime] = timeSlot.split('-')
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const [year, month, dayOfMonth] = day.split('-').map(Number)

  // Crear fechas en UTC
  const startUTC = new Date(Date.UTC(year, month - 1, dayOfMonth, startHour, startMinute, 0, 0))
  const endUTC = new Date(Date.UTC(year, month - 1, dayOfMonth, endHour, endMinute, 0, 0))

  // Obtener componentes en hora local
  const localStartYear = startUTC.getFullYear()
  const localStartMonth = String(startUTC.getMonth() + 1).padStart(2, '0')
  const localStartDay = String(startUTC.getDate()).padStart(2, '0')
  const localStartHour = String(startUTC.getHours()).padStart(2, '0')
  const localStartMinute = String(startUTC.getMinutes()).padStart(2, '0')

  const localEndHour = String(endUTC.getHours()).padStart(2, '0')
  const localEndMinute = String(endUTC.getMinutes()).padStart(2, '0')

  return {
    day: `${localStartYear}-${localStartMonth}-${localStartDay}`,
    timeSlot: `${localStartHour}:${localStartMinute}-${localEndHour}:${localEndMinute}`
  }
}
