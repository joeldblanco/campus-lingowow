import { describe, it, expect } from 'vitest'
import { getRequiredScheduleBlocks, validateScheduleBlocks } from './enrollment-blocks'

describe('getRequiredScheduleBlocks', () => {
  it('returns null when the plan does not include classes', () => {
    expect(
      getRequiredScheduleBlocks({ includesClasses: false, classesPerWeek: 2 }, true)
    ).toBeNull()
  })

  it('returns null for a missing plan', () => {
    expect(getRequiredScheduleBlocks(null, true)).toBeNull()
    expect(getRequiredScheduleBlocks(undefined, false)).toBeNull()
  })

  it('uses classesPerWeek for recurring schedules', () => {
    expect(
      getRequiredScheduleBlocks(
        { includesClasses: true, classesPerWeek: 2, classesPerPeriod: 8 },
        true
      )
    ).toBe(2)
  })

  it('uses classesPerPeriod for non-recurring schedules', () => {
    expect(
      getRequiredScheduleBlocks(
        { includesClasses: true, classesPerWeek: 2, classesPerPeriod: 8 },
        false
      )
    ).toBe(8)
  })

  it('falls back to the other field when the primary is missing', () => {
    expect(
      getRequiredScheduleBlocks({ includesClasses: true, classesPerPeriod: 8 }, true)
    ).toBe(8)
  })

  it('treats zero / negative counts as no requirement', () => {
    expect(getRequiredScheduleBlocks({ includesClasses: true, classesPerWeek: 0 }, true)).toBeNull()
  })
})

describe('validateScheduleBlocks', () => {
  const plan = { includesClasses: true, classesPerWeek: 2, classesPerPeriod: 8 }

  it('blocks creation when fewer blocks than required are selected', () => {
    const error = validateScheduleBlocks(1, plan, true)
    expect(error).not.toBeNull()
    expect(error).toContain('2')
  })

  it('allows creation when the required number of blocks is selected', () => {
    expect(validateScheduleBlocks(2, plan, true)).toBeNull()
  })

  it('allows creation when more than required are selected', () => {
    expect(validateScheduleBlocks(3, plan, true)).toBeNull()
  })

  it('does not enforce anything when there is no requirement', () => {
    expect(validateScheduleBlocks(0, { includesClasses: false }, true)).toBeNull()
  })
})
