import { z } from 'zod'
import { SeasonName } from '@/types/academic-period'
import {
  createAcademicPeriod,
  createSeason,
  generatePeriodsForYear,
  getPeriods,
  getPeriodByDate,
  getRelevantPeriods,
  getSeasons,
  setActivePeriod,
  syncAcademicPeriodStatuses,
} from '@/lib/actions/academic-period'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const seasonNameEnum = z.nativeEnum(SeasonName)

export const academicPeriodTools: AnyToolModule[] = [
  {
    name: 'lingowow_academic_periods_list',
    description: 'Lista los períodos académicos de un año. Sincroniza isActive automáticamente según las fechas.',
    scopes: ['mcp:academic-periods:read'],
    inputShape: {
      year: z.number().int().min(2020).max(2100).optional(),
    },
    handler: async ({ year }) => getPeriods(year),
  },

  {
    name: 'lingowow_academic_periods_relevant',
    description: 'Devuelve los períodos relevantes (activo + cercanos en el tiempo). Útil para mostrar contexto temporal.',
    scopes: ['mcp:academic-periods:read'],
    handler: async () => getRelevantPeriods(),
  },

  {
    name: 'lingowow_academic_periods_get_by_date',
    description: 'Devuelve el período académico que contiene una fecha específica.',
    scopes: ['mcp:academic-periods:read'],
    inputShape: {
      date: z.string().describe('YYYY-MM-DD o ISO datetime'),
    },
    handler: async ({ date }) => getPeriodByDate(date),
  },

  {
    name: 'lingowow_academic_periods_seasons_list',
    description: 'Lista todas las temporadas (Winter, Spring, Summer, Fall) con sus rangos de fechas.',
    scopes: ['mcp:academic-periods:read'],
    handler: async () => getSeasons(),
  },

  {
    name: 'lingowow_academic_periods_create',
    description:
      'Crea un período académico. La fecha de fin se calcula automáticamente: 4 semanas (default) o 1 semana si isSpecialWeek=true. Si isActive=true, desactiva los demás períodos.',
    scopes: ['mcp:academic-periods:write'],
    inputShape: {
      name: z.string().min(3),
      startDate: z.string().datetime(),
      seasonId: z.string().min(1),
      isSpecialWeek: z.boolean().default(false),
      isActive: z.boolean().default(false),
    },
    handler: async (args) => {
      const result = await createAcademicPeriod({
        name: args.name,
        startDate: new Date(args.startDate),
        seasonId: args.seasonId,
        isSpecialWeek: args.isSpecialWeek,
        isActive: args.isActive,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_academic_periods_create_season',
    description: 'Crea una temporada (Winter, Spring, Summer, Fall) para un año específico.',
    scopes: ['mcp:academic-periods:write'],
    inputShape: {
      name: seasonNameEnum,
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      year: z.number().int().min(2020).max(2100),
      description: z.string().optional(),
    },
    handler: async (args) => {
      const result = await createSeason({
        name: args.name,
        startDate: new Date(args.startDate),
        endDate: new Date(args.endDate),
        year: args.year,
        description: args.description,
      })
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_academic_periods_generate_year',
    description:
      'Genera automáticamente los períodos académicos de un año completo (4 temporadas × N períodos). Idempotente: no duplica si ya existen.',
    scopes: ['mcp:academic-periods:write'],
    inputShape: {
      year: z.number().int().min(2020).max(2100).optional(),
    },
    handler: async ({ year }) => {
      const result = await generatePeriodsForYear(year)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_academic_periods_set_active',
    description: 'Marca un período como activo y desactiva los demás. Operación administrativa para forzar el período activo.',
    scopes: ['mcp:academic-periods:write'],
    inputShape: { periodId: z.string().min(1) },
    handler: async ({ periodId }) => {
      const result = await setActivePeriod(periodId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_academic_periods_sync_statuses',
    description:
      'Recalcula y sincroniza el flag isActive de todos los períodos según la fecha actual. Idempotente.',
    scopes: ['mcp:academic-periods:write'],
    handler: async () => {
      const result = await syncAcademicPeriodStatuses()
      return unwrapActionResult(result)
    },
  },
]
