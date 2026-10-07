export interface GuidedMatchPair {
  id: string
  left: string
  right: string
}

export interface GuidedMatchChoice {
  id: string
  text: string
}

export type GuidedMatchRandom = () => number

interface GuidedMatchOptionConfig {
  random?: GuidedMatchRandom
  blockId?: string
}

export const UNIT_ONE_GUIDED_MATCH_BLOCK_ID = 'dev-unit1-interleaved-vocabulary'

const PILOT_CORRECT_VALUES: Readonly<Record<string, string>> = {
  name: 'Peter',
  family: 'Smith',
  occupation: 'Teacher',
  spelling: 'P-E-T-E-R',
  age: '20 years old',
  origin: 'The US',
  address: 'Lincoln Avenue, 23rd',
  phone: '01 154 8593',
  marital: 'I am married but Jake is single',
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function categoryForLabel(label: string): string | undefined {
  const normalized = normalize(label)

  if (normalized === 'name' || normalized === 'first name' || normalized === 'given name') {
    return 'name'
  }
  if (
    normalized === 'family name' ||
    normalized === 'last name' ||
    normalized === 'surname' ||
    normalized === 'family'
  ) {
    return 'family'
  }
  if (normalized.includes('occupation') || normalized === 'job') return 'occupation'
  if (normalized.includes('spelling')) return 'spelling'
  if (normalized === 'age' || /(?:^|\s)age(?:\s|$)/.test(normalized)) return 'age'
  if (normalized.includes('origin') || normalized.includes('nationality')) return 'origin'
  if (normalized.includes('address')) return 'address'
  if (
    normalized.includes('phone') ||
    normalized.includes('mail') ||
    normalized.includes('email')
  ) {
    return 'phone'
  }
  if (normalized.includes('marital') || normalized.includes('marriage')) return 'marital'

  return undefined
}

export function isPilotGuidedMatchProfile(
  pairs: readonly GuidedMatchPair[],
  blockId?: string
): boolean {
  if (blockId === UNIT_ONE_GUIDED_MATCH_BLOCK_ID) return true
  if (pairs.length !== Object.keys(PILOT_CORRECT_VALUES).length) return false

  const found = new Set<string>()

  for (const pair of pairs) {
    const category = categoryForLabel(pair.left)
    if (category && PILOT_CORRECT_VALUES[category] === pair.right.trim()) {
      found.add(category)
    }
  }

  return found.size === Object.keys(PILOT_CORRECT_VALUES).length
}

const PERSONAL_DATA_EXAMPLES: Readonly<Record<string, { example: string; label: string }>> = {
  name: { example: 'My first name is Ana.', label: 'Name' },
  family: { example: 'My surname is Brown.', label: 'Family Name' },
  occupation: { example: 'I work as an engineer.', label: 'Occupation' },
  spelling: { example: 'My name is spelled L-U-C-A-S.', label: 'Spelling' },
  age: { example: 'I am 32 years old.', label: 'Age' },
  origin: { example: 'I am from Canada.', label: 'Origin' },
  address: { example: 'I live at 14 Oak Street.', label: 'Address' },
  phone: { example: 'My phone number is 555 0182.', label: 'Phone Number' },
  marital: { example: 'I am single.', label: 'Marital Status' },
}

/** Teach category recognition in the Unit 1 guided activity, preserving source IDs/content. */
export function prepareGuidedMatchPairs(
  pairs: readonly GuidedMatchPair[],
  blockId?: string
): GuidedMatchPair[] {
  if (!isPilotGuidedMatchProfile(pairs, blockId)) return [...pairs]
  return pairs.map(pair => {
    const category = categoryForLabel(pair.left)
    const content = category && PERSONAL_DATA_EXAMPLES[category]
    return content ? { id: pair.id, left: content.example, right: content.label } : pair
  })
}

function shuffle<T>(items: readonly T[], random: GuidedMatchRandom): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.max(0, Math.min(0.999999, random())) * (index + 1))
    ;[shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]]
  }

  return shuffled
}

function uniqueChoices(choices: readonly GuidedMatchChoice[]): GuidedMatchChoice[] {
  const seenIds = new Set<string>()
  const seenTexts = new Set<string>()

  return choices.filter((choice) => {
    const textKey = normalize(choice.text)
    if (!choice.text.trim() || seenIds.has(choice.id) || seenTexts.has(textKey)) return false
    seenIds.add(choice.id)
    seenTexts.add(textKey)
    return true
  })
}

function choicesForPair(
  pairs: readonly GuidedMatchPair[],
  pair: GuidedMatchPair,
  random: GuidedMatchRandom
): GuidedMatchChoice[] {
  const correctChoice: GuidedMatchChoice = { id: pair.id, text: pair.right }
  const authoredDistractors = uniqueChoices(pairs
    .filter(candidate => candidate.id !== pair.id && normalize(candidate.right) !== normalize(pair.right))
    .map(candidate => ({ id: `guided-match:${pair.id}:${candidate.id}`, text: candidate.right })))
  return [correctChoice, ...shuffle(authoredDistractors, random).slice(0, 3)]
}

/**
 * Build one option list per authored pair. Passing a constant random source
 * gives the SSR/client deterministic order; the component can call this once
 * after hydration with Math.random and cache the returned object.
 */
export function buildGuidedMatchOptions(
  pairs: readonly GuidedMatchPair[],
  config: GuidedMatchOptionConfig = {}
): Record<string, GuidedMatchChoice[]> {
  const random = config.random ?? Math.random

  return Object.fromEntries(
    pairs.map((pair) => [pair.id, shuffle(choicesForPair(pairs, pair, random), random)])
  )
}
