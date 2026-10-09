import { describe, expect, it } from 'vitest'
import {
  buildGuidedMatchOptions,
  prepareGuidedMatchPairs,
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

describe('personal data identification', () => {
  it('asks for data types using varied contextual examples, not Peter profile recall', () => {
    const prepared = prepareGuidedMatchPairs(pilotPairs)
    expect(prepared.map(pair => pair.id)).toEqual(pilotPairs.map(pair => pair.id))
    expect(prepared[0]).toEqual({ id: 'name', left: 'My first name is Ana.', right: 'Name' })
    expect(prepared[1]).toEqual({ id: 'family', left: 'My surname is Brown.', right: 'Family Name' })
    expect(prepared[4]).toEqual({ id: 'age', left: 'I am 32 years old.', right: 'Age' })
    expect(prepared[7].right).toBe('Phone Number')
    expect(prepared.map(pair => pair.left)).not.toContain('Peter')
    const options = buildGuidedMatchOptions(prepared, { random: () => 0.25 })
    for (const pair of prepared) {
      expect(options[pair.id]).toHaveLength(4)
      expect(options[pair.id]).toContainEqual({ id: pair.id, text: pair.right })
      expect(options[pair.id].every(choice => prepared.some(item => item.right === choice.text))).toBe(true)
    }
  })

  it('preserves unrelated authored exercises and does not mutate source content', () => {
    const before = structuredClone(pilotPairs)
    prepareGuidedMatchPairs(pilotPairs)
    expect(pilotPairs).toEqual(before)
    const unrelated = [{ id: 'color', left: 'Red', right: 'Rojo' }]
    expect(prepareGuidedMatchPairs(unrelated)).toEqual(unrelated)
  })
})

describe('guided match option generation', () => {
  it('creates four unique category choices and always includes the correct type', () => {
    expect(isPilotGuidedMatchProfile(pilotPairs)).toBe(true)

    const prepared = prepareGuidedMatchPairs(pilotPairs)
    const options = buildGuidedMatchOptions(prepared, { random: () => 0.25 })

    for (const pair of prepared) {
      const choices = options[pair.id]
      expect(choices).toHaveLength(4)
      expect(new Set(choices.map((choice) => choice.text)).size).toBe(4)
      expect(choices).toContainEqual({ id: pair.id, text: pair.right })
    }


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
    expect(choices.one).toContainEqual({ id: 'one', text: 'Alpha' })
    expect(choices.one.every(choice => pairs.some(pair => pair.right === choice.text))).toBe(true)
    expect(Object.values(choices).flat().map((choice) => choice.text)).not.toContain('Lucas')
  })

  it('uses deterministic ordering when given a deterministic random source', () => {
    const first = buildGuidedMatchOptions(prepareGuidedMatchPairs(pilotPairs), { random: () => 0.42 })
    const second = buildGuidedMatchOptions(prepareGuidedMatchPairs(pilotPairs), { random: () => 0.42 })

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
