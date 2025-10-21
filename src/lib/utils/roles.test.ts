import { describe, it, expect } from 'vitest'
import {
  hasRole,
  getHighestPriorityRole,
  hasPermission,
  canAccessAdmin,
  canAccessTeacher,
  canAccessStudent,
  canAccessEditor,
  getRoleNames,
} from './roles'

// Mock UserRole enum since Prisma client is not available in tests
const UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
} as const

type UserRole = typeof UserRole[keyof typeof UserRole]

describe('Role Utils - hasRole', () => {
  it('should return true when user has the target role', () => {
    const roles = [UserRole.STUDENT, UserRole.TEACHER]
    expect(hasRole(roles, UserRole.STUDENT)).toBe(true)
    expect(hasRole(roles, UserRole.TEACHER)).toBe(true)
  })

  it('should return false when user does not have the target role', () => {
    const roles = [UserRole.STUDENT]
    expect(hasRole(roles, UserRole.ADMIN)).toBe(false)
    expect(hasRole(roles, UserRole.TEACHER)).toBe(false)
  })

  it('should handle empty roles array', () => {
    const roles: UserRole[] = []
    expect(hasRole(roles, UserRole.STUDENT)).toBe(false)
  })
})

describe('Role Utils - getHighestPriorityRole', () => {
  it('should return ADMIN as highest priority', () => {
    const roles = [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]
    expect(getHighestPriorityRole(roles)).toBe(UserRole.ADMIN)
  })

  it('should return EDITOR when no ADMIN present', () => {
    const roles = [UserRole.STUDENT, UserRole.EDITOR, UserRole.TEACHER]
    expect(getHighestPriorityRole(roles)).toBe(UserRole.EDITOR)
  })

  it('should return TEACHER when only TEACHER and STUDENT present', () => {
    const roles = [UserRole.STUDENT, UserRole.TEACHER]
    expect(getHighestPriorityRole(roles)).toBe(UserRole.TEACHER)
  })

  it('should return STUDENT when only STUDENT present', () => {
    const roles = [UserRole.STUDENT]
    expect(getHighestPriorityRole(roles)).toBe(UserRole.STUDENT)
  })

  it('should return GUEST when only GUEST present', () => {
    const roles = [UserRole.GUEST]
    expect(getHighestPriorityRole(roles)).toBe(UserRole.GUEST)
  })

  it('should return GUEST for empty roles array', () => {
    const roles: UserRole[] = []
    expect(getHighestPriorityRole(roles)).toBe(UserRole.GUEST)
  })

  it('should handle priority order correctly: ADMIN > EDITOR > TEACHER > STUDENT > GUEST', () => {
    expect(getHighestPriorityRole([UserRole.GUEST, UserRole.ADMIN])).toBe(UserRole.ADMIN)
    expect(getHighestPriorityRole([UserRole.STUDENT, UserRole.EDITOR])).toBe(UserRole.EDITOR)
    expect(getHighestPriorityRole([UserRole.GUEST, UserRole.TEACHER])).toBe(UserRole.TEACHER)
    expect(getHighestPriorityRole([UserRole.GUEST, UserRole.STUDENT])).toBe(UserRole.STUDENT)
  })
})

describe('Role Utils - hasPermission', () => {
  it('should return true when user has at least one required role', () => {
    const userRoles = [UserRole.STUDENT, UserRole.TEACHER]
    const requiredRoles = [UserRole.TEACHER, UserRole.ADMIN]
    expect(hasPermission(userRoles, requiredRoles)).toBe(true)
  })

  it('should return false when user has none of the required roles', () => {
    const userRoles = [UserRole.STUDENT]
    const requiredRoles = [UserRole.TEACHER, UserRole.ADMIN]
    expect(hasPermission(userRoles, requiredRoles)).toBe(false)
  })

  it('should return true when user has all required roles', () => {
    const userRoles = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]
    const requiredRoles = [UserRole.TEACHER, UserRole.ADMIN]
    expect(hasPermission(userRoles, requiredRoles)).toBe(true)
  })

  it('should handle empty required roles', () => {
    const userRoles = [UserRole.STUDENT]
    const requiredRoles: UserRole[] = []
    expect(hasPermission(userRoles, requiredRoles)).toBe(false)
  })
})

describe('Role Utils - Access Control Functions', () => {
  describe('canAccessAdmin', () => {
    it('should return true for ADMIN role', () => {
      expect(canAccessAdmin([UserRole.ADMIN])).toBe(true)
    })

    it('should return true for ADMIN with other roles', () => {
      expect(canAccessAdmin([UserRole.STUDENT, UserRole.ADMIN])).toBe(true)
    })

    it('should return false for non-ADMIN roles', () => {
      expect(canAccessAdmin([UserRole.TEACHER])).toBe(false)
      expect(canAccessAdmin([UserRole.STUDENT])).toBe(false)
      expect(canAccessAdmin([UserRole.EDITOR])).toBe(false)
      expect(canAccessAdmin([UserRole.GUEST])).toBe(false)
    })

    it('should return false for empty roles', () => {
      expect(canAccessAdmin([])).toBe(false)
    })
  })

  describe('canAccessTeacher', () => {
    it('should return true for TEACHER role', () => {
      expect(canAccessTeacher([UserRole.TEACHER])).toBe(true)
    })

    it('should return true for ADMIN role (admins can access teacher routes)', () => {
      expect(canAccessTeacher([UserRole.ADMIN])).toBe(true)
    })

    it('should return true for TEACHER and ADMIN together', () => {
      expect(canAccessTeacher([UserRole.TEACHER, UserRole.ADMIN])).toBe(true)
    })

    it('should return false for non-TEACHER/ADMIN roles', () => {
      expect(canAccessTeacher([UserRole.STUDENT])).toBe(false)
      expect(canAccessTeacher([UserRole.EDITOR])).toBe(false)
      expect(canAccessTeacher([UserRole.GUEST])).toBe(false)
    })
  })

  describe('canAccessStudent', () => {
    it('should return true for STUDENT role', () => {
      expect(canAccessStudent([UserRole.STUDENT])).toBe(true)
    })

    it('should return true for TEACHER role', () => {
      expect(canAccessStudent([UserRole.TEACHER])).toBe(true)
    })

    it('should return true for ADMIN role', () => {
      expect(canAccessStudent([UserRole.ADMIN])).toBe(true)
    })

    it('should return false for GUEST role', () => {
      expect(canAccessStudent([UserRole.GUEST])).toBe(false)
    })

    it('should return false for EDITOR role only', () => {
      expect(canAccessStudent([UserRole.EDITOR])).toBe(false)
    })

    it('should return true for any combination including STUDENT, TEACHER, or ADMIN', () => {
      expect(canAccessStudent([UserRole.STUDENT, UserRole.GUEST])).toBe(true)
      expect(canAccessStudent([UserRole.TEACHER, UserRole.EDITOR])).toBe(true)
      expect(canAccessStudent([UserRole.ADMIN, UserRole.EDITOR])).toBe(true)
    })
  })

  describe('canAccessEditor', () => {
    it('should return true for EDITOR role', () => {
      expect(canAccessEditor([UserRole.EDITOR])).toBe(true)
    })

    it('should return true for ADMIN role', () => {
      expect(canAccessEditor([UserRole.ADMIN])).toBe(true)
    })

    it('should return true for EDITOR and ADMIN together', () => {
      expect(canAccessEditor([UserRole.EDITOR, UserRole.ADMIN])).toBe(true)
    })

    it('should return false for non-EDITOR/ADMIN roles', () => {
      expect(canAccessEditor([UserRole.STUDENT])).toBe(false)
      expect(canAccessEditor([UserRole.TEACHER])).toBe(false)
      expect(canAccessEditor([UserRole.GUEST])).toBe(false)
    })
  })
})

describe('Role Utils - getRoleNames', () => {
  it('should return Spanish role name for single role', () => {
    expect(getRoleNames([UserRole.ADMIN])).toBe('Administrador')
    expect(getRoleNames([UserRole.EDITOR])).toBe('Editor')
    expect(getRoleNames([UserRole.TEACHER])).toBe('Profesor')
    expect(getRoleNames([UserRole.STUDENT])).toBe('Estudiante')
    expect(getRoleNames([UserRole.GUEST])).toBe('Invitado')
  })

  it('should return comma-separated names for multiple roles', () => {
    const roles = [UserRole.STUDENT, UserRole.TEACHER]
    expect(getRoleNames(roles)).toBe('Estudiante, Profesor')
  })

  it('should handle all roles', () => {
    const allRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.TEACHER, UserRole.STUDENT, UserRole.GUEST]
    const result = getRoleNames(allRoles)
    expect(result).toBe('Administrador, Editor, Profesor, Estudiante, Invitado')
  })

  it('should return empty string for empty roles array', () => {
    expect(getRoleNames([])).toBe('')
  })
})

describe('Role Utils - Real-world Scenarios', () => {
  it('should correctly identify multi-role user permissions', () => {
    // A teacher who is also an admin
    const teacherAdmin = [UserRole.TEACHER, UserRole.ADMIN]
    expect(canAccessAdmin(teacherAdmin)).toBe(true)
    expect(canAccessTeacher(teacherAdmin)).toBe(true)
    expect(canAccessStudent(teacherAdmin)).toBe(true)
    expect(getHighestPriorityRole(teacherAdmin)).toBe(UserRole.ADMIN)
  })

  it('should correctly identify student-only permissions', () => {
    const student = [UserRole.STUDENT]
    expect(canAccessAdmin(student)).toBe(false)
    expect(canAccessTeacher(student)).toBe(false)
    expect(canAccessStudent(student)).toBe(true)
    expect(canAccessEditor(student)).toBe(false)
    expect(getHighestPriorityRole(student)).toBe(UserRole.STUDENT)
  })

  it('should correctly identify editor permissions', () => {
    const editor = [UserRole.EDITOR]
    expect(canAccessAdmin(editor)).toBe(false)
    expect(canAccessEditor(editor)).toBe(true)
    expect(canAccessTeacher(editor)).toBe(false)
    expect(canAccessStudent(editor)).toBe(false)
  })

  it('should handle permission checks for mixed roles', () => {
    const userRoles = [UserRole.STUDENT, UserRole.EDITOR]
    const adminOnly = [UserRole.ADMIN]
    const studentOrTeacher = [UserRole.STUDENT, UserRole.TEACHER]
    const editorOrAdmin = [UserRole.EDITOR, UserRole.ADMIN]

    expect(hasPermission(userRoles, adminOnly)).toBe(false)
    expect(hasPermission(userRoles, studentOrTeacher)).toBe(true)
    expect(hasPermission(userRoles, editorOrAdmin)).toBe(true)
  })
})
