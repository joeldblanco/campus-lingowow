import { describe, expect, it } from 'vitest'
import { shuffleGuidedChoices } from './shuffle-guided-choices'

describe('guided choice ordering', () => {
  const choices = [{ id: 'correct' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  it('preserves all option identities without mutating the authored data', () => {
    const original = [...choices]
    const ordered = shuffleGuidedChoices(choices, 'listening-33-question-1')
    expect(new Set(ordered.map(choice => choice.id))).toEqual(new Set(choices.map(choice => choice.id)))
    expect(choices).toEqual(original)
    expect(ordered.find(choice => choice.id === 'correct')).toBe(choices[0])
  })
  it('keeps options stable while a question is answered or revisited', () => {
    expect(shuffleGuidedChoices(choices, 'same-question')).toEqual(shuffleGuidedChoices(choices, 'same-question'))
  })
  it('does not always put the correct authored first option in the first position', () => {
    const positions = Array.from({ length: 20 }, (_, index) =>
      shuffleGuidedChoices(choices, `listening-question-${index}`).findIndex(choice => choice.id === 'correct'))
    expect(new Set(positions).size).toBeGreaterThan(2)
    expect(positions.some(position => position > 0)).toBe(true)
  })
})
