import { ACTIONS, STATUS } from 'react-joyride'
import { describe, expect, it } from 'vitest'
import { shouldPersistTourCompletion } from './tour-completion'

describe('shouldPersistTourCompletion', () => {
  it.each([
    { status: STATUS.FINISHED, action: ACTIONS.NEXT },
    { status: STATUS.SKIPPED, action: ACTIONS.SKIP },
    { status: STATUS.RUNNING, action: ACTIONS.CLOSE },
  ])('persists the tour for $status / $action', ({ status, action }) => {
    expect(shouldPersistTourCompletion(status, action)).toBe(true)
  })

  it('does not persist while the student is still moving through the tour', () => {
    expect(shouldPersistTourCompletion(STATUS.RUNNING, ACTIONS.NEXT)).toBe(false)
  })
})
