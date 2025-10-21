import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseDateString,
  formatToISO,
  formatDateLong,
  formatDateShort,
  getDayOfWeek,
  getDayName,
  getDateRange,
  filterByDayOfWeek,
  dayNameToNumber,
  createDateWithTime,
  getStartOfDay,
  getEndOfDay,
  addDaysToDate,
  addWeeksToDate,
  addMonthsToDate,
  isBeforeDate,
  isAfterDate,
  isSameDayDate,
  getDaysDifference,
  getMonthNumber,
  getYearNumber,
  createDate,
  getStartOfYear,
  getEndOfYear,
  getStartOfMonth,
  getEndOfMonth,
  isDateWithinInterval,
  formatDateNumeric,
  formatDateWithTime,
  getTodayString,
  isToday,
  isPastDate,
  isFutureDate,
  toUTCDate,
  dateStringToUTC,
  utcDateToString,
  convertTimeSlotToUTC,
  convertTimeSlotFromUTC,
} from './date'

describe('Date Utils - Parsing and Formatting', () => {
  it('should parse ISO date string to Date object', () => {
    const result = parseDateString('2025-10-03')
    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(9) // October is month 9 (0-indexed)
    expect(result.getDate()).toBe(3)
  })

  it('should format Date to ISO string', () => {
    const date = new Date(2025, 9, 3) // October 3, 2025
    const result = formatToISO(date)
    expect(result).toBe('2025-10-03')
  })

  it('should format date in long Spanish format', () => {
    const date = new Date(2025, 9, 3) // October 3, 2025 (Friday)
    const result = formatDateLong(date)
    expect(result).toMatch(/viernes/)
    expect(result).toMatch(/octubre/)
    expect(result).toMatch(/2025/)
  })

  it('should format date string in long Spanish format', () => {
    const result = formatDateLong('2025-10-03')
    expect(result).toMatch(/viernes/)
    expect(result).toMatch(/octubre/)
  })

  it('should format date in short Spanish format', () => {
    const date = new Date(2025, 9, 3)
    const result = formatDateShort(date)
    expect(result).toMatch(/3 de octubre de 2025/)
  })

  it('should format date in numeric format', () => {
    const date = new Date(2025, 9, 3)
    const result = formatDateNumeric(date)
    expect(result).toBe('03/10/2025')
  })

  it('should format date with time', () => {
    const date = new Date(2025, 9, 3, 14, 30)
    const result = formatDateWithTime(date)
    expect(result).toBe('03/10/2025 14:30')
  })
})

describe('Date Utils - Day Operations', () => {
  it('should get day of week for a date', () => {
    const date = new Date(2025, 9, 3) // Friday
    expect(getDayOfWeek(date)).toBe(5)
  })

  it('should get day of week from string', () => {
    expect(getDayOfWeek('2025-10-03')).toBe(5) // Friday
  })

  it('should get day name in English', () => {
    const date = new Date(2025, 9, 3) // Friday
    expect(getDayName(date)).toBe('friday')
  })

  it('should get all day names correctly', () => {
    // Test a week: Oct 5-11, 2025 (Sunday to Saturday)
    expect(getDayName('2025-10-05')).toBe('sunday')
    expect(getDayName('2025-10-06')).toBe('monday')
    expect(getDayName('2025-10-07')).toBe('tuesday')
    expect(getDayName('2025-10-08')).toBe('wednesday')
    expect(getDayName('2025-10-09')).toBe('thursday')
    expect(getDayName('2025-10-10')).toBe('friday')
    expect(getDayName('2025-10-11')).toBe('saturday')
  })

  it('should convert day name to number', () => {
    expect(dayNameToNumber('sunday')).toBe(0)
    expect(dayNameToNumber('monday')).toBe(1)
    expect(dayNameToNumber('tuesday')).toBe(2)
    expect(dayNameToNumber('wednesday')).toBe(3)
    expect(dayNameToNumber('thursday')).toBe(4)
    expect(dayNameToNumber('friday')).toBe(5)
    expect(dayNameToNumber('saturday')).toBe(6)
  })

  it('should handle case-insensitive day names', () => {
    expect(dayNameToNumber('MONDAY')).toBe(1)
    expect(dayNameToNumber('Friday')).toBe(5)
  })

  it('should return -1 for invalid day name', () => {
    expect(dayNameToNumber('invalid')).toBe(-1)
  })
})

describe('Date Utils - Range and Filtering', () => {
  it('should generate date range', () => {
    const range = getDateRange('2025-10-01', '2025-10-05')
    expect(range).toHaveLength(5)
    expect(formatToISO(range[0])).toBe('2025-10-01')
    expect(formatToISO(range[4])).toBe('2025-10-05')
  })

  it('should filter dates by day of week', () => {
    const range = getDateRange('2025-10-05', '2025-10-11') // Sunday to Saturday
    const mondaysAndFridays = filterByDayOfWeek(range, [1, 5]) // Monday and Friday
    expect(mondaysAndFridays).toHaveLength(2)
    expect(getDayOfWeek(mondaysAndFridays[0])).toBe(1) // Monday
    expect(getDayOfWeek(mondaysAndFridays[1])).toBe(5) // Friday
  })

  it('should filter weekends only', () => {
    const range = getDateRange('2025-10-05', '2025-10-11')
    const weekends = filterByDayOfWeek(range, [0, 6]) // Sunday and Saturday
    expect(weekends).toHaveLength(2)
  })
})

describe('Date Utils - Time Operations', () => {
  it('should create date with specific time', () => {
    const date = new Date(2025, 9, 3)
    const result = createDateWithTime(date, 14, 30, 45)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getSeconds()).toBe(45)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('should create date with default time (00:00:00)', () => {
    const date = new Date(2025, 9, 3)
    const result = createDateWithTime(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('should get start of day', () => {
    const date = new Date(2025, 9, 3, 14, 30, 45)
    const result = getStartOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('should get end of day', () => {
    const date = new Date(2025, 9, 3, 14, 30, 45)
    const result = getEndOfDay(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
  })
})

describe('Date Utils - Date Arithmetic', () => {
  it('should add days to date', () => {
    const date = new Date(2025, 9, 3)
    const result = addDaysToDate(date, 5)
    expect(formatToISO(result)).toBe('2025-10-08')
  })

  it('should subtract days from date', () => {
    const date = new Date(2025, 9, 3)
    const result = addDaysToDate(date, -5)
    expect(formatToISO(result)).toBe('2025-09-28')
  })

  it('should add weeks to date', () => {
    const date = new Date(2025, 9, 3)
    const result = addWeeksToDate(date, 2)
    expect(formatToISO(result)).toBe('2025-10-17')
  })

  it('should add months to date', () => {
    const date = new Date(2025, 9, 3)
    const result = addMonthsToDate(date, 3)
    expect(formatToISO(result)).toBe('2026-01-03')
  })

  it('should handle date arithmetic with strings', () => {
    const result = addDaysToDate('2025-10-03', 7)
    expect(formatToISO(result)).toBe('2025-10-10')
  })
})

describe('Date Utils - Comparisons', () => {
  it('should check if date is before another', () => {
    expect(isBeforeDate('2025-10-01', '2025-10-03')).toBe(true)
    expect(isBeforeDate('2025-10-05', '2025-10-03')).toBe(false)
  })

  it('should check if date is after another', () => {
    expect(isAfterDate('2025-10-05', '2025-10-03')).toBe(true)
    expect(isAfterDate('2025-10-01', '2025-10-03')).toBe(false)
  })

  it('should check if dates are same day', () => {
    const date1 = new Date(2025, 9, 3, 10, 0)
    const date2 = new Date(2025, 9, 3, 20, 0)
    expect(isSameDayDate(date1, date2)).toBe(true)
  })

  it('should check if dates are different days', () => {
    expect(isSameDayDate('2025-10-03', '2025-10-04')).toBe(false)
  })

  it('should calculate days difference', () => {
    expect(getDaysDifference('2025-10-10', '2025-10-03')).toBe(7)
    expect(getDaysDifference('2025-10-03', '2025-10-10')).toBe(-7)
  })

  it('should check if date is within interval', () => {
    expect(isDateWithinInterval('2025-10-05', '2025-10-01', '2025-10-10')).toBe(true)
    expect(isDateWithinInterval('2025-10-15', '2025-10-01', '2025-10-10')).toBe(false)
  })

  it('should check interval boundaries', () => {
    expect(isDateWithinInterval('2025-10-01', '2025-10-01', '2025-10-10')).toBe(true)
    expect(isDateWithinInterval('2025-10-10', '2025-10-01', '2025-10-10')).toBe(true)
  })
})

describe('Date Utils - Month and Year', () => {
  it('should get month number (0-indexed)', () => {
    const date = new Date(2025, 9, 3) // October
    expect(getMonthNumber(date)).toBe(9)
  })

  it('should get year number', () => {
    const date = new Date(2025, 9, 3)
    expect(getYearNumber(date)).toBe(2025)
  })

  it('should create date from year, month, day', () => {
    const date = createDate(2025, 9, 3) // October 3, 2025
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(9)
    expect(date.getDate()).toBe(3)
  })

  it('should get start of year', () => {
    const result = getStartOfYear(2025)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(1)
  })

  it('should get end of year', () => {
    const result = getEndOfYear(2025)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(31)
  })

  it('should get start of month', () => {
    const date = new Date(2025, 9, 15)
    const result = getStartOfMonth(date)
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(9)
  })

  it('should get end of month', () => {
    const date = new Date(2025, 9, 15)
    const result = getEndOfMonth(date)
    expect(result.getDate()).toBe(31) // October has 31 days
    expect(result.getMonth()).toBe(9)
  })
})

describe('Date Utils - Today Operations', () => {
  beforeEach(() => {
    // Mock current date to Oct 21, 2025
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 9, 21, 12, 0, 0))
  })

  it('should get today string', () => {
    const result = getTodayString()
    expect(result).toBe('2025-10-21')
  })

  it('should check if date is today', () => {
    expect(isToday('2025-10-21')).toBe(true)
    expect(isToday('2025-10-20')).toBe(false)
    expect(isToday('2025-10-22')).toBe(false)
  })

  it('should check if date is in the past', () => {
    expect(isPastDate('2025-10-20')).toBe(true)
    expect(isPastDate('2025-10-21')).toBe(false)
    expect(isPastDate('2025-10-22')).toBe(false)
  })

  it('should check if date is in the future', () => {
    expect(isFutureDate('2025-10-22')).toBe(true)
    expect(isFutureDate('2025-10-21')).toBe(false)
    expect(isFutureDate('2025-10-20')).toBe(false)
  })

  vi.useRealTimers()
})

describe('Date Utils - UTC Conversions', () => {
  it('should convert local date to UTC', () => {
    const localDate = new Date(2025, 9, 3, 14, 30, 0)
    const utcDate = toUTCDate(localDate)

    expect(utcDate.getUTCFullYear()).toBe(2025)
    expect(utcDate.getUTCMonth()).toBe(9)
    expect(utcDate.getUTCDate()).toBe(3)
    expect(utcDate.getUTCHours()).toBe(14)
    expect(utcDate.getUTCMinutes()).toBe(30)
  })

  it('should convert date string to UTC', () => {
    const result = dateStringToUTC('2025-10-03')
    expect(result.getUTCFullYear()).toBe(2025)
    expect(result.getUTCMonth()).toBe(9)
    expect(result.getUTCDate()).toBe(3)
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
  })

  it('should convert UTC date to string', () => {
    const utcDate = new Date(Date.UTC(2025, 9, 3, 14, 30, 0))
    const result = utcDateToString(utcDate)
    expect(result).toBe('2025-10-03')
  })

  it('should handle date string in utcDateToString', () => {
    const result = utcDateToString('2025-10-03T14:30:00.000Z')
    expect(result).toBe('2025-10-03')
  })
})

describe('Date Utils - TimeSlot Conversions', () => {
  it('should convert timeslot to UTC', () => {
    // This test is timezone-dependent, so we test the structure
    const result = convertTimeSlotToUTC('2025-10-03', '14:00-15:00')

    expect(result).toHaveProperty('day')
    expect(result).toHaveProperty('timeSlot')
    expect(result.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.timeSlot).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  })

  it('should convert timeslot from UTC', () => {
    const result = convertTimeSlotFromUTC('2025-10-03', '14:00-15:00')

    expect(result).toHaveProperty('day')
    expect(result).toHaveProperty('timeSlot')
    expect(result.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.timeSlot).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  })

  it('should handle timeslot conversion round-trip', () => {
    const original = { day: '2025-10-03', timeSlot: '14:00-15:00' }

    // Convert to UTC and back
    const toUTC = convertTimeSlotToUTC(original.day, original.timeSlot)
    const fromUTC = convertTimeSlotFromUTC(toUTC.day, toUTC.timeSlot)

    // Should return to original (may differ by timezone offset in day)
    expect(fromUTC.timeSlot).toBe(original.timeSlot)
  })

  it('should handle cross-day timeslot conversions', () => {
    // Test late night time that might cross midnight in UTC
    const result = convertTimeSlotToUTC('2025-10-03', '23:00-23:59')

    expect(result.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.timeSlot).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  })
})

describe('Date Utils - Edge Cases', () => {
  it('should handle leap year', () => {
    const feb29 = createDate(2024, 1, 29) // Feb 29, 2024 (leap year)
    expect(feb29.getDate()).toBe(29)
  })

  it('should handle month boundaries when adding days', () => {
    const endOfOct = new Date(2025, 9, 31)
    const result = addDaysToDate(endOfOct, 1)
    expect(result.getMonth()).toBe(10) // November
    expect(result.getDate()).toBe(1)
  })

  it('should handle year boundaries', () => {
    const endOfYear = new Date(2025, 11, 31)
    const result = addDaysToDate(endOfYear, 1)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(1)
  })

  it('should handle February in leap vs non-leap year', () => {
    const feb2024 = getEndOfMonth(new Date(2024, 1, 15))
    const feb2025 = getEndOfMonth(new Date(2025, 1, 15))

    expect(feb2024.getDate()).toBe(29) // 2024 is leap year
    expect(feb2025.getDate()).toBe(28) // 2025 is not
  })
})
