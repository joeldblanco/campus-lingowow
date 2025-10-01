import { UserRole, UserStatus } from '@prisma/client'

export interface UserStats {
  newUsers: {
    count: number
    growthPercentage: number
  }
  activeUsers: number
  roleDistribution: Record<UserRole, number>
}

export const RoleNames: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  TEACHER: 'Profesor',
  STUDENT: 'Estudiante',
  GUEST: 'Invitado',
}

export const StatusNames: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
}
