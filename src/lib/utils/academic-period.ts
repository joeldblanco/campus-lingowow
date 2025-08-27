import { ClassPackageType, PackageClassCount, SeasonName } from '@/types/academic-period'
import { AcademicPeriod } from '@prisma/client'
import { endOfDay, startOfDay } from 'date-fns'

/**
 * Genera períodos académicos y temporadas según el modelo de Prisma para un año específico
 * @param {number} year - Año para el que se generarán los períodos
 * @param {boolean} setCurrentPeriodActive - Si true, establece el período actual como activo
 * @returns {Object} - Objeto con períodos académicos y temporadas en formato Prisma
 */
export function generateAcademicPeriodsForYear(
  year: number,
  setCurrentPeriodActive: boolean = true
) {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)
  const today = new Date()

  // Estructuras temporales para cálculos
  const periodRanges = []
  const looseWeekRanges = []
  const seasonRanges = []

  // 1. Generar períodos de 4 semanas
  const currentMonth = startDate
  while (currentMonth <= endDate) {
    // Encontrar el primer lunes del mes
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const dayOfWeek = firstDayOfMonth.getDay() // 0 = domingo, 1 = lunes, ...
    const daysToAdd = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const firstMonday = new Date(firstDayOfMonth)
    firstMonday.setDate(firstDayOfMonth.getDate() + daysToAdd)

    // Calcular fin del período (28 días después)
    const periodEnd = new Date(firstMonday)
    periodEnd.setDate(firstMonday.getDate() + 27)

    // Añadir el período
    periodRanges.push({
      start: firstMonday,
      end: periodEnd,
    })

    // Avanzar al siguiente mes
    currentMonth.setMonth(currentMonth.getMonth() + 1)
  }

  // 2. Identificar semanas sueltas
  const currentWeekStart = new Date(year, 0, 1)
  // Ajustar al primer lunes del año si no empieza en lunes
  if (currentWeekStart.getDay() !== 1) {
    const daysUntilMonday = currentWeekStart.getDay() === 0 ? 1 : 8 - currentWeekStart.getDay()
    currentWeekStart.setDate(currentWeekStart.getDate() + daysUntilMonday)
  }

  while (currentWeekStart <= endDate) {
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Una semana completa

    // Verificar si esta semana está incluida en algún período
    let isIncludedInPeriod = false

    for (const period of periodRanges) {
      // Si la semana está completamente dentro de un período
      if (currentWeekStart >= period.start && currentWeekEnd <= period.end) {
        isIncludedInPeriod = true
        break
      }
    }

    // Si la semana no está incluida en ningún período, es una semana suelta
    if (!isIncludedInPeriod && currentWeekEnd <= endDate) {
      looseWeekRanges.push({
        start: new Date(currentWeekStart),
        end: new Date(currentWeekEnd),
      })
    }

    // Avanzar a la siguiente semana
    currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  }

  // 3. Construir temporadas
  if (looseWeekRanges.length > 0) {
    // Obtener los nombres de las temporadas
    const seasonNames = Object.values(SeasonName)

    // Primera temporada (desde inicio del año hasta la primera semana suelta, inclusive)
    seasonRanges.push({
      number: 1,
      name: `${seasonNames[0]}`,
      start: periodRanges[0].start,
      end: looseWeekRanges[0].end,
    })

    // Temporadas intermedias
    for (let i = 1; i < looseWeekRanges.length; i++) {
      const currentLooseWeek = looseWeekRanges[i]
      const previousLooseWeek = looseWeekRanges[i - 1]

      seasonRanges.push({
        number: i + 1,
        name: `${seasonNames[i]}`,
        start: new Date(previousLooseWeek.end.getTime() + 86400000), // Día siguiente a la semana suelta anterior
        end: currentLooseWeek.end,
      })
    }

    // Última temporada (desde la última semana suelta hasta fin de año)
    seasonRanges.push({
      number: looseWeekRanges.length + 1,
      name: `${seasonNames[looseWeekRanges.length]}`,
      start: new Date(looseWeekRanges[looseWeekRanges.length - 1].end.getTime() + 86400000),
      end: periodRanges[periodRanges.length - 1].end,
    })
  } else {
    // Si no hay semanas sueltas, todo el año es una temporada
    seasonRanges.push({
      number: 1,
      name: `Temporada Aurora`,
      start: periodRanges[0].start,
      end: periodRanges[periodRanges.length - 1].end,
    })
  }

  // 4. Convertir al formato de modelo Prisma

  // Crear temporadas (Seasons)
  const seasons = seasonRanges.map((season, index) => ({
    id: `season-${year}-${index + 1}`,
    name: season.name,
    startDate: season.start,
    endDate: season.end,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  // Crear períodos académicos (tanto regulares como semanas sueltas)
  const academicPeriods: AcademicPeriod[] = []

  // Añadir períodos regulares
  periodRanges.forEach((period, index) => {
    // Encontrar la temporada a la que pertenece este período
    const season = seasons.find(
      (s) =>
        (period.start >= s.startDate && period.start <= s.endDate) ||
        (period.end >= s.startDate && period.end <= s.endDate)
    )

    // Determinar si este período está activo (contiene la fecha actual)
    const isActive = setCurrentPeriodActive && today >= period.start && today <= period.end

    academicPeriods.push({
      id: `period-${year}-regular-${index + 1}`,
      name: `Período ${index + 1}`,
      startDate: period.start,
      endDate: period.end,
      seasonId: season ? season.id : seasons[0].id,
      isSpecialWeek: false,
      isActive: isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  // Añadir semanas sueltas
  looseWeekRanges.forEach((week, index) => {
    // Encontrar la temporada a la que pertenece esta semana suelta
    const season = seasons.find((s) => week.start >= s.startDate && week.end <= s.endDate)

    // Determinar si esta semana suelta está activa (contiene la fecha actual)
    const isActive = setCurrentPeriodActive && today >= week.start && today <= week.end

    academicPeriods.push({
      id: `period-${year}-special-${index + 1}`,
      name: `Semana Especial ${index + 1}`,
      startDate: week.start,
      endDate: week.end,
      seasonId: season ? season.id : seasons[0].id,
      isSpecialWeek: true,
      isActive: isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  return {
    academicPeriods,
    seasons,
  }
}

/**
 * Calcula el costo de un paquete de clases basado en el tipo y si es prorrateado
 * @param packageType Tipo de paquete
 * @param isProrated Si es prorrateado
 * @param proratedClasses Número de clases prorrateadas
 * @param basePrice Precio base por clase
 */
export function calculatePackagePrice(
  packageType: ClassPackageType,
  isProrated: boolean,
  proratedClasses: number,
  basePrice: number
): number {
  // Descuentos por volumen (ajustar según política de la academia)
  const discounts = {
    [ClassPackageType.BASIC]: 0, // Sin descuento
    [ClassPackageType.STANDARD]: 0.05, // 5% de descuento
    [ClassPackageType.INTENSIVE]: 0.1, // 10% de descuento
    [ClassPackageType.CUSTOM]: 0, // Sin descuento para prorrateados
  }

  // Si es prorrateado, usamos el número específico de clases
  const classCount = isProrated ? proratedClasses : PackageClassCount[packageType]

  // Aplicar descuento si no es prorrateado
  const discount = !isProrated ? discounts[packageType] : 0
  const pricePerClass = basePrice * (1 - discount)

  // Calcular precio total
  return pricePerClass * classCount
}

/**
 * Verifica si una fecha está dentro de un período académico
 * @param date Fecha a verificar
 * @param period Período académico
 */
export function isDateInPeriod(date: Date, period: AcademicPeriod): boolean {
  const checkDate = startOfDay(date)
  const periodStart = startOfDay(period.startDate)
  const periodEnd = endOfDay(period.endDate)

  return checkDate >= periodStart && checkDate <= periodEnd
}

/**
 * Obtiene el período académico actual
 * @param periods Lista de todos los períodos
 */
export function getCurrentPeriod(periods: AcademicPeriod[]): AcademicPeriod | null {
  const now = new Date()
  return periods.find((period) => isDateInPeriod(now, period)) || null
}

/**
 * Obtiene el nombre del mes en español
 * @param monthNumber Número de mes (1-12)
 */
export function getMonthName(monthNumber: number): string {
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  return monthNames[monthNumber - 1]
}

/**
 * Calcula la fecha de inicio del período (primer lunes del mes)
 * @param year Año del período
 * @param month Mes del período (1-12)
 */
export function getFirstMondayOfMonth(year: number, month: number): Date {
  // El mes en JavaScript es 0-indexed (0-11)
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const dayOfWeek = firstDayOfMonth.getDay() // 0 = Domingo, 1 = Lunes, ...

  // Calculamos cuántos días hay que sumar para llegar al primer lunes
  // Si es lunes (1), sumamos 0; si es martes (2), sumamos 6, etc.
  const daysToAdd = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7

  const firstMonday = new Date(year, month - 1, 1 + daysToAdd)
  return firstMonday
}
