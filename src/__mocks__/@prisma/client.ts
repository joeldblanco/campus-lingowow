// Mock Prisma Client for testing
export const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export const PrismaClient = class PrismaClient {}
