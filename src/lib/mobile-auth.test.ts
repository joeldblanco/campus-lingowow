import { describe, it, expect } from 'vitest'
import { hasRole, isStudent, MobileUser } from './mobile-auth'

// Mock UserRole enum since Prisma client is not available in tests
const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
} as const

type UserRole = typeof UserRole[keyof typeof UserRole]

describe('Mobile Auth Utils', () => {
  const mockUserBase: Omit<MobileUser, 'roles'> = {
    id: '123',
    email: 'test@example.com',
    name: 'Test',
    lastName: 'User',
    timezone: 'UTC',
    image: null,
  }

  describe('hasRole', () => {
    it('should return true when user has the target role', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.STUDENT as any] }
      expect(hasRole(user, UserRole.STUDENT as any)).toBe(true)
    })

    it('should return true when user has multiple roles including the target role', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.STUDENT as any, UserRole.TEACHER as any] }
      expect(hasRole(user, UserRole.STUDENT as any)).toBe(true)
      expect(hasRole(user, UserRole.TEACHER as any)).toBe(true)
    })

    it('should return false when user does not have the target role', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.STUDENT as any] }
      expect(hasRole(user, UserRole.ADMIN as any)).toBe(false)
      expect(hasRole(user, UserRole.TEACHER as any)).toBe(false)
    })

    it('should handle empty roles array', () => {
      const user: MobileUser = { ...mockUserBase, roles: [] }
      expect(hasRole(user, UserRole.STUDENT as any)).toBe(false)
    })
  })

  describe('isStudent', () => {
    it('should return true when user has the STUDENT role', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.STUDENT as any] }
      expect(isStudent(user)).toBe(true)
    })

    it('should return true when user has the STUDENT role along with other roles', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.STUDENT as any, UserRole.TEACHER as any] }
      expect(isStudent(user)).toBe(true)
    })

    it('should return false when user does not have the STUDENT role', () => {
      const user: MobileUser = { ...mockUserBase, roles: [UserRole.TEACHER as any] }
      expect(isStudent(user)).toBe(false)

      const adminUser: MobileUser = { ...mockUserBase, roles: [UserRole.ADMIN as any] }
      expect(isStudent(adminUser)).toBe(false)
    })

    it('should return false when user has no roles', () => {
      const user: MobileUser = { ...mockUserBase, roles: [] }
      expect(isStudent(user)).toBe(false)
    })
  })
})
