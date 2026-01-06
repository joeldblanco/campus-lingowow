// =============================================
// TIPOS PARA EL MÓDULO DE ANALYTICS
// =============================================

// Período de tiempo para filtros
export type DateRange = {
  from: Date
  to: Date
}

export type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'custom'

// =============================================
// KPIs PRINCIPALES
// =============================================

export interface KPIData {
  value: number
  previousValue: number
  change: number // Porcentaje de cambio
  changeType: 'increase' | 'decrease' | 'neutral'
}

export interface DashboardKPIs {
  // Ingresos
  monthlyRevenue: KPIData
  projectedRevenue: number
  
  // Gastos (pagos a profesores)
  monthlyExpenses: KPIData
  projectedExpenses: number
  
  // Margen
  netMargin: KPIData
  
  // Estudiantes
  newStudents: KPIData
  totalActiveStudents: number
  retentionRate: KPIData
  churnRate: number
  
  // Clases
  totalClasses: KPIData
  completedClasses: number
  cancelledClasses: number
  noShowClasses: number
}

// =============================================
// ANÁLISIS DE INGRESOS
// =============================================

export interface MonthlyRevenue {
  month: string // "Ene", "Feb", etc.
  year: number
  revenue: number
  invoiceCount: number
}

export interface RevenueByProduct {
  productId: string
  productName: string
  revenue: number
  salesCount: number
  percentage: number
}

export interface RevenueByPlan {
  planId: string
  planName: string
  productName: string
  revenue: number
  salesCount: number
  percentage: number
}

export interface RevenueByLanguage {
  language: string
  languageLabel: string
  revenue: number
  salesCount: number
  percentage: number
}

export interface RevenueByPaymentMethod {
  method: string
  methodLabel: string
  revenue: number
  count: number
  percentage: number
}

export interface CouponUsage {
  couponId: string
  couponCode: string
  couponName: string | null
  usageCount: number
  totalDiscount: number
}

export interface RevenueAnalytics {
  monthlyRevenue: MonthlyRevenue[]
  bestMonth: MonthlyRevenue | null
  worstMonth: MonthlyRevenue | null
  byProduct: RevenueByProduct[]
  byPlan: RevenueByPlan[]
  byLanguage: RevenueByLanguage[]
  byPaymentMethod: RevenueByPaymentMethod[]
  averageTicket: number
  totalRevenue: number
  couponUsage: CouponUsage[]
  totalDiscounts: number
}

// =============================================
// ANÁLISIS DE GASTOS
// =============================================

export interface TeacherPayment {
  teacherId: string
  teacherName: string
  teacherImage: string | null
  totalClasses: number
  totalHours: number
  totalPayment: number
  averagePerClass: number
  rankName: string | null
  rateMultiplier: number
}

export interface MonthlyExpense {
  month: string
  year: number
  totalPayments: number
  classCount: number
  teacherCount: number
}

export interface ExpenseAnalytics {
  monthlyExpenses: MonthlyExpense[]
  teacherPayments: TeacherPayment[]
  totalExpenses: number
  projectedExpenses: number
  averageCostPerClass: number
  totalIncentives: number
}

// =============================================
// ANÁLISIS DE PRODUCTOS Y PLANES
// =============================================

export interface ProductSales {
  productId: string
  productName: string
  productImage: string | null
  totalSales: number
  revenue: number
  trend: number // % cambio vs período anterior
}

export interface PlanSales {
  planId: string
  planName: string
  productName: string
  totalSales: number
  revenue: number
  conversionRate: number // % de usuarios que eligen este plan
}

export interface CourseEnrollments {
  courseId: string
  courseTitle: string
  courseLanguage: string
  totalEnrollments: number
  activeEnrollments: number
  completedEnrollments: number
}

export interface ProductAnalytics {
  topProducts: ProductSales[]
  planDistribution: PlanSales[]
  courseEnrollments: CourseEnrollments[]
  salesTrend: { date: string; sales: number }[]
}

// =============================================
// ANÁLISIS DE PROFESORES
// =============================================

export interface TeacherStats {
  teacherId: string
  teacherName: string
  teacherImage: string | null
  teacherRank: string | null
  totalClasses: number
  completedClasses: number
  cancelledClasses: number
  noShowClasses: number
  attendanceRate: number
  totalHours: number
  totalEarnings: number
  uniqueStudents: number
  averageClassDuration: number
}

export interface TeacherRanking {
  byClasses: TeacherStats[]
  byEarnings: TeacherStats[]
  byStudents: TeacherStats[]
  mostActive: TeacherStats[]
  leastActive: TeacherStats[]
}

export interface TeacherAnalytics {
  ranking: TeacherRanking
  totalTeachers: number
  activeTeachers: number
  averageClassesPerTeacher: number
  averageEarningsPerTeacher: number
}

// =============================================
// ANÁLISIS DE ESTUDIANTES
// =============================================

export interface StudentGrowth {
  month: string
  year: number
  newStudents: number
  totalStudents: number
  churnedStudents: number
}

export interface StudentActivity {
  studentId: string
  studentName: string
  studentImage: string | null
  totalClasses: number
  completedClasses: number
  lastClassDate: string | null
  enrollmentDate: string
  courseName: string
  progress: number
}

export interface StudentAnalytics {
  growth: StudentGrowth[]
  retentionRate: number
  churnRate: number
  averageLifetime: number // Días promedio como estudiante activo
  mostActive: StudentActivity[]
  inactive: StudentActivity[] // Sin clases en los últimos 30 días
  totalStudents: number
  activeStudents: number
  newThisMonth: number
}

// =============================================
// PROYECCIONES Y FORECASTING
// =============================================

export interface Projection {
  month: string
  year: number
  projectedRevenue: number
  projectedExpenses: number
  projectedNetMargin: number
  projectedStudents: number
  confidence: number // 0-100%
}

export interface Seasonality {
  month: string
  averageRevenue: number
  averageStudents: number
  isHighSeason: boolean
}

export interface TrendAlert {
  type: 'warning' | 'danger' | 'info'
  metric: string
  message: string
  change: number
  recommendation: string
}

export interface ProjectionAnalytics {
  projections: Projection[]
  seasonality: Seasonality[]
  alerts: TrendAlert[]
  yearOverYearGrowth: number
}

// =============================================
// HISTÓRICOS
// =============================================

export interface HistoricalComparison {
  currentPeriod: {
    revenue: number
    expenses: number
    students: number
    classes: number
  }
  previousPeriod: {
    revenue: number
    expenses: number
    students: number
    classes: number
  }
  changes: {
    revenue: number
    expenses: number
    students: number
    classes: number
  }
}

// =============================================
// FILTROS Y EXPORTACIÓN
// =============================================

export interface AnalyticsFilters {
  dateRange: DateRange
  timeFrame: TimeFrame
  productIds?: string[]
  planIds?: string[]
  teacherIds?: string[]
  courseIds?: string[]
  languages?: string[]
}

export type ExportFormat = 'excel' | 'pdf' | 'csv'

export interface ExportOptions {
  format: ExportFormat
  sections: string[]
  dateRange: DateRange
  includeCharts: boolean
}
