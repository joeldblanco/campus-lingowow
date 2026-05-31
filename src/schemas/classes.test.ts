import { describe, it, expect } from 'vitest'
import { CreateClassSchema, EditClassSchema, RescheduleClassSchema } from './classes'

describe('Class Schemas - CreateClassSchema', () => {
  const validData = {
    enrollmentId: 'enrollment-789',
    teacherId: 'teacher-abc',
    datetime: '2025-10-21T09:00:00.000Z',
    notes: 'First class',
  }

  describe('Valid Data', () => {
    it('should validate correct class creation data', () => {
      const result = CreateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow optional notes', () => {
      const { notes: _notes, ...rest } = validData
      void _notes
      const result = CreateClassSchema.safeParse(rest)
      expect(result.success).toBe(true)
    })
  })

  describe('Required Fields', () => {
    it('should reject missing enrollmentId', () => {
      const { enrollmentId: _enrollmentId, ...rest } = validData
      void _enrollmentId
      const result = CreateClassSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('should reject empty enrollmentId', () => {
      const result = CreateClassSchema.safeParse({ ...validData, enrollmentId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('inscripción es requerida')
      }
    })

    it('should reject missing teacherId', () => {
      const { teacherId: _teacherId, ...rest } = validData
      void _teacherId
      const result = CreateClassSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('should reject empty teacherId', () => {
      const result = CreateClassSchema.safeParse({ ...validData, teacherId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('profesor es requerido')
      }
    })

    it('should reject missing datetime', () => {
      const { datetime: _datetime, ...rest } = validData
      void _datetime
      const result = CreateClassSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('should reject empty datetime', () => {
      const result = CreateClassSchema.safeParse({ ...validData, datetime: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('fecha y hora son requeridas')
      }
    })
  })
})

describe('Class Schemas - EditClassSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct edit data', () => {
      const validData = {
        studentId: 'student-123',
        enrollmentId: 'enrollment-789',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
        notes: 'Updated notes',
        status: 'COMPLETED',
        creditId: 'credit-xyz',
        completedAt: new Date('2025-10-21T10:00:00Z'),
      }

      const result = EditClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow optional enrollmentId', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow optional status', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
        status: 'SCHEDULED',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow optional completedAt date', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
        completedAt: new Date(),
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty string for creditId', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
        creditId: '',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Required Fields', () => {
    it('should reject empty studentId', () => {
      const data = {
        studentId: '',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty teacherId', () => {
      const data = {
        studentId: 'student-123',
        teacherId: '',
        day: '2025-10-21',
        timeSlot: '09:00-10:00',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty day', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '',
        timeSlot: '09:00-10:00',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty timeSlot', () => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot: '',
      }

      const result = EditClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('Class Schemas - RescheduleClassSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct reschedule data', () => {
      const validData = {
        newDate: '2025-10-22',
        newTimeSlot: '14:00-15:00',
        reason: 'Student requested change',
      }

      const result = RescheduleClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow optional reason', () => {
      const data = {
        newDate: '2025-10-22',
        newTimeSlot: '14:00-15:00',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Required Fields', () => {
    it('should reject missing newDate', () => {
      const data = {
        newTimeSlot: '14:00-15:00',
        reason: 'Reason',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty newDate', () => {
      const data = {
        newDate: '',
        newTimeSlot: '14:00-15:00',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nueva fecha es requerida')
      }
    })

    it('should reject missing newTimeSlot', () => {
      const data = {
        newDate: '2025-10-22',
        reason: 'Reason',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty newTimeSlot', () => {
      const data = {
        newDate: '2025-10-22',
        newTimeSlot: '',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nuevo horario es requerido')
      }
    })
  })

  describe('Reason Field', () => {
    it('should accept empty reason', () => {
      const data = {
        newDate: '2025-10-22',
        newTimeSlot: '14:00-15:00',
        reason: '',
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept long reason text', () => {
      const data = {
        newDate: '2025-10-22',
        newTimeSlot: '14:00-15:00',
        reason: 'A'.repeat(500),
      }

      const result = RescheduleClassSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('Class Schemas - Edge Cases', () => {
  it('CreateClassSchema accepts ISO datetime strings', () => {
    const data = {
      enrollmentId: 'enrollment-789',
      teacherId: 'teacher-abc',
      datetime: '2025-10-21T09:00:00.000Z',
    }
    expect(CreateClassSchema.safeParse(data).success).toBe(true)
  })

  it('EditClassSchema accepts various time slot formats', () => {
    const validFormats = ['09:00-10:00', '14:30-16:00', '08:00-08:40']

    validFormats.forEach((timeSlot) => {
      const data = {
        studentId: 'student-123',
        teacherId: 'teacher-abc',
        day: '2025-10-21',
        timeSlot,
      }

      expect(EditClassSchema.safeParse(data).success).toBe(true)
    })
  })
})
