import { describe, expect, it } from 'vitest'
import {
  buildGuidedMatchOptions,
  isPilotGuidedMatchProfile,
  type GuidedMatchPair,
} from './guided-match-options'

const pilotPairs: GuidedMatchPair[] = [
  { id: 'name', left: 'Name', right: 'Peter' },
  { id: 'family', left: 'Family Name', right: 'Smith' },
  { id: 'occupation', left: 'Occupation', right: 'Teacher' },
  { id: 'spelling', left: 'Spelling', right: 'P-E-T-E-R' },
  { id: 'age', left: 'Age', right: '20 years old' },
  { id: 'origin', left: 'Origin', right: 'The US' },
  { id: 'address', left: 'Address', right: 'Lincoln Avenue, 23rd' },
  { id: 'phone', left: 'Phone/Mail', right: '01 154 8593' },
  { id: 'marital', left: 'Marital Status', right: 'I am married but Jake is single' },
]

describe('guided match option generation', () => {
  it('creates four unique pilot choices and always includes the authored answer', () => {
    expect(isPilotGuidedMatchProfile(pilotPairs)).toBe(true)

    const options = buildGuidedMatchOptions(pilotPairs, { random: () => 0.25 })

    for (const pair of pilotPairs) {
      const choices = options[pair.id]
      expect(choices).toHaveLength(4)
      expect(new Set(choices.map((choice) => choice.text)).size).toBe(4)
      expect(choices).toContainEqual({ id: pair.id, text: pair.right })
    }

    expect(options.name.map((choice) => choice.text)).toEqual(
      expect.arrayContaining(['Lucas', 'Carl', 'Jake'])
    )
    expect(options.occupation.map((choice) => choice.text)).toEqual(
      expect.arrayContaining(['Student', 'Engineer', 'Doctor'])
    )
  })

  it('keeps unknown blocks authored-only and caps their available choices at four', () => {
    const pairs: GuidedMatchPair[] = [
      { id: 'one', left: 'One', right: 'Alpha' },
      { id: 'two', left: 'Two', right: 'Beta' },
      { id: 'three', left: 'Three', right: 'Gamma' },
      { id: 'four', left: 'Four', right: 'Delta' },
      { id: 'five', left: 'Five', right: 'Epsilon' },
    ]

    const choices = buildGuidedMatchOptions(pairs, { random: () => 0 })

    expect(isPilotGuidedMatchProfile(pairs)).toBe(false)
    expect(choices.one).toHaveLength(4)
    expect(choices.one.map((choice) => choice.text)).toEqual(
      expect.arrayContaining(['Alpha', 'Beta', 'Gamma', 'Delta'])
    )
    expect(Object.values(choices).flat().map((choice) => choice.text)).not.toContain('Lucas')
  })

  it('uses deterministic ordering when given a deterministic random source', () => {
    const first = buildGuidedMatchOptions(pilotPairs, { random: () => 0.42 })
    const second = buildGuidedMatchOptions(pilotPairs, { random: () => 0.42 })

    expect(second).toEqual(first)
  })

  it('does not classify unrelated labels such as Language as the age field', () => {
    const editedPairs = pilotPairs.map((pair) =>
      pair.id === 'age' ? { ...pair, left: 'Language' } : pair
    )

    expect(isPilotGuidedMatchProfile(editedPairs)).toBe(false)
    const ageChoices = buildGuidedMatchOptions(editedPairs, { random: () => 0 }).age
    expect(ageChoices).toHaveLength(4)
    expect(ageChoices.map((choice) => choice.text)).not.toEqual(
      expect.arrayContaining(['19 years old', '21 years old', '22 years old'])
    )
  })
})
