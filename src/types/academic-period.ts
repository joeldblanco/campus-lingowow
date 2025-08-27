import { User } from '@prisma/client'

// Enum para paquetes de clases
export enum ClassPackageType {
  BASIC = 'basic', // 8 clases (2 por semana)
  STANDARD = 'standard', // 12 clases (3 por semana)
  INTENSIVE = 'intensive', // 16 clases (4 por semana)
  CUSTOM = 'custom', // Personalizado (prorrateado)
}

// Nombres visualizables de los paquetes
export const PackageNames: Record<ClassPackageType, string> = {
  [ClassPackageType.BASIC]: 'Básico (8 clases)',
  [ClassPackageType.STANDARD]: 'Estándar (12 clases)',
  [ClassPackageType.INTENSIVE]: 'Intensivo (16 clases)',
  [ClassPackageType.CUSTOM]: 'Personalizado',
}

// Cantidad de clases por tipo de paquete
export const PackageClassCount: Record<ClassPackageType, number> = {
  [ClassPackageType.BASIC]: 8,
  [ClassPackageType.STANDARD]: 12,
  [ClassPackageType.INTENSIVE]: 16,
  [ClassPackageType.CUSTOM]: 0, // Se define al momento de crear
}

// Enum para nombres de temporadas
export enum SeasonName {
  AWAKENING = 'Despertar',
  ADVENTURE = 'Aventura',
  JOURNEY = 'Travesía',
  DESTINATION = 'Destino',
}

// Nombres visualizables de temporadas
export const SeasonDisplayNames: Record<SeasonName, string> = {
  [SeasonName.AWAKENING]: `Temporada ${SeasonName.AWAKENING}`,
  [SeasonName.JOURNEY]: `Temporada ${SeasonName.AWAKENING}`,
  [SeasonName.ADVENTURE]: `Temporada ${SeasonName.AWAKENING}`,
  [SeasonName.DESTINATION]: `Temporada ${SeasonName.AWAKENING}`,
}

export enum LevelName {
  EXPLORER = 'Explorador',
  ADVENTURER = 'Aventurero',
  TRAVELER = 'Viajero',
  NOMAD = 'Nómada',
  PILGRIM = 'Péregrino',
  HERO = 'Héroe',
}

// Enum para fuentes de créditos de estudiante
export enum CreditSource {
  ROLLOVER = 'rollover', // Créditos de clases no utilizadas
  PERFECT_ATTENDANCE = 'perfect_attendance', // Asistencia perfecta
  MODULES_COMPLETION = 'modules_completion', // Completar módulos
  REFERRAL = 'referral', // Referidos
  SPECIAL_WEEK = 'special_week', // Participación en semanas especiales
  RENEWAL = 'renewal', // Renovación consecutiva
  ADMIN_GRANT = 'admin_grant', // Otorgado por administrador
}

// Enum para usos de créditos
export enum CreditUsage {
  CLASS = 'class', // Clase adicional
  DISCOUNT = 'discount', // Descuento en renovación
  MATERIALS = 'materials', // Materiales exclusivos
  GROUP_SESSION = 'group_session', // Sesión grupal temática
  PREMIUM_TEACHER = 'premium_teacher', // Clase con profesor premium
}

// Enum para tipos de incentivos de profesor
export enum IncentiveType {
  RETENTION = 'retention', // Por alta retención de estudiantes
  PERFECT_ATTENDANCE = 'perfect_attendance', // Asistencia perfecta
  SPECIAL_ACTIVITIES = 'special_activities', // Actividades especiales
  RANK_BONUS = 'rank_bonus', // Bono por rango
  GROWTH = 'growth', // Crecimiento en horas
}

// Enum para rangos de profesor
export enum TeacherRankLevel {
  BASIC = 1,
  CERTIFIED = 2,
  SENIOR = 3,
  MASTER = 4,
}

// Tipo para estadísticas de período (no está en Prisma)
export interface PeriodStats {
  totalStudents: number
  totalClasses: number
  attendanceRate: number
  packageDistribution: Record<ClassPackageType, number>
}

// Tipo para interfaz de configuración de sistema (no está en Prisma)
export interface SystemSettings {
  maxCreditsPerPeriod: number
  creditExpiryPeriods: number
  incentivePercentages: {
    retentionTier1: number // 80%+ retención
    retentionTier2: number // 90%+ retención
    perfectAttendance: number
    growth: number
  }
}

// Tipos de utilidad para trabajar con los modelos de Prisma
// Ejemplo de cómo extender un tipo Prisma si fuera necesario:

export type UserWithRankDetails = User & {
  rankDetails?: {
    nextRank: string
    progressPercentage: number
    missingRequirements: string[]
  }
}
