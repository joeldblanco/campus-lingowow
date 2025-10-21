import { describe, it, expect } from 'vitest'
import { SignUpSchema, SignInSchema, ResetSchema, NewPasswordSchema } from './auth'

describe('Auth Schemas - SignUpSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct signup data', () => {
      const validData = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Name Validation', () => {
    it('should reject empty name', () => {
      const data = {
        name: '',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nombre es requerido')
      }
    })

    it('should reject name longer than 255 characters', () => {
      const data = {
        name: 'a'.repeat(256),
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('255 caracteres')
      }
    })

    it('should accept name with 255 characters', () => {
      const data = {
        name: 'a'.repeat(255),
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('LastName Validation', () => {
    it('should reject empty lastName', () => {
      const data = {
        name: 'John',
        lastName: '',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('apellido es requerido')
      }
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
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }
        const result = SignUpSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
      ]

      invalidEmails.forEach((email) => {
        const data = {
          name: 'John',
          lastName: 'Doe',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }
        const result = SignUpSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should reject empty email', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: '',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyP@ssw0rd',
        'Secure#Pass1',
        'C0mpl3x!Pass',
        '12345678Aa!',
      ]

      strongPasswords.forEach((password) => {
        const data = {
          name: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password,
          confirmPassword: password,
        }
        const result = SignUpSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject passwords shorter than 8 characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass1!',
        confirmPassword: 'Pass1!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 8 caracteres')
      }
    })

    it('should reject passwords longer than 32 characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!' + 'a'.repeat(25),
        confirmPassword: 'Password123!' + 'a'.repeat(25),
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('32 caracteres')
      }
    })

    it('should reject passwords without lowercase', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('minúscula')
      }
    })

    it('should reject passwords without uppercase', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123!',
        confirmPassword: 'password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mayúscula')
      }
    })

    it('should reject passwords without numbers', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password!',
        confirmPassword: 'Password!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número')
      }
    })

    it('should reject passwords without special characters', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('símbolo')
      }
    })

    it('should reject passwords with spaces', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass word123!',
        confirmPassword: 'Pass word123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Password Confirmation', () => {
    it('should reject when passwords do not match', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPass123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden')
        expect(result.error.issues[0].path[0]).toBe('confirmPassword')
      }
    })

    it('should accept when passwords match exactly', () => {
      const data = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }

      const result = SignUpSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('Auth Schemas - SignInSchema', () => {
  it('should validate correct signin data', () => {
    const validData = {
      email: 'user@example.com',
      password: 'Password123!',
    }

    const result = SignInSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const data = {
      email: 'invalid-email',
      password: 'Password123!',
    }

    const result = SignInSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Formato de correo')
    }
  })

  it('should reject weak password', () => {
    const data = {
      email: 'user@example.com',
      password: 'weak',
    }

    const result = SignInSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject empty fields', () => {
    const data = {
      email: '',
      password: '',
    }

    const result = SignInSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})

describe('Auth Schemas - ResetSchema', () => {
  it('should validate correct email', () => {
    const validData = {
      email: 'user@example.com',
    }

    const result = ResetSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email format', () => {
    const data = {
      email: 'not-an-email',
    }

    const result = ResetSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('no válido')
    }
  })

  it('should reject empty email', () => {
    const data = {
      email: '',
    }

    const result = ResetSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('requerido')
    }
  })
})

describe('Auth Schemas - NewPasswordSchema', () => {
  it('should validate strong password', () => {
    const validData = {
      password: 'NewPassword123!',
    }

    const result = NewPasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject weak password', () => {
    const data = {
      password: 'weak',
    }

    const result = NewPasswordSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject password without all required character types', () => {
    const weakPasswords = [
      'alllowercase123!', // No uppercase
      'ALLUPPERCASE123!', // No lowercase
      'NoNumbersHere!', // No numbers
      'NoSpecialChars123', // No special chars
    ]

    weakPasswords.forEach((password) => {
      const result = NewPasswordSchema.safeParse({ password })
      expect(result.success).toBe(false)
    })
  })

  it('should accept exactly 8 characters if strong', () => {
    const result = NewPasswordSchema.safeParse({ password: 'Pass123!' })
    expect(result.success).toBe(true)
  })

  it('should accept exactly 32 characters if strong', () => {
    const password = 'Password123!' + 'a'.repeat(20) // Exactly 32 chars
    const result = NewPasswordSchema.safeParse({ password })
    expect(result.success).toBe(true)
  })
})
