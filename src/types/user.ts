import { UserRole, UserStatus } from '@prisma/client'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: Date
}

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
