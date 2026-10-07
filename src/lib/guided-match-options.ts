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
  pilotProfile?: boolean
  blockId?: string
}

export const UNIT_ONE_GUIDED_MATCH_BLOCK_ID = 'dev-unit1-interleaved-vocabulary'

const PILOT_PROFILE: Readonly<Record<string, readonly string[]>> = {
  name: ['Lucas', 'Carl', 'Jake'],
  family: ['Johnson', 'Brown', 'Davis'],
  occupation: ['Student', 'Engineer', 'Doctor'],
  spelling: ['P-A-T-E-R', 'P-E-T-A-R', 'P-E-T-E-R-R'],
  age: ['19 years old', '21 years old', '22 years old'],
  origin: ['Canada', 'Mexico', 'The UK'],
  address: ['Lincoln Avenue, 21st', 'Lincoln Avenue, 24th', 'Oak Street, 23rd'],
  phone: ['01 154 8594', '01 154 8595', '01 154 8596'],
  marital: [
    'I am single but Jake is married',
    'I am married and Jake is married',
    'I am single and Jake is single',
  ],
}

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

/**
 * The authored Unit 1 profile is the only content for which we create
 * distractors. Every other match block is restricted to its authored right
 * values, so an unknown block never receives invented answers.
 */
export function isPilotGuidedMatchProfile(
  pairs: readonly GuidedMatchPair[],
  blockId?: string
): boolean {
  if (blockId === UNIT_ONE_GUIDED_MATCH_BLOCK_ID) return true
  if (pairs.length !== Object.keys(PILOT_PROFILE).length) return false

  const found = new Set<string>()

  for (const pair of pairs) {
    const category = categoryForLabel(pair.left)
    if (category && PILOT_CORRECT_VALUES[category] === pair.right.trim()) {
      found.add(category)
    }
  }

  return found.size === Object.keys(PILOT_PROFILE).length
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
  pilotProfile: boolean
): GuidedMatchChoice[] {
  const correctChoice: GuidedMatchChoice = { id: pair.id, text: pair.right }
  const authoredDistractors = pairs
    .filter((candidate) => candidate.id !== pair.id)
    .map((candidate) => ({
      id: `guided-match:${pair.id}:${candidate.id}`,
      text: candidate.right,
    }))

  const category = categoryForLabel(pair.left)
  const pilotDistractors =
    pilotProfile && category
      ? PILOT_PROFILE[category].map((text, index) => ({
          id: `guided-match:${pair.id}:pilot-${index + 1}`,
          text,
        }))
      : []

  return uniqueChoices([correctChoice, ...pilotDistractors, ...authoredDistractors]).slice(0, 4)
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
  const pilotProfile = config.pilotProfile ?? isPilotGuidedMatchProfile(pairs, config.blockId)

  return Object.fromEntries(
    pairs.map((pair) => [pair.id, shuffle(choicesForPair(pairs, pair, pilotProfile), random)])
  )
}
