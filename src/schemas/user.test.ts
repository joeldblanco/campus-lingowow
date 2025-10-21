import { describe, it, expect } from 'vitest'
import { CreateUserSchema, UpdateUserSchema } from './user'
import { UserRole, UserStatus } from '@prisma/client'

describe('User Schemas - CreateUserSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct user creation data', () => {
      const validData = {
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
        image: 'https://example.com/avatar.jpg',
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow multiple roles', () => {
      const data = {
        name: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT, UserRole.TEACHER],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow optional image', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow null image', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
        image: null,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Name Validation', () => {
    it('should reject names shorter than 2 characters', () => {
      const data = {
        name: 'J',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should accept names with 2 characters', () => {
      const data = {
        name: 'Jo',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept names with special characters', () => {
      const data = {
        name: 'José',
        lastName: 'García',
        email: 'jose@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('LastName Validation', () => {
    it('should reject last names shorter than 2 characters', () => {
      const data = {
        name: 'John',
        lastName: 'D',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should accept compound last names', () => {
      const data = {
        name: 'John',
        lastName: 'van der Berg',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
      ]

      validEmails.forEach((email) => {
        const data = {
          name: 'John',
          lastName: 'Doe',
          email,
          password: 'SecurePass123!',
          roles: [UserRole.STUDENT],
          status: UserStatus.ACTIVE,
        }
        expect(CreateUserSchema.safeParse(data).success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com']

      invalidEmails.forEach((email) => {
        const data = {
          name: 'John',
          lastName: 'Doe',
          email,
          password: 'SecurePass123!',
          roles: [UserRole.STUDENT],
          status: UserStatus.ACTIVE,
        }
        expect(CreateUserSchema.safeParse(data).success).toBe(false)
      })
    })
  })

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = ['SecurePass123!', 'MyP@ssw0rd', 'Test123!@#', 'Abcd1234!']

      strongPasswords.forEach((password) => {
        const data = {
          name: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password,
          roles: [UserRole.STUDENT],
          status: UserStatus.ACTIVE,
        }
        expect(CreateUserSchema.safeParse(data).success).toBe(true)
      })
    })

    it('should reject passwords shorter than 8 characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass1!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters')
      }
    })

    it('should reject passwords without lowercase', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'PASSWORD123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase')
      }
    })

    it('should reject passwords without uppercase', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase')
      }
    })

    it('should reject passwords without numbers', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number')
      }
    })

    it('should reject passwords without special characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('special character')
      }
    })

    it('should reject passwords with spaces', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass word123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject passwords longer than 32 characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!' + 'a'.repeat(20),
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Roles Validation', () => {
    it('should accept all valid roles', () => {
      const allRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.TEACHER, UserRole.STUDENT, UserRole.GUEST]

      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: allRoles,
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept single role', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.ADMIN],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require roles array', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Status Validation', () => {
    it('should accept ACTIVE status', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept INACTIVE status', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.INACTIVE,
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require status', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Strict Mode', () => {
    it('should reject extra fields', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        roles: [UserRole.STUDENT],
        status: UserStatus.ACTIVE,
        extraField: 'not allowed',
      }

      const result = CreateUserSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('User Schemas - UpdateUserSchema', () => {
  it('should allow partial updates', () => {
    const data = {
      name: 'Updated Name',
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should allow updating multiple fields', () => {
    const data = {
      name: 'Updated Name',
      email: 'newemail@example.com',
      status: UserStatus.INACTIVE,
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should allow empty update (no fields)', () => {
    const data = {}

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should validate fields when provided', () => {
    const data = {
      name: 'J', // Too short
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should validate password strength when provided', () => {
    const data = {
      password: 'weak',
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should validate email format when provided', () => {
    const data = {
      email: 'invalid-email',
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should enforce strict mode', () => {
    const data = {
      name: 'John',
      extraField: 'not allowed',
    }

    const result = UpdateUserSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
