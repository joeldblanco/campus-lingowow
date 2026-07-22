import { describe, it, expect } from 'vitest'
import {
  getClassStartAndEnd,
  isClassTimeReached,
  isClassFinished,
  getClassTimeLabel,
} from './class-timing'

describe('class-timing helpers', () => {
  const classDate = '2026-07-21'
  const classTime = '20:00 - 20:40'

  it('parses start and end date objects correctly', () => {
    const { start, end } = getClassStartAndEnd(classDate, classTime)
    expect(start.getHours()).toBe(20)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(20)
    expect(end.getMinutes()).toBe(40)
  })

  it('detects when class is finished after end time', () => {
    // 22:54 on the same day is past 20:40
    const now = new Date(2026, 6, 21, 22, 54, 0, 0)
    expect(isClassFinished(classDate, classTime, now)).toBe(true)
    expect(isClassTimeReached(classDate, classTime, now)).toBe(false)
    expect(getClassTimeLabel(classDate, classTime, now)).toBe('Clase finalizada')
  })

  it('allows joining during class time (e.g. 20:15)', () => {
    const now = new Date(2026, 6, 21, 20, 15, 0, 0)
    expect(isClassFinished(classDate, classTime, now)).toBe(false)
    expect(isClassTimeReached(classDate, classTime, now)).toBe(true)
    expect(getClassTimeLabel(classDate, classTime, now)).toBe('Tu clase está empezando')
  })

  it('shows minutes remaining before class starts (e.g. 19:45)', () => {
    const now = new Date(2026, 6, 21, 19, 45, 0, 0)
    expect(isClassFinished(classDate, classTime, now)).toBe(false)
    expect(isClassTimeReached(classDate, classTime, now)).toBe(false)
    expect(getClassTimeLabel(classDate, classTime, now)).toBe('Tu clase empieza en 15 min')
  })

  it('shows hours remaining when more than 60 minutes away (e.g. 17:00)', () => {
    const now = new Date(2026, 6, 21, 17, 0, 0, 0)
    expect(isClassFinished(classDate, classTime, now)).toBe(false)
    expect(isClassTimeReached(classDate, classTime, now)).toBe(false)
    expect(getClassTimeLabel(classDate, classTime, now)).toBe('Tu clase empieza en 3 horas')
  })
})
