import { describe, expect, it } from 'vitest'

import { formatFirstName, formatFullName, formatUserName } from './name-formatter'

describe('name-formatter', () => {
  it('capitalizes each word and lowercases the remaining characters', () => {
    expect(formatFirstName('jOEL rodRÍGUEZ')).toBe('Joel Rodríguez')
  })

  it('normalizes extra whitespace and compound surnames', () => {
    expect(formatFullName('  maria   eugenia ', ' dE   la   crUz ')).toBe('Maria Eugenia De La Cruz')
  })

  it('capitalizes hyphenated and apostrophe-separated names', () => {
    expect(formatFullName("aNNa-maRia", "o'cONNOR")).toBe("Anna-Maria O'Connor")
  })

  it('supports user objects and missing parts without leading spaces', () => {
    expect(formatUserName({ name: null, lastName: 'péREZ' })).toBe('Pérez')
  })
})