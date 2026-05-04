import { z } from 'zod'
import {
  getCohortAnalytics,
  getDashboardKPIs,
  getExpenseAnalytics,
  getFinancialHealth,
  getHistoricalComparison,
  getProductAnalytics,
  getProjectedPayrollAnalytics,
  getProjectionAnalytics,
  getRevenueAnalytics,
  getScheduleHeatmap,
  getStudentAnalytics,
  getStudentLTV,
  getTeacherAnalytics,
} from '@/lib/actions/analytics'
import {
  getActiveSubscriptionsCount,
  getMonthlyRevenue,
  getProductSalesCount,
  getRevenueByMonth,
  getTotalRevenue,
} from '@/lib/actions/commercial'
import type { AnyToolModule } from '@/lib/mcp/types'

const dateRangeShape = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const analyticsTools: AnyToolModule[] = [
  {
    name: 'lingowow_analytics_dashboard_kpis',
    description:
      'KPIs principales del dashboard admin: ingresos, gastos, estudiantes activos, profesores, conversión, churn. Compara contra período anterior.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      dateRange: dateRangeShape.optional(),
    },
    handler: async ({ dateRange }) =>
      getDashboardKPIs(
        dateRange
          ? {
              from: dateRange.startDate ? new Date(dateRange.startDate) : new Date(0),
              to: dateRange.endDate ? new Date(dateRange.endDate) : new Date(),
            }
          : undefined
      ),
  },

  {
    name: 'lingowow_analytics_revenue',
    description:
      'Análisis de ingresos: serie mensual, desglose por producto/plan/idioma/método de pago, uso de cupones. months controla el rango (default 12).',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      months: z.number().int().min(1).max(60).optional().default(12),
    },
    handler: async ({ months }) => getRevenueAnalytics(months),
  },

  {
    name: 'lingowow_analytics_expenses',
    description: 'Análisis de gastos mensuales (incluye pagos a profesores). months controla el rango.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      months: z.number().int().min(1).max(60).optional().default(12),
    },
    handler: async ({ months }) => getExpenseAnalytics(months),
  },

  {
    name: 'lingowow_analytics_products',
    description: 'Performance de productos y planes (ventas, ingresos, conversión).',
    scopes: ['mcp:analytics:read'],
    handler: async () => getProductAnalytics(),
  },

  {
    name: 'lingowow_analytics_teachers',
    description: 'Métricas por profesor (clases dictadas, horas, rating, retención de estudiantes, ingresos generados).',
    scopes: ['mcp:analytics:read'],
    handler: async () => getTeacherAnalytics(),
  },

  {
    name: 'lingowow_analytics_students',
    description: 'Crecimiento y actividad de estudiantes en los últimos N meses.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      months: z.number().int().min(1).max(60).optional().default(12),
    },
    handler: async ({ months }) => getStudentAnalytics(months),
  },

  {
    name: 'lingowow_analytics_projections',
    description: 'Proyecciones financieras de ingresos/gastos basadas en tendencias históricas, con alertas y estacionalidad.',
    scopes: ['mcp:analytics:read'],
    handler: async () => getProjectionAnalytics(),
  },

  {
    name: 'lingowow_analytics_financial_health',
    description: 'Indicadores de salud financiera: margen, runway, ratios y warning signals.',
    scopes: ['mcp:analytics:read'],
    handler: async () => getFinancialHealth(),
  },

  {
    name: 'lingowow_analytics_historical_comparison',
    description: 'Compara KPIs (ingresos, gastos, estudiantes) entre dos rangos de fechas explícitos.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      currentStart: z.string().datetime(),
      currentEnd: z.string().datetime(),
      previousStart: z.string().datetime(),
      previousEnd: z.string().datetime(),
    },
    handler: async ({ currentStart, currentEnd, previousStart, previousEnd }) =>
      getHistoricalComparison(
        new Date(currentStart),
        new Date(currentEnd),
        new Date(previousStart),
        new Date(previousEnd)
      ),
  },

  {
    name: 'lingowow_analytics_cohorts',
    description: 'Análisis de cohortes (retención por mes de adquisición). monthsBack controla la profundidad histórica.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      monthsBack: z.number().int().min(1).max(36).optional().default(12),
    },
    handler: async ({ monthsBack }) => getCohortAnalytics(monthsBack),
  },

  {
    name: 'lingowow_analytics_student_ltv',
    description: 'Lifetime value por estudiante: ingresos totales, clases tomadas, antigüedad.',
    scopes: ['mcp:analytics:read'],
    handler: async () => getStudentLTV(),
  },

  {
    name: 'lingowow_analytics_schedule_heatmap',
    description: 'Heatmap de uso del horario (clases por día/hora) para los últimos N meses.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      monthsBack: z.number().int().min(1).max(12).optional().default(3),
    },
    handler: async ({ monthsBack }) => getScheduleHeatmap(monthsBack),
  },

  {
    name: 'lingowow_analytics_projected_payroll',
    description:
      'Proyección de nómina (pago a profesores) para un mes específico. Considera todas las clases programadas no canceladas. Default: mes actual.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      month: z.string().datetime().optional().describe('Fecha cualquiera dentro del mes a proyectar'),
    },
    handler: async ({ month }) => getProjectedPayrollAnalytics(month ? new Date(month) : undefined),
  },

  // Atajos comerciales útiles para el agente
  {
    name: 'lingowow_analytics_total_revenue',
    description: 'Ingresos totales acumulados (todas las facturas pagadas).',
    scopes: ['mcp:analytics:read'],
    handler: async () => getTotalRevenue(),
  },

  {
    name: 'lingowow_analytics_monthly_revenue',
    description: 'Ingresos de un mes/año específico.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
    },
    handler: async ({ year, month }) => getMonthlyRevenue(year, month),
  },

  {
    name: 'lingowow_analytics_revenue_by_month',
    description: 'Serie mensual de ingresos para un año completo.',
    scopes: ['mcp:analytics:read'],
    inputShape: {
      year: z.number().int().min(2020).max(2100),
    },
    handler: async ({ year }) => getRevenueByMonth(year),
  },

  {
    name: 'lingowow_analytics_active_subscriptions',
    description: 'Conteo de suscripciones activas.',
    scopes: ['mcp:analytics:read'],
    handler: async () => getActiveSubscriptionsCount(),
  },

  {
    name: 'lingowow_analytics_product_sales',
    description: 'Conteo de ventas por producto.',
    scopes: ['mcp:analytics:read'],
    handler: async () => getProductSalesCount(),
  },
]
