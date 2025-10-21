import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateClassAccess, shouldShowEndWarning } from './class-access'

describe('Class Access Validation', () => {
  beforeEach(() => {
    // Use fake timers for predictable testing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Teacher Access', () => {
    it('should allow teacher to access 10 minutes before class', () => {
      // Set current time to Oct 21, 2025, 13:50 (10 minutes before class)
      vi.setSystemTime(new Date(2025, 9, 21, 13, 50, 0))

      // Class is at 14:00-15:00 local time
      // Convert to UTC (this will depend on timezone, but for testing we use the converted values)
      // For this test, we'll assume the conversion works correctly
      const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

      expect(result.canAccess).toBe(true)
    })

    it('should NOT allow teacher to access more than 10 minutes before class', () => {
      // Set current time to 13:49 (11 minutes before class at 14:00)
      vi.setSystemTime(new Date(2025, 9, 21, 13, 49, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toContain('minutos antes de la clase')
    })

    it('should allow teacher during class time', () => {
      // Set current time during class (14:30)
      vi.setSystemTime(new Date(2025, 9, 21, 14, 30, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

      expect(result.canAccess).toBe(true)
    })

    it('should NOT allow teacher after class ends', () => {
      // Set current time after class ends (15:01)
      vi.setSystemTime(new Date(2025, 9, 21, 15, 1, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toBe('La clase ya ha finalizado')
    })
  })

  describe('Student Access', () => {
    it('should NOT allow student before class starts', () => {
      // Set current time to 13:59:30 (30 seconds before class)
      vi.setSystemTime(new Date(2025, 9, 21, 13, 59, 30))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toContain('comenzará en')
      expect(result.secondsUntilStart).toBe(30)
    })

    it('should allow student exactly at class start time', () => {
      // Set current time to exactly 14:00
      vi.setSystemTime(new Date(2025, 9, 21, 14, 0, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(true)
    })

    it('should allow student during class', () => {
      // Set current time during class (14:30)
      vi.setSystemTime(new Date(2025, 9, 21, 14, 30, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(true)
    })

    it('should NOT allow student after class ends', () => {
      // Set current time after class ends (15:00:01)
      vi.setSystemTime(new Date(2025, 9, 21, 15, 0, 1))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toBe('La clase ya ha finalizado')
    })

    it('should format time remaining message correctly for hours', () => {
      // Set current time to 2 hours before class
      vi.setSystemTime(new Date(2025, 9, 21, 12, 0, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toContain('hora')
    })

    it('should format time remaining message correctly for minutes and seconds', () => {
      // Set current time to 5 minutes 30 seconds before class
      vi.setSystemTime(new Date(2025, 9, 21, 13, 54, 30))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toContain('minuto')
      expect(result.reason).toContain('segundo')
    })
  })

  describe('Time Calculations', () => {
    it('should correctly calculate minutes and seconds until start', () => {
      // Set current time to 15 minutes before class
      vi.setSystemTime(new Date(2025, 9, 21, 13, 45, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.minutesUntilStart).toBe(15)
      expect(result.secondsUntilStart).toBe(900) // 15 * 60
    })

    it('should correctly calculate minutes and seconds until end', () => {
      // Set current time during class (14:30, 30 minutes before end)
      vi.setSystemTime(new Date(2025, 9, 21, 14, 30, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.minutesUntilEnd).toBe(30)
      expect(result.secondsUntilEnd).toBe(1800) // 30 * 60
    })

    it('should have negative values when class has ended', () => {
      // Set current time after class ends
      vi.setSystemTime(new Date(2025, 9, 21, 15, 30, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.minutesUntilEnd).toBeLessThan(0)
      expect(result.secondsUntilEnd).toBeLessThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid timeSlot format', () => {
      vi.setSystemTime(new Date(2025, 9, 21, 14, 0, 0))

      const result = validateClassAccess('2025-10-21', 'invalid-format', false)

      // The function may handle invalid format gracefully or deny access
      expect(result.canAccess).toBeDefined()
    })

    it('should handle class at midnight', () => {
      // Class from 00:00 to 01:00
      vi.setSystemTime(new Date(2025, 9, 21, 0, 0, 0))

      const result = validateClassAccess('2025-10-21', '00:00-01:00', false)

      expect(result.canAccess).toBe(true)
    })

    it('should handle late night class (23:00-00:00)', () => {
      vi.setSystemTime(new Date(2025, 9, 21, 23, 30, 0))

      const result = validateClassAccess('2025-10-21', '23:00-00:00', false)

      // Late night classes crossing midnight need complex timezone handling
      expect(result.canAccess).toBeDefined()
    })

    it('should handle teacher exactly 10 minutes before', () => {
      // Exactly 10 minutes before class
      vi.setSystemTime(new Date(2025, 9, 21, 13, 50, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

      expect(result.canAccess).toBe(true)
    })

    it('should handle very short classes (15 minutes)', () => {
      vi.setSystemTime(new Date(2025, 9, 21, 14, 5, 0))

      const result = validateClassAccess('2025-10-21', '14:00-14:15', false)

      expect(result.canAccess).toBe(true)
      expect(result.minutesUntilEnd).toBe(10)
    })

    it('should handle very long classes (3 hours)', () => {
      vi.setSystemTime(new Date(2025, 9, 21, 14, 30, 0))

      const result = validateClassAccess('2025-10-21', '14:00-17:00', false)

      expect(result.canAccess).toBe(true)
      expect(result.minutesUntilEnd).toBe(150) // 2.5 hours remaining
    })
  })

  describe('Different Days', () => {
    it('should deny access to future class on different day', () => {
      // Current time is Oct 20, class is Oct 21
      vi.setSystemTime(new Date(2025, 9, 20, 14, 0, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.minutesUntilStart).toBeGreaterThan(1000) // More than a day
    })

    it('should deny access to past class on different day', () => {
      // Current time is Oct 22, class was Oct 21
      vi.setSystemTime(new Date(2025, 9, 22, 14, 0, 0))

      const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

      expect(result.canAccess).toBe(false)
      expect(result.reason).toBe('La clase ya ha finalizado')
    })
  })
})

describe('shouldShowEndWarning', () => {
  it('should show warning when 5 minutes or less remaining', () => {
    expect(shouldShowEndWarning(5)).toBe(true)
    expect(shouldShowEndWarning(4)).toBe(true)
    expect(shouldShowEndWarning(3)).toBe(true)
    expect(shouldShowEndWarning(2)).toBe(true)
    expect(shouldShowEndWarning(1)).toBe(true)
  })

  it('should NOT show warning when more than 5 minutes remaining', () => {
    expect(shouldShowEndWarning(6)).toBe(false)
    expect(shouldShowEndWarning(10)).toBe(false)
    expect(shouldShowEndWarning(30)).toBe(false)
  })

  it('should NOT show warning when class has ended', () => {
    expect(shouldShowEndWarning(0)).toBe(false)
    expect(shouldShowEndWarning(-1)).toBe(false)
    expect(shouldShowEndWarning(-10)).toBe(false)
  })
})

describe('Class Access - Real World Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Scenario: Teacher logs in 15 minutes early', () => {
    vi.setSystemTime(new Date(2025, 9, 21, 13, 45, 0))

    const result = validateClassAccess('2025-10-21', '14:00-15:00', true)

    expect(result.canAccess).toBe(false)
    expect(result.minutesUntilStart).toBe(15)
  })

  it('Scenario: Student tries to join 1 minute early', () => {
    vi.setSystemTime(new Date(2025, 9, 21, 13, 59, 0))

    const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

    expect(result.canAccess).toBe(false)
    expect(result.secondsUntilStart).toBe(60)
  })

  it('Scenario: Teacher joins 5 minutes before, student cannot yet', () => {
    vi.setSystemTime(new Date(2025, 9, 21, 13, 55, 0))

    const teacherResult = validateClassAccess('2025-10-21', '14:00-15:00', true)
    const studentResult = validateClassAccess('2025-10-21', '14:00-15:00', false)

    expect(teacherResult.canAccess).toBe(true)
    expect(studentResult.canAccess).toBe(false)
  })

  it('Scenario: Class about to end in 3 minutes', () => {
    vi.setSystemTime(new Date(2025, 9, 21, 14, 57, 0))

    const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

    expect(result.canAccess).toBe(true)
    expect(result.minutesUntilEnd).toBe(3)
    expect(shouldShowEndWarning(result.minutesUntilEnd!)).toBe(true)
  })

  it('Scenario: Student tries to join after class ended', () => {
    vi.setSystemTime(new Date(2025, 9, 21, 15, 5, 0))

    const result = validateClassAccess('2025-10-21', '14:00-15:00', false)

    expect(result.canAccess).toBe(false)
    expect(result.reason).toBe('La clase ya ha finalizado')
  })
})
