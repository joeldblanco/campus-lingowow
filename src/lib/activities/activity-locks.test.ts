import { describe, it, expect } from 'vitest'
import { computeActivityLocks } from './activity-locks'

describe('computeActivityLocks', () => {
  it('returns an empty array for no activities', () => {
    expect(computeActivityLocks([])).toEqual([])
  })

  it('leaves a single activity unlocked', () => {
    expect(computeActivityLocks([{ completed: false }])).toEqual([false])
  })

  it('unlocks only the first activity when none are completed', () => {
    const locks = computeActivityLocks([
      { completed: false },
      { completed: false },
      { completed: false },
    ])
    expect(locks).toEqual([false, true, true])
  })

  it('unlocks the next activity once its predecessor is completed', () => {
    const locks = computeActivityLocks([
      { completed: true }, // done -> unlocks index 1
      { completed: false }, // not done -> index 2 stays locked
      { completed: false },
    ])
    expect(locks).toEqual([false, false, true])
  })

  it('keeps every activity unlocked when all predecessors are completed', () => {
    const locks = computeActivityLocks([
      { completed: true },
      { completed: true },
      { completed: true },
    ])
    expect(locks).toEqual([false, false, false])
  })

  it('re-locks the chain after the first incomplete activity', () => {
    const locks = computeActivityLocks([
      { completed: true }, // idx0 unlocked
      { completed: true }, // idx1 unlocked (idx0 done)
      { completed: false }, // idx2 unlocked (idx1 done) but blocks idx3
      { completed: false }, // idx3 locked (idx2 not done)
    ])
    expect(locks).toEqual([false, false, false, true])
  })
})
