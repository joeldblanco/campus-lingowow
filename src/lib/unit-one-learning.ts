/** Reviewed Unit 1 revision. Original media and content identities are retained. */
export const UNIT_ONE_LESSON_ID = 'cmk4otvgp0001w1p4ijdkv6i2'
export const UNIT_ONE_LEARNING_REVISION = 'dual-mode-v1'
export interface UnitOneContentRow {
  id: string
  order: number
  data: Record<string, unknown>
  lessonId: string
  title?: string | null
  contentType?: string
}

const NEW_IDS = ['unit1-introductions-v1', 'unit1-contact-v1', 'unit1-questions-v1', 'unit1-sentences-v1', 'unit1-conversation-v1']
export const UNIT_ONE_NEW_CONTENT_IDS = NEW_IDS
const SEQUENCE = [
  '448e4bb1-e411-482d-8e51-7487b209fb45', 'e03d6044-8e65-4013-8e3b-bb696b23dfb6',
  NEW_IDS[0], 'dev-unit1-interleaved-vocabulary', NEW_IDS[1], 'block_1768882120327',
  'block_1768233937020', 'block_1768234904236', NEW_IDS[2], 'dev-unit1-interleaved-to-be',
  NEW_IDS[3], 'b0f06be9-2457-4552-a1a6-37cc0f606604', 'dev-unit1-interleaved-possessives',
  'block_1768953748231', 'block_1768234652918', 'dev-unit1-interleaved-reading',
  '37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b', '92983cec-2105-41d9-a47b-7fc00acba4e3',
  '2f05bcbc-d5c9-4cbc-9a80-849d1d20b563', NEW_IDS[4], '8add680e-7b45-49fa-b111-479c628df5b5',
  'block_1768955778828',
]
const scene = (name: string) => `/images/lessons/this-is-me/dual-mode/${name}.webp`
const settings: Record<string, Record<string, unknown>> = {
  [SEQUENCE[0]]: { scene: scene('intro-dialogue'), sceneSide: 'left', unit1Role: 'intro-audio-notes' },
  [SEQUENCE[1]]: { scene: scene('intro-dialogue'), sceneSide: 'left', guidedTitles: ['Conoce a Jake y Pete.', 'En la misma clase.', '¿Dónde viven?'] },
  [NEW_IDS[0]]: { scene: scene('introductions'), unit1Role: 'introductions', guidedTitle: 'Así te presentas.' },
  'dev-unit1-interleaved-vocabulary': { scene: '/images/lessons/this-is-me/study-room-v3.webp', guidedTitle: 'Identifica el dato.' },
  [NEW_IDS[1]]: { scene: scene('contact'), unit1Role: 'contact', guidedTitle: 'Comparte tus datos.' },
  'block_1768233937020': { scene: scene('transform'), unit1Role: 'transform', guidedTitle: 'Transforma la frase.' },
  'block_1768234904236': { scene: scene('transform'), unit1Role: 'transform' },
  [NEW_IDS[2]]: { scene: scene('questions'), unit1Role: 'questions', guidedTitle: 'Pregunta sobre otra persona.' },
  'dev-unit1-interleaved-to-be': { scene: '/images/lessons/backgrounds/library.webp' },
  [NEW_IDS[3]]: { scene: scene('sentences'), unit1Role: 'sentences', guidedTitle: 'Crea tus frases.' },
  'b0f06be9-2457-4552-a1a6-37cc0f606604': { scene: scene('possessives'), unit1Role: 'possessives', guidedTitle: '¿De quién hablamos?' },
  'dev-unit1-interleaved-possessives': { scene: '/images/lessons/backgrounds/bakery.webp' },
  'block_1768234652918': { scene: '/images/lessons/this-is-me/carl.webp' },
  'dev-unit1-interleaved-reading': { scene: scene('reading-practice'), unit1Role: 'reading-practice', guidedTitle: 'Comprende a Carl.' },
  '37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b': { scene: '/images/lessons/backgrounds/listening-lounge.webp' },
  '92983cec-2105-41d9-a47b-7fc00acba4e3': { scene: '/images/lessons/backgrounds/listening-lounge.webp' },
  '2f05bcbc-d5c9-4cbc-9a80-849d1d20b563': { scene: scene('profile'), unit1Role: 'profile', guidedTitle: 'Escribe tu perfil.' },
  [NEW_IDS[4]]: { scene: scene('conversation'), unit1Role: 'conversation', guidedTitle: 'Ahora, conversa.' },
  '8add680e-7b45-49fa-b111-479c628df5b5': { scene: scene('presentation'), unit1Role: 'presentation', guidedTitle: 'Ahora, preséntate.' },
}
const roles = ['introductions', 'contact', 'questions', 'sentences', 'conversation']
const labels = ['Así te presentas', 'Comparte tus datos', 'Pregunta sobre otra persona', 'Crea tus frases', 'Ahora, conversa']
const additions: UnitOneContentRow[] = NEW_IDS.map((id, index) => ({
  id, lessonId: UNIT_ONE_LESSON_ID, order: SEQUENCE.indexOf(id), title: labels[index], contentType: 'RICH_TEXT',
  data: {
    type: index === 3 ? 'essay' : index === 4 ? 'recording' : 'text',
    title: labels[index], content: '',
    ...(index === 3 ? { prompt: 'Escribe ocho frases sobre ti y otras personas. Usa to be y posesivos.', aiGrading: true, aiGradingConfig: { language: 'english', targetLevel: 'A1' } } : {}),
    ...(index === 4 ? { instruction: 'Responde cinco preguntas sobre ti y haz una pregunta de vuelta.', timeLimit: 120, aiGrading: true, aiGradingConfig: { language: 'english', targetLevel: 'A1' } } : {}),
    data: { unit1Role: roles[index] },
  },
}))

/** Never substitute invented Peter facts for the unchanged opening conversation. */
export const UNIT_ONE_AUDIO_FACTS = [
  ['Jake’s name', 'Jake', 'User'], ['His classmate', 'Pete', 'Users'], ['Age', 'Both are 17', 'Calendar'],
  ['Occupation', 'Students', 'Briefcase'], ['Address', 'Jackson Avenue', 'MapPin'], ['Class', 'They are in the same class', 'BookOpen'],
  ['Jake’s street', '6th Street', 'MapPin'], ['Pete’s street', '8th Street', 'MapPin'], ['Greeting', 'Nice to meet you', 'MessageCircle'],
] as const

export function reviseUnitOneContent(rows: UnitOneContentRow[]): UnitOneContentRow[] {
  if (rows.some(row => row.lessonId !== UNIT_ONE_LESSON_ID)) throw new Error('Unexpected lesson')
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate content identity')
  const existing = new Map(rows.map(row => [row.id, row]))
  const originals = SEQUENCE.filter(id => !NEW_IDS.includes(id))
  if (rows.some(row => !SEQUENCE.includes(row.id)) || originals.some(id => !existing.has(id))) throw new Error('Unexpected Unit 1 inventory')
  for (const row of additions) if (!existing.has(row.id)) existing.set(row.id, row)
  return SEQUENCE.map((id, order) => {
    const row = existing.get(id)!
    const data = structuredClone(row.data)
    const metadata = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : {}
    data.data = { ...metadata, learningRevision: UNIT_ONE_LEARNING_REVISION, ...settings[id] }
    if (id === SEQUENCE[1]) {
      if (!metadata.originalVocabulary) (data.data as Record<string, unknown>).originalVocabulary = structuredClone(data.items)
      data.items = UNIT_ONE_AUDIO_FACTS.map(([term, definition, icon], index) => ({ id: `opening-audio-v1-${index}`, term, definition, icon }))
      data.title = 'Jake y Pete'
    }
    if (id === SEQUENCE[0]) data.prompt = 'Escucha cómo se presentan Jake y Pete.'
    if (id === '2f05bcbc-d5c9-4cbc-9a80-849d1d20b563') {
      data.prompt = 'Escribe tu perfil en inglés: nombre, edad, procedencia, ocupación y contacto. Usa de 30 a 50 palabras.'
      data.minWords = 30; data.maxWords = 50
    }
    if (id === 'dev-unit1-interleaved-reading') {
      const meta = data.data as Record<string, unknown>
      if (!metadata.originalReadingItems) meta.originalReadingItems = structuredClone(data.items)
      const fourthOptions: Record<string, string> = {
        'carl-age': '25 years old', 'carl-origin': 'Canada', 'carl-location': 'Argentina',
        'carl-job': 'An architect', 'carl-house': 'Rio de Janeiro',
      }
      const oldItems = data.items as Array<{ id: string; question: string; options: Array<{ id: string; text: string }>; correctOptionId: string }>
      data.items = oldItems.filter(item => !['carl-contact-phone-v1', 'carl-contact-email-v1'].includes(item.id)).map(item => ({
        ...item, options: item.options.length >= 4 ? item.options : [...item.options, { id: `${item.id}-fourth`, text: fourthOptions[item.id] || 'Not mentioned' }],
      })).concat([
        { id: 'carl-contact-phone-v1', question: 'What is Carl’s telephone number?', options: [{ id: 'phone-a', text: '+55 789 452 321' }, { id: 'phone-b', text: '+55 789 425 321' }, { id: 'phone-c', text: '+55 798 452 321' }, { id: 'phone-d', text: '+55 789 452 312' }], correctOptionId: 'phone-a' },
        { id: 'carl-contact-email-v1', question: 'What is Carl’s email address?', options: [{ id: 'email-a', text: 'carlj@hotmail.com' }, { id: 'email-b', text: 'carlj@gmail.com' }, { id: 'email-c', text: 'carl@hotmail.com' }, { id: 'email-d', text: 'carlj@yahoo.com' }], correctOptionId: 'email-a' },
      ]).sort((left, right) => Number(right.id === 'carl-contact-email-v1') - Number(left.id === 'carl-contact-email-v1'))
    }
    if (id === '8add680e-7b45-49fa-b111-479c628df5b5') {
      data.instruction = 'Preséntate en inglés. Di quién eres, de dónde vienes y cómo contactarte.'
      data.prompt = data.instruction
      data.timeLimit = 60
    }
    return { ...row, order, data }
  })
}
