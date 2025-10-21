import { describe, it, expect } from 'vitest'
import { CreateCourseSchema, EditCourseSchema } from './courses'

describe('Course Schemas - CreateCourseSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct course data', () => {
      const validData = {
        title: 'Spanish for Beginners',
        description: 'Learn Spanish from scratch',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 45,
        image: 'course.jpg',
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should apply default classDuration when not provided', () => {
      const data = {
        title: 'Spanish for Beginners',
        description: 'Learn Spanish from scratch',
        language: 'Spanish',
        level: 'Beginner',
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.classDuration).toBe(40) // Default value
      }
    })

    it('should accept optional image field', () => {
      const withImage = {
        title: 'Course',
        description: 'Description',
        language: 'English',
        level: 'Intermediate',
        classDuration: 40,
        createdById: 'user-123',
        image: 'image.jpg',
      }

      const withoutImage = {
        title: 'Course',
        description: 'Description',
        language: 'English',
        level: 'Intermediate',
        classDuration: 40,
        createdById: 'user-123',
      }

      expect(CreateCourseSchema.safeParse(withImage).success).toBe(true)
      expect(CreateCourseSchema.safeParse(withoutImage).success).toBe(true)
    })
  })

  describe('Title Validation', () => {
    it('should reject empty title', () => {
      const data = {
        title: '',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('título es requerido')
      }
    })

    it('should accept title with spaces', () => {
      const data = {
        title: 'Spanish for Complete Beginners',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept title with special characters', () => {
      const data = {
        title: 'Spanish 101: ¡Hola Mundo!',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Description Validation', () => {
    it('should reject empty description', () => {
      const data = {
        title: 'Course Title',
        description: '',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('descripción es requerida')
      }
    })

    it('should accept long descriptions', () => {
      const data = {
        title: 'Course',
        description: 'A'.repeat(1000),
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Language Validation', () => {
    it('should reject empty language', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: '',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('idioma es requerido')
      }
    })

    it('should accept various language values', () => {
      const languages = ['Spanish', 'English', 'French', 'German', 'Mandarin']

      languages.forEach((language) => {
        const data = {
          title: 'Course',
          description: 'Description',
          language,
          level: 'Beginner',
          classDuration: 40,
          createdById: 'user-123',
        }
        expect(CreateCourseSchema.safeParse(data).success).toBe(true)
      })
    })
  })

  describe('Level Validation', () => {
    it('should reject empty level', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: '',
        classDuration: 40,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nivel es requerido')
      }
    })

    it('should accept various level values', () => {
      const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

      levels.forEach((level) => {
        const data = {
          title: 'Course',
          description: 'Description',
          language: 'Spanish',
          level,
          classDuration: 40,
          createdById: 'user-123',
        }
        expect(CreateCourseSchema.safeParse(data).success).toBe(true)
      })
    })
  })

  describe('ClassDuration Validation', () => {
    it('should accept minimum duration (30 minutes)', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 30,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept maximum duration (90 minutes)', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 90,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject duration below 30 minutes', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 29,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject duration above 90 minutes', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 91,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer durations', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 45.5,
        createdById: 'user-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept common durations', () => {
      const durations = [30, 40, 45, 60, 90]

      durations.forEach((duration) => {
        const data = {
          title: 'Course',
          description: 'Description',
          language: 'Spanish',
          level: 'Beginner',
          classDuration: duration,
          createdById: 'user-123',
        }
        expect(CreateCourseSchema.safeParse(data).success).toBe(true)
      })
    })
  })

  describe('CreatedById Validation', () => {
    it('should require createdById', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept createdById as string', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-abc-123',
      }

      const result = CreateCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('Course Schemas - EditCourseSchema', () => {
  describe('Valid Data', () => {
    it('should validate correct edit data', () => {
      const validData = {
        title: 'Updated Spanish Course',
        description: 'Updated description',
        language: 'Spanish',
        level: 'Intermediate',
        classDuration: 60,
        image: 'updated-image.jpg',
      }

      const result = EditCourseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should NOT have createdById field', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 40,
        createdById: 'user-123', // This should be ignored
      }

      const result = EditCourseSchema.safeParse(data)
      // Should still succeed but createdById is not part of the schema
      expect(result.success).toBe(true)
    })

    it('should NOT have default classDuration', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
      }

      const result = EditCourseSchema.safeParse(data)
      // Should fail because classDuration is required in edit
      expect(result.success).toBe(false)
    })
  })

  describe('Validation Rules', () => {
    it('should have same validation as CreateCourseSchema for common fields', () => {
      const invalidData = {
        title: '',
        description: '',
        language: '',
        level: '',
        classDuration: 25, // Too low
      }

      const result = EditCourseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept valid duration range', () => {
      const data = {
        title: 'Course',
        description: 'Description',
        language: 'Spanish',
        level: 'Beginner',
        classDuration: 45,
      }

      const result = EditCourseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('Course Schemas - Edge Cases', () => {
  it('should handle very long titles', () => {
    const data = {
      title: 'A'.repeat(500),
      description: 'Description',
      language: 'Spanish',
      level: 'Beginner',
      classDuration: 40,
      createdById: 'user-123',
    }

    const result = CreateCourseSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should handle special characters in all text fields', () => {
    const data = {
      title: '¡Español! 🇪🇸',
      description: 'Aprende español con ñ, á, é, í, ó, ú',
      language: 'Español',
      level: 'Principiante',
      classDuration: 40,
      createdById: 'user-123',
    }

    const result = CreateCourseSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject null values', () => {
    const data = {
      title: null,
      description: null,
      language: null,
      level: null,
      classDuration: null,
      createdById: null,
    }

    const result = CreateCourseSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should reject undefined required fields', () => {
    const data = {
      title: 'Course',
      // Missing other required fields
    }

    const result = CreateCourseSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
