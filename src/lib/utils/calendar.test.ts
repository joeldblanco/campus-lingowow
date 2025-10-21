import { describe, it, expect } from 'vitest'
import {
  generateTimeSlots,
  timeToMinutes,
  splitTimeSlot,
  timeSlotToMinutes,
  isTimeSlotInAnyRange,
  isTimeSlotBooked,
  filterAvailableTimeSlots,
  convertSlotsToRanges,
  mergeOverlappingRanges,
  formatTimeTo12Hour,
  formatTimeSlotTo12Hour,
  type AvailabilityRange,
} from './calendar'

// Mock UserRole enum
const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
  EDITOR: 'EDITOR',
} as const

describe('Calendar Utils - Time Conversion', () => {
  describe('timeToMinutes', () => {
    it('should convert time to minutes from midnight', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('01:00')).toBe(60)
      expect(timeToMinutes('09:30')).toBe(570)
      expect(timeToMinutes('12:00')).toBe(720)
      expect(timeToMinutes('23:59')).toBe(1439)
    })

    it('should handle single digit hours and minutes', () => {
      expect(timeToMinutes('9:5')).toBe(545)
      expect(timeToMinutes('1:1')).toBe(61)
    })
  })

  describe('splitTimeSlot', () => {
    it('should split time slot into start and end', () => {
      expect(splitTimeSlot('09:00-10:00')).toEqual(['09:00', '10:00'])
      expect(splitTimeSlot('14:30-16:00')).toEqual(['14:30', '16:00'])
    })
  })

  describe('timeSlotToMinutes', () => {
    it('should convert time slot to start and end minutes', () => {
      const result = timeSlotToMinutes('09:00-10:30')
      expect(result.start).toBe(540) // 9 * 60
      expect(result.end).toBe(630) // 10 * 60 + 30
    })

    it('should handle various time slots', () => {
      const morning = timeSlotToMinutes('08:00-09:00')
      expect(morning.start).toBe(480)
      expect(morning.end).toBe(540)

      const afternoon = timeSlotToMinutes('14:00-15:30')
      expect(afternoon.start).toBe(840)
      expect(afternoon.end).toBe(930)
    })
  })
})

describe('Calendar Utils - Time Slot Generation', () => {
  describe('generateTimeSlots', () => {
    it('should generate hourly slots for 60-minute duration', () => {
      const slots = generateTimeSlots(60, 9, 12)
      expect(slots).toHaveLength(3)
      expect(slots).toContain('09:00-10:00')
      expect(slots).toContain('10:00-11:00')
      expect(slots).toContain('11:00-12:00')
    })

    it('should generate slots for 90-minute duration', () => {
      const slots = generateTimeSlots(90, 9, 12)
      expect(slots).toHaveLength(2)
      expect(slots).toContain('09:00-10:30')
      expect(slots).toContain('10:00-11:30')
    })

    it('should generate slots for 40-minute duration', () => {
      const slots = generateTimeSlots(40, 9, 11)
      expect(slots).toHaveLength(2)
      expect(slots).toContain('09:00-09:40')
      expect(slots).toContain('10:00-10:40')
    })

    it('should handle half-hour end times', () => {
      const slots = generateTimeSlots(30, 9, 10.5)
      expect(slots.length).toBeGreaterThan(0)
    })

    it('should not generate slots that exceed end hour', () => {
      const slots = generateTimeSlots(120, 15, 17)
      expect(slots).toHaveLength(1)
      expect(slots[0]).toBe('15:00-17:00')
    })
  })
})

describe('Calendar Utils - Availability Checking', () => {
  const mockRanges: AvailabilityRange[] = [
    { startTime: '09:00', endTime: '12:00' },
    { startTime: '14:00', endTime: '17:00' },
  ]

  describe('isTimeSlotInAnyRange', () => {
    it('should return true for slot within range', () => {
      expect(isTimeSlotInAnyRange('09:00-10:00', mockRanges)).toBe(true)
      expect(isTimeSlotInAnyRange('10:00-11:00', mockRanges)).toBe(true)
      expect(isTimeSlotInAnyRange('14:00-15:00', mockRanges)).toBe(true)
    })

    it('should return false for slot outside ranges', () => {
      expect(isTimeSlotInAnyRange('08:00-09:00', mockRanges)).toBe(false)
      expect(isTimeSlotInAnyRange('12:00-13:00', mockRanges)).toBe(false)
      expect(isTimeSlotInAnyRange('17:00-18:00', mockRanges)).toBe(false)
    })

    it('should return false for slot partially outside range', () => {
      expect(isTimeSlotInAnyRange('08:30-09:30', mockRanges)).toBe(false)
      expect(isTimeSlotInAnyRange('11:30-12:30', mockRanges)).toBe(false)
    })

    it('should return false when no ranges provided', () => {
      expect(isTimeSlotInAnyRange('09:00-10:00', [])).toBe(false)
    })

    it('should handle edge cases at range boundaries', () => {
      expect(isTimeSlotInAnyRange('09:00-12:00', mockRanges)).toBe(true)
      expect(isTimeSlotInAnyRange('14:00-17:00', mockRanges)).toBe(true)
    })
  })

  describe('isTimeSlotBooked', () => {
    const bookedSlots = ['09:00-10:00', '14:00-15:00']

    it('should return true for overlapping slots', () => {
      expect(isTimeSlotBooked('09:00-10:00', bookedSlots)).toBe(true)
      expect(isTimeSlotBooked('09:30-10:30', bookedSlots)).toBe(true)
      expect(isTimeSlotBooked('08:30-09:30', bookedSlots)).toBe(true)
    })

    it('should return false for non-overlapping slots', () => {
      expect(isTimeSlotBooked('10:00-11:00', bookedSlots)).toBe(false)
      expect(isTimeSlotBooked('11:00-12:00', bookedSlots)).toBe(false)
      expect(isTimeSlotBooked('16:00-17:00', bookedSlots)).toBe(false)
    })

    it('should return false when no bookings', () => {
      expect(isTimeSlotBooked('09:00-10:00', [])).toBe(false)
    })

    it('should handle adjacent slots without overlap', () => {
      expect(isTimeSlotBooked('10:00-11:00', ['09:00-10:00'])).toBe(false)
    })
  })

  describe('filterAvailableTimeSlots', () => {
    const allSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00']

    it('should return all slots for teachers', () => {
      const result = filterAvailableTimeSlots(allSlots, mockRanges, UserRole.TEACHER as any)
      expect(result).toHaveLength(allSlots.length)
      expect(result).toEqual(allSlots)
    })

    it('should filter slots for students based on availability', () => {
      const result = filterAvailableTimeSlots(allSlots, mockRanges, UserRole.STUDENT as any)
      expect(result).not.toContain('08:00-09:00') // Before availability
      expect(result).toContain('09:00-10:00') // Within availability
      expect(result).toContain('14:00-15:00') // Within availability
    })

    it('should return empty array for students with no availability', () => {
      const result = filterAvailableTimeSlots(allSlots, [], UserRole.STUDENT as any)
      expect(result).toHaveLength(0)
    })
  })
})

describe('Calendar Utils - Range Operations', () => {
  describe('convertSlotsToRanges', () => {
    it('should convert consecutive slots to single range', () => {
      const slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00']
      const ranges = convertSlotsToRanges(slots)

      expect(ranges).toHaveLength(1)
      expect(ranges[0]).toEqual({ startTime: '09:00', endTime: '12:00' })
    })

    it('should create separate ranges for non-consecutive slots', () => {
      const slots = ['09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00']
      const ranges = convertSlotsToRanges(slots)

      expect(ranges).toHaveLength(2)
      expect(ranges[0]).toEqual({ startTime: '09:00', endTime: '11:00' })
      expect(ranges[1]).toEqual({ startTime: '14:00', endTime: '16:00' })
    })

    it('should handle single slot', () => {
      const ranges = convertSlotsToRanges(['09:00-10:00'])
      expect(ranges).toHaveLength(1)
      expect(ranges[0]).toEqual({ startTime: '09:00', endTime: '10:00' })
    })

    it('should return empty array for no slots', () => {
      expect(convertSlotsToRanges([])).toEqual([])
    })

    it('should sort unsorted slots', () => {
      const slots = ['14:00-15:00', '09:00-10:00', '10:00-11:00']
      const ranges = convertSlotsToRanges(slots)

      expect(ranges).toHaveLength(2)
      expect(ranges[0].startTime).toBe('09:00')
    })
  })

  describe('mergeOverlappingRanges', () => {
    it('should merge overlapping ranges', () => {
      const ranges: AvailabilityRange[] = [
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '10:00', endTime: '12:00' },
      ]
      const merged = mergeOverlappingRanges(ranges)

      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startTime: '09:00', endTime: '12:00' })
    })

    it('should merge contiguous ranges', () => {
      const ranges: AvailabilityRange[] = [
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '11:00', endTime: '13:00' },
      ]
      const merged = mergeOverlappingRanges(ranges)

      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startTime: '09:00', endTime: '13:00' })
    })

    it('should not merge non-overlapping ranges', () => {
      const ranges: AvailabilityRange[] = [
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '14:00', endTime: '16:00' },
      ]
      const merged = mergeOverlappingRanges(ranges)

      expect(merged).toHaveLength(2)
      expect(merged[0]).toEqual({ startTime: '09:00', endTime: '11:00' })
      expect(merged[1]).toEqual({ startTime: '14:00', endTime: '16:00' })
    })

    it('should handle single range', () => {
      const ranges: AvailabilityRange[] = [{ startTime: '09:00', endTime: '11:00' }]
      const merged = mergeOverlappingRanges(ranges)

      expect(merged).toEqual(ranges)
    })

    it('should handle empty array', () => {
      expect(mergeOverlappingRanges([])).toEqual([])
    })

    it('should merge multiple overlapping ranges', () => {
      const ranges: AvailabilityRange[] = [
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '10:00', endTime: '12:00' },
        { startTime: '11:30', endTime: '13:00' },
      ]
      const merged = mergeOverlappingRanges(ranges)

      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startTime: '09:00', endTime: '13:00' })
    })
  })
})

describe('Calendar Utils - Time Formatting', () => {
  describe('formatTimeTo12Hour', () => {
    it('should format AM times correctly', () => {
      expect(formatTimeTo12Hour('00:00')).toBe('12:00 AM')
      expect(formatTimeTo12Hour('01:30')).toBe('1:30 AM')
      expect(formatTimeTo12Hour('09:45')).toBe('9:45 AM')
      expect(formatTimeTo12Hour('11:59')).toBe('11:59 AM')
    })

    it('should format PM times correctly', () => {
      expect(formatTimeTo12Hour('12:00')).toBe('12:00 PM')
      expect(formatTimeTo12Hour('13:30')).toBe('1:30 PM')
      expect(formatTimeTo12Hour('18:45')).toBe('6:45 PM')
      expect(formatTimeTo12Hour('23:59')).toBe('11:59 PM')
    })
  })

  describe('formatTimeSlotTo12Hour', () => {
    it('should format time slots to 12-hour format', () => {
      expect(formatTimeSlotTo12Hour('09:00-10:00')).toBe('9:00 AM-10:00 AM')
      expect(formatTimeSlotTo12Hour('14:00-15:30')).toBe('2:00 PM-3:30 PM')
      expect(formatTimeSlotTo12Hour('09:00-17:00')).toBe('9:00 AM-5:00 PM')
    })

    it('should handle midnight and noon', () => {
      expect(formatTimeSlotTo12Hour('00:00-01:00')).toBe('12:00 AM-1:00 AM')
      expect(formatTimeSlotTo12Hour('11:00-13:00')).toBe('11:00 AM-1:00 PM')
    })
  })
})

describe('Calendar Utils - Edge Cases', () => {
  it('should handle very early morning slots', () => {
    const slots = generateTimeSlots(60, 6, 8)
    expect(slots).toHaveLength(2)
    expect(slots[0]).toBe('06:00-07:00')
  })

  it('should handle late evening slots', () => {
    const slots = generateTimeSlots(60, 20, 22)
    expect(slots).toHaveLength(2)
    expect(slots[0]).toBe('20:00-21:00')
  })

  it('should handle cross-midnight scenarios', () => {
    const slot = '23:00-00:30'
    const minutes = timeSlotToMinutes(slot)
    expect(minutes.start).toBe(1380) // 23 * 60
    expect(minutes.end).toBe(30) // 0 * 60 + 30 (wraps around)
  })
})
