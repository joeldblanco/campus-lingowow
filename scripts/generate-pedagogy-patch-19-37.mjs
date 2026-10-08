import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')
const baselinePath = resolve(root, 'docs/audit/course-builder-learning-draft.json')
const manifestPath = resolve(root, 'docs/audit/course-source-manifest.json')
const outputPath = resolve(root, 'docs/audit/pedagogy/patch-19-37.json')

const MISSING = { $missing: true }
const DELETE = { $delete: true }
const units = Array.from({ length: 19 }, (_, index) => index + 19)
const protectedSegments = new Set([
  'originalIDs',
  'originalSource',
  'sourceText',
  'nativeParagraphs',
  'teacher_notes',
  'audioURL',
  'transcript',
  'SHA',
  'sha256',
  'scenes',
  'sourceSlides',
  'sourceUrl',
  'sourceDigest',
  'learningRevision',
])

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))
const isMissing = (value) => value === undefined

function getAt(object, path) {
  let current = object
  for (const segment of path) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined
    }
    current = current[segment]
  }
  return current
}

function assertNoProtectedPath(path) {
  const forbidden = path.find((segment) => protectedSegments.has(String(segment)))
  if (forbidden) throw new Error(`Attempted to patch immutable field ${forbidden} at ${path.join('.')}`)
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const lessonToUnit = new Map()
for (const source of manifest.sources) {
  const match = String(source.deck?.deckTitle ?? '').match(/Unit\s*(\d+)/i)
  if (match && source.lesson?.id) lessonToUnit.set(source.lesson.id, Number(match[1]))
}

const rowsById = new Map()
const rowsByUnit = new Map()
for (const plan of baseline.plans) {
  const unit = lessonToUnit.get(plan.lessonId)
  if (!unit) continue
  for (const row of plan.nextRows) {
    rowsById.set(row.id, row)
    if (!rowsByUnit.has(unit)) rowsByUnit.set(unit, [])
    rowsByUnit.get(unit).push(row)
  }
}

const patchMap = new Map()
const changedPaths = new Set()

function getRow(unit, rowId) {
  const row = rowsById.get(rowId)
  if (!row) throw new Error(`Unit ${unit}: row ${rowId} was not found in the baseline`)
  if (lessonToUnit.get(row.lessonId) !== unit) {
    throw new Error(`Unit ${unit}: row ${rowId} maps to lesson ${row.lessonId} in another unit`)
  }
  return row
}

function addChange(unit, rowId, reason, path, after) {
  assertNoProtectedPath(path)
  const row = getRow(unit, rowId)
  const key = `${rowId}:${JSON.stringify(path)}`
  if (changedPaths.has(key)) throw new Error(`Duplicate change ${key}`)
  changedPaths.add(key)
  const beforeValue = getAt(row.data, path)
  if (isMissing(beforeValue)) {
    if (after === DELETE) throw new Error(`Cannot delete missing path ${key}`)
  } else if (after !== DELETE && JSON.stringify(beforeValue) === JSON.stringify(after)) {
    throw new Error(`No-op change ${key}`)
  }
  if (!patchMap.has(rowId)) {
    patchMap.set(rowId, {
      unit,
      lessonId: row.lessonId,
      rowId,
      reason,
      changes: [],
    })
  }
  patchMap.get(rowId).changes.push({
    path,
    before: isMissing(beforeValue) ? MISSING : clone(beforeValue),
    after: clone(after),
  })
}

function replaceValue(unit, rowId, reason, path, transform) {
  const row = getRow(unit, rowId)
  const before = getAt(row.data, path)
  if (isMissing(before)) throw new Error(`Expected existing value at ${rowId}:${path.join('.')}`)
  const after = transform(clone(before))
  addChange(unit, rowId, reason, path, after)
}

function replaceString(unit, rowId, reason, path, transform) {
  replaceValue(unit, rowId, reason, path, (before) => {
    if (typeof before !== 'string') throw new Error(`Expected string at ${rowId}:${path.join('.')}`)
    const after = transform(before)
    if (typeof after !== 'string' || after === before) {
      throw new Error(`String transform did not change ${rowId}:${path.join('.')}`)
    }
    return after
  })
}

function replaceObject(unit, rowId, reason, path, transform) {
  replaceValue(unit, rowId, reason, path, (before) => {
    const after = transform(before)
    if (JSON.stringify(after) === JSON.stringify(before)) {
      throw new Error(`Object transform did not change ${rowId}:${path.join('.')}`)
    }
    return after
  })
}

function replaceExactFragment(unit, rowId, reason, path, fragment, replacement) {
  replaceString(unit, rowId, reason, path, (before) => {
    if (!before.includes(fragment)) {
      throw new Error(`Fragment not found at ${rowId}:${path.join('.')}: ${fragment}`)
    }
    return before.replace(fragment, replacement)
  })
}

function addOralTurns(unit, rowId, learnerPrompt, turns) {
  const reason = 'Turn self-study recording into a short, topic-specific oral conversation with clear response scaffolds.'
  const row = getRow(unit, rowId)
  const learnerPath = ['data', 'learnerPrompt']
  if (isMissing(getAt(row.data, learnerPath))) addChange(unit, rowId, reason, learnerPath, learnerPrompt)
  else replaceValue(unit, rowId, reason, learnerPath, () => learnerPrompt)
  const turnsPath = ['data', 'turns']
  if (isMissing(getAt(row.data, turnsPath))) addChange(unit, rowId, reason, turnsPath, turns)
  else replaceValue(unit, rowId, reason, turnsPath, () => turns)
}

function selfStudyModel(model) {
  return `Por tu cuenta, interpreta ambos papeles; con tu profesora, alternen. Modelo: “${model}”`
}

const rows = {
  u19Text: 'course-guided-cmk401if40005l804vf3z3k0q-text-13-at-home-don-t-you-have-a-test-tomorrow-yes-mum-i-start-studying--031',
  u19Oral: 'course-guided-cmk401if40005l804vf3z3k0q-recording-14-d-tell-your-teacher-about-your-common-life-events-likely-to-033',
  u20Text: 'course-guided-cmk401zlh0001js04fn6f881k-text-8-when-we-talk-about-weather-we-do-not-only-use-simple-present-we-c-020',
  u20Oral: 'course-guided-cmk401zlh0001js04fn6f881k-recording-14-d-pretend-you-and-your-teacher-are-friends-and-are-deciding-033',
  u21Table: 'course-guided-cmkq3xx5w0001jr04cw7bh9g7-structured-content-11-we-can-use-present-perfect-tense-to-communicate-di-024',
  u21Oral: 'course-guided-cmkq3xx5w0001jr04cw7bh9g7-recording-16-d-following-the-example-from-the-previous-activity-act-out--035',
  u22Table: 'course-guided-cmkpx0d310001gy04zr4lq99y-structured-content-8-statements-questions-answers-1-you-should-talk-to-h-020',
  u22Oral: 'course-guided-cmkpx0d310001gy04zr4lq99y-recording-14-d-discuss-with-your-teacher-how-people-should-be-when-they--033',
  u23Text: 'course-guided-cmn7vbcg20005l804sg2hxgf4-text-8-people-places-things-all-everybody-everyone-everywhere-everything-022',
  u23Answers: 'course-guided-cmn7vbcg20005l804sg2hxgf4-short-answer-12-a-listen-to-the-audio-and-answer-the-questions-your-teac-029',
  u23Oral: 'course-guided-cmn7vbcg20005l804sg2hxgf4-recording-14-d-tell-your-teacher-about-an-anecdote-from-your-family-or-f-034',
  u24Text: 'course-guided-cmn7vc7pm0001le04qfcuwa27-text-8-we-use-relative-clauses-or-relative-pronouns-to-include-extra-inf-022',
  u24Oral: 'course-guided-cmn7vc7pm0001le04qfcuwa27-recording-14-d-act-out-a-situation-with-your-teacher-where-you-can-expre-034',
  u24Essay: 'course-guided-cmn7vc7pm0001le04qfcuwa27-recording-14-d-act-out-a-situation-with-your-teacher-where-you-can-expre-035',
  u25Answers: 'course-guided-cmnmm9m3i000hw1qklyh7h658-short-answer-13-a-look-at-the-words-in-the-box-and-complete-the-paragrap-029',
  u25Oral: 'course-guided-cmnmm9m3i000hw1qklyh7h658-recording-15-d-following-the-example-from-the-previous-activity-act-out--035',
  u26Table: 'course-guided-cmnmm9mm1000kw1qkgi2bize8-structured-content-11-conditionals-may-have-a-main-purpose-but-they-can--025',
  u26Oral: 'course-guided-cmnmm9mm1000kw1qkgi2bize8-recording-15-d-following-the-example-from-the-previous-activity-act-out--035',
  u27Text: 'course-guided-cmnmm9my8000nw1qkfl8lpdxz-text-13-bullying-how-many-people-do-you-know-that-face-bullying-bullying-032',
  u27Oral: 'course-guided-cmnmm9my8000nw1qkfl8lpdxz-recording-14-d-following-the-example-from-the-previous-activity-act-out--034',
  u28Text: 'course-guided-cmnmm9naj000qw1qkkzistoi6-text-10-we-can-use-the-first-conditional-aiming-the-following-functions--024',
  u28Oral: 'course-guided-cmnmm9naj000qw1qkkzistoi6-recording-14-d-talk-to-your-teacher-about-the-different-life-decisions-y-034',
  u29Oral: 'course-guided-cmnmm9nmo000tw1qkxzhh3pwc-recording-15-d-following-the-example-from-the-previous-activity-act-out--035',
  u29Essay: 'course-guided-cmnmm9nmo000tw1qkxzhh3pwc-recording-15-d-following-the-example-from-the-previous-activity-act-out--036',
  u29Grammar: 'course-guided-cmnmm9nmo000tw1qkxzhh3pwc-text-8-1-verbs-using-infinitives-i-want-to-say-i-m-sorry-they-decided-to-020',
  u30Table: 'course-guided-cmnmm9nyt000ww1qkoxsumpck-structured-content-8-we-need-to-consider-the-following-chart-013',
  u30Examples: 'course-guided-cmnmm9nyt000ww1qkoxsumpck-structured-content-11-when-describing-people-we-can-talk-about-017',
  u30Description: 'course-guided-cmnmm9nyt000ww1qkoxsumpck-structured-content-13-a-describe-the-people-on-the-pictures-follow-the-e-020',
  u30Oral: 'course-guided-cmnmm9nyt000ww1qkoxsumpck-recording-15-d-act-out-the-following-situation-you-and-your-teacher-in-a-030',
  u31Table: 'course-guided-cmnmm9ob2000zw1qkel9nezp5-structured-content-11-there-are-some-functions-that-we-can-cover-when-us-024',
  u31Oral: 'course-guided-cmnmm9ob2000zw1qkel9nezp5-recording-15-d-following-the-example-from-the-previous-activity-name-som-034',
  u32Text: 'course-guided-cmnmm9on70012w1qka03chue1-text-13-giving-it-a-thought-jim-so-have-you-made-your-mind-yet-craig-i-h-030',
  u32Oral: 'course-guided-cmnmm9on70012w1qka03chue1-recording-14-d-following-the-example-from-the-previous-activity-act-out--032',
  u33Rules: 'course-guided-cmnmm9ozb0015w1qkj7gth0wy-structured-content-8-1-to-be-supposed-to-in-my-country-you-are-supposed--020',
  u33Essay: 'course-guided-cmnmm9ozb0015w1qkj7gth0wy-essay-13-i-wasn-t-prepared-for-the-culture-shock-of-being-an-internation-031',
  u33Oral: 'course-guided-cmnmm9ozb0015w1qkj7gth0wy-recording-14-d-following-the-example-from-the-previous-activity-tell-you-033',
  u34Text: 'course-guided-cmnmm9pbg0018w1qkdkv1gbma-text-11-let-s-take-a-look-at-how-we-may-use-this-020',
  u34Oral: 'course-guided-cmnmm9pbg0018w1qkdkv1gbma-recording-15-d-following-the-example-from-the-previous-activity-tell-you-028',
  u35Table: 'course-guided-cmnmm9pns001bw1qki5fh6r0j-structured-content-10-let-s-take-a-look-how-we-may-use-probability-014',
  u35Oral: 'course-guided-cmnmm9pns001bw1qki5fh6r0j-recording-14-d-following-the-example-from-the-previous-activity-tell-you-023',
  u36Text: 'course-guided-cmnmm9q04001ew1qke5tfufyk-text-6-look-at-the-information-where-do-you-think-these-phrases-belong-011',
  u36Oral: 'course-guided-cmnmm9q04001ew1qke5tfufyk-recording-14-d-following-the-example-from-the-previous-activity-tell-you-025',
  u37Rules: 'course-guided-cmnmm9qca001hw1qkpe089f8f-structured-content-8-grammar-examples-observation-1-preferences-non-fini-020',
  u37Functions: 'course-guided-cmnmm9qca001hw1qkpe089f8f-structured-content-11-preferences-can-be-expressed-in-any-tense-and-with-023',
  u37Exercise: 'course-guided-cmnmm9qca001hw1qkpe089f8f-structured-content-13-a-state-8-different-sentences-where-you-state-what-026',
  u37Oral: 'course-guided-cmnmm9qca001hw1qkpe089f8f-recording-15-d-talk-to-your-teacher-what-is-it-that-you-have-always-want-033',
}

// U19: make the dialogue's two visible errors grammatical while preserving its authored situation.
replaceString(19, rows.u19Text, 'Correct learner-visible grammar in the future-event dialogue.', ['content'], (before) => {
  return before
    .replace('this pages', 'these pages')
    .replace('your grandma is on her birthday', 'it is your grandma\'s birthday')
})

// U20: future time phrases are optional when context is clear; show spontaneous decision vs plan.
replaceString(20, rows.u20Text, 'Clarify that future time phrases are optional when context is clear and distinguish will from a prior plan.', ['content'], (before) => {
  if (!before.includes('3. Future Time phrases are also needed.')) throw new Error('U20 rule 3 not found')
  return before
    .replace('3. Future Time phrases are also needed.', '3. A future time phrase may be added when the context does not already make the time clear.')
    .replace('</p><p>Will – Future', '</p><p>Quick decision: “I\'ll take my umbrella.” Prior plan: “I\'m going to take my umbrella because rain is forecast.”</p><p>Will – Future')
})

replaceObject(21, rows.u21Table, 'Separate present-perfect continuous actions that continue from completed present-perfect actions.', ['content'], (before) => ({
  ...before,
  rows: [
    ['1', 'Express actions that started in the past and still continue.', 'They have visited us for two weeks already.'],
    ['', '', 'You have been tall since you were a child.'],
    ['2', 'Talk about actions that happened only once or at certain times.', 'He has just been there once.'],
    ['', '', 'We have stayed at your place many times.'],
    ['3', 'State an action that is still unfinished.', 'We have been waiting for him to change for so long.'],
    ['4', 'Point out a finished action.', '-Why are you so tired?\n-I\'ve finished getting ready for the test.'],
  ],
}))

replaceObject(22, rows.u22Table, 'Make mustn’t, don’t have to, and can’t statements and answers logically consistent.', ['content'], (before) => ({
  ...before,
  rows: [
    ['1', 'You should talk to her.', 'Should I talk to her?', 'Yes, you should talk to her.'],
    ['2', 'We have to be nice to them.', 'Do you have to be nice to them?', 'No, we don’t have to be nice to them.'],
    ['3', 'She mustn’t touch the controls.', 'Must she touch the controls?', 'No, she mustn’t touch the controls.'],
    ['4', 'They can’t act like children.', 'Can they act like children?', 'No, they can’t act like children.'],
  ],
}))

replaceString(23, rows.u23Text, 'Clarify the indefinite-pronoun categories and singular agreement without treating all as a singular-pronoun rule.', ['content'], (before) => {
  const marker = '<p>To Consider'
  const index = before.indexOf(marker)
  if (index < 0) throw new Error('U23 consideration block not found')
  return `${before.slice(0, index)}<p>To consider 1. Indefinite pronouns ending in -body, -one, and -thing refer to people or things without naming them. 2. Pronouns beginning with “any” commonly appear in questions and negative sentences, but they can also appear in positive contexts. 3. Pronouns beginning with “no” already carry a negative meaning. 4. Pronouns ending in -body, -one, and -thing usually take a singular verb: “Everyone is ready.” With all, the verb agrees with the noun after of: “All of the students are ready.”</p>`
})
replaceValue(23, rows.u23Answers, 'Accept valid equivalent indefinite-pronoun answers where the authored blank allows them.', ['items', 1, 'acceptedAnswers'], () => ['somewhere', 'someplace'])
replaceValue(23, rows.u23Answers, 'Accept valid equivalent indefinite-pronoun answers where the authored blank allows them.', ['items', 7, 'acceptedAnswers'], () => ['someone went somewhere to do something', 'somebody went somewhere to do something'])
replaceValue(23, rows.u23Answers, 'Keep the short-answer review key aligned with accepted equivalent indefinite-pronoun answers.', ['data', 'exerciseReviewItems', 0, 'answerItems', 1, 'accepted'], () => ['somewhere', 'someplace'])
replaceValue(23, rows.u23Answers, 'Keep the short-answer review key aligned with accepted equivalent indefinite-pronoun answers.', ['data', 'exerciseReviewItems', 0, 'answerItems', 7, 'accepted'], () => ['someone went somewhere to do something', 'somebody went somewhere to do something'])

replaceString(24, rows.u24Text, 'Teach restrictive and non-restrictive relative clauses with correct punctuation and pronoun choices.', ['content'], (before) => {
  const first = before.slice(0, before.indexOf('<p>To consider</p>'))
  if (!first || !before.includes('<p>To consider</p>')) throw new Error('U24 relative-clause content shape changed')
  return '<p>Use relative clauses to identify someone or something, or to add information.</p><p><strong>Identify:</strong> no commas; use who, which or that. The student who lives here is my friend.</p><p><strong>Add information:</strong> use commas and who or which, not that. Jane, who lives here, is my best friend.</p><p><strong>Reason / manner:</strong> The reason why she left is clear. I know how he did it.</p>'
})
addChange(24, rows.u24Text, 'Give the relative-clause explanation a specific task heading.', ['data', 'guidedTitle'], 'Añade información.')

replaceValue(25, rows.u25Answers, 'Accept the standard unhyphenated spelling variant for the authored adjective blank.', ['items', 1, 'acceptedAnswers'], () => ['never-ending', 'never ending'])
replaceValue(25, rows.u25Answers, 'Give the semantically unusual adjective blank an explicit lexical criterion.', ['items', 1, 'question'], () => 'Complete the descriptive paragraph with the adjective meaning “continuing without end.”')
replaceValue(25, rows.u25Answers, 'Keep the short-answer review key aligned with the valid spelling variant.', ['data', 'exerciseReviewItems', 0, 'answerItems', 1, 'accepted'], () => ['never-ending', 'never ending'])
replaceValue(25, rows.u25Answers, 'Document the source ambiguity while accepting the authored word-bank answer and its spelling variant.', ['data', 'exerciseReviewItems', 0, 'answerItems', 1, 'rationale'], () => 'The source word bank supplies never-ending for the blank; the phrase is semantically unusual, so accept the standard hyphenated or unhyphenated spelling without requiring an invented synonym.')

replaceObject(26, rows.u26Table, 'Replace the ambiguous tidal example and correct the homework collocation in the zero-conditional examples.', ['content'], (before) => {
  const after = clone(before)
  after.rows[3][2] = 'If you leave ice in the sun, it melts.'
  after.rows[4][2] = 'If you leave the room, turn the lights off. Tell Jake to do his homework when you call him.'
  return after
})

replaceString(27, rows.u27Text, 'Correct the bullying passage wording and connect the requested decision to its likely result.', ['content'], (before) => before
  .replace('Bullying has become more popular', 'Bullying has become more widespread')
  .replace('start working values from their homes', 'start instilling values at home')
  .replace('If we want to see some change, we need to start making a difference now.', 'If we decide to act now, we can start making a difference and reduce the harm bullying causes.'))

replaceString(28, rows.u28Text, 'Label the hypothetical advice example as second conditional and contrast it with a real first-conditional possibility.', ['content'], (before) => before
  .replace('We can use the first conditional aiming the following functions or aspects', 'We can use the second conditional to discuss hypothetical situations and advice.')
  .replace('<p>To consider Second Conditional can also be used to give advice to people. E.G: If I were you, I would not do that.</p>', '<p>Use the first conditional for a real future possibility: If I study, I will pass. Use the second conditional for hypothetical advice: If I were you, I would not do that.</p>'))

replaceString(29, rows.u29Oral, 'Correct the D oral prompt wording before adding its topic-specific conversation scaffolds.', ['instruction'], (before) => {
  if (!before.includes('essentials human needs')) throw new Error('U29 D prompt wording changed')
  return 'D. Discuss essential human needs with your teacher and express your opinions where relevant.'
})
addChange(29, rows.u29Oral, 'Enable the topic-specific oral turns in the self-study conversation renderer.', ['data', 'guidedRole'], 'conversation')
replaceExactFragment(29, rows.u29Grammar, 'Correct the keep on example so the gerund pattern is complete.', ['content'], 'They decided to keep on that.', 'They decided to keep on doing that.')
addOralTurns(29, rows.u29Oral, 'Discuss essential human needs and everyday opinions with a partner.', [
  { id: 'scenario', question: 'Which essential human need matters in your daily life?', answerPrompt: selfStudyModel('People need rest every day.') },
  { id: 'follow-up', question: 'What can make that need difficult to meet?', answerPrompt: 'Describe one situation and its effect.' },
  { id: 'question', question: 'Ask your partner about an essential human need.', answerPrompt: 'Ask and answer one clear question.' },
])
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['instruction'], 'E. Write 80–120 words about a difficult situation in your life or someone else’s. Include opinions, ideas, and apologies where needed; explain what happened and whether it is solved.')
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['type'], 'essay')
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['prompt'], 'Write 80–120 words about a difficult situation. Explain what happened, whether it is solved, and the relevant opinions, ideas, or apologies.')
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['minWords'], 80)
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['maxWords'], 120)
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'guidedTitle'], 'Cuenta qué ocurrió.')
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'learnerPrompt'], 'Write 80–120 words about a difficult situation. Explain what happened, whether it is solved, and the relevant opinions, ideas, or apologies.')
replaceString(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'aiGradingContext'], (before) => `${before}\n\nEvaluation guidance: Treat this as writing. Check the 80–120 word range, a clear situation, what happened, whether it is solved, and relevant opinions, ideas, or apologies. Do not require a single canonical answer.`)
addChange(29, rows.u29Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'exerciseReview'], {
  id: 'u29-s15-e',
  kind: 'writing',
  prompt: 'Write 80–120 words about a difficult situation in your life or someone else’s. Explain what happened, whether it is solved, and relevant opinions, ideas, or apologies.',
  responseMode: 'open-response',
  reviewStatus: 'source-published-open',
  answerItems: [],
  doNotAutoGrade: true,
  constraints: ['80–120 words', 'Explain what happened and whether it is solved', 'Include relevant opinions, ideas, or apologies'],
})

replaceObject(30, rows.u30Table, 'Use neutral, grammatical appearance descriptors and correct the truncated eye-color example.', ['content'], (before) => {
  const after = clone(before)
  after.rows[8][2] = 'Round, Almond-shaped'
  after.rows[8][4] = 'Black, Brown, Green, Blue...'
  return after
})
replaceObject(30, rows.u30Examples, 'Use neutral, grammatical appearance examples while preserving the lesson’s descriptor practice.', ['content'], (before) => {
  const after = clone(before)
  after.rows[1][2] = 'Sue has got small, almond-shaped, light eyes and thin red lips.'
  return after
})
replaceObject(30, rows.u30Description, 'Correct the visible clothing and agreement example without changing the authored scene or media.', ['content'], (before) => {
  const after = clone(before)
  after.headers[0] = '0.'
  after.headers[1] = 'Sean is of average height, a thin man with a light complexion. He has short, wavy black hair and big blue eyes. Right now, he is wearing a comfortable pair of blue American jeans and a single white cotton shirt. He seems to be a nice guy.'
  return after
})

replaceObject(31, rows.u31Table, 'Correct the learner-visible collocation “think on me” to “think of me”.', ['content'], (before) => {
  const after = clone(before)
  after.rows[2][2] = after.rows[2][2].replace('thinks on me', 'thinks of me')
  return after
})

replaceString(32, rows.u32Text, 'Correct the decision and preference dialogue’s idiomatic forms.', ['content'], (before) => before
  .replace('have you made your mind yet?', 'have you made up your mind yet?')
  .replace('I’d wish this to be easier man.', 'I wish this were easier, man.')
  .replace('focus on what you would like for real', 'focus on what you would really like')
  .replace('I have been giving it deep thinking', 'I have been giving it a lot of thought'))

replaceObject(33, rows.u33Rules, 'Correct the learner-visible expected-to question while preserving the authored customs examples.', ['content'], (before) => {
  const after = clone(before)
  after.headers[3] = after.headers[3].replace('Am I expected do something special?', 'Am I expected to do something special?')
  return after
})
replaceValue(33, rows.u33Essay, 'Correct the evaluative source quote for the article while preserving all source and provenance fields.', ['data', 'exerciseReview', 'answerItems', 0, 'acceptedSourceQuotes'], () => [
  'I constantly found myself having to ask people to repeat themselves',
  'The language barrier meant that public transport was tricky at first',
])
replaceString(33, rows.u33Essay, 'Add the corrected article wording to evaluative guidance without altering article provenance.', ['data', 'aiGradingContext'], (before) => `${before}\n\nEvaluation guidance: For the expectation example, accept “I constantly found myself having to ask people to repeat themselves” and equivalent excerpts that preserve the article’s meaning. Keep the article source and URL as authored.`)

replaceString(34, rows.u34Text, 'Correct the future-change model’s subject, connector, and verb phrase.', ['content'], (before) => before.replace('In the future, it will transform itself even more that people will use holograms instead of using video calls like now.', 'In the future, communication will transform even more, so people may use holograms instead of video calls.'))

replaceObject(35, rows.u35Table, 'Explain that might, may, and could express context-dependent possibility rather than a fixed ranking.', ['content'], (before) => ({
  ...before,
  rows: [
    ['1', 'A possibility supported by current evidence.', 'The evidence is strong, so we might get the prize.'],
    ['2', 'A possibility with an uncertain outcome.', 'They may pass the test, but we do not know yet.'],
    ['3', 'A possibility in a given context.', 'She could come this weekend; let’s get some groceries.'],
    ['', 'To consider', 'Might, may, and could all express possibility; context determines how likely the speaker considers it.'],
  ],
}))

replaceString(36, rows.u36Text, 'Correct malformed learner-visible idioms and explicitly label the standard forms.', ['content'], () => '<p>Look at the information. These idioms are written in their standard forms. Where do you think these phrases belong?</p><p>All hands on deck</p><p>Get back on the horse</p><p>Hit the nail on the head</p><p>Extend an olive branch</p><p>Whatever floats your boat</p><p>Get the ball rolling</p><p>Use the corrected phrases in a sentence and discuss their meanings with your teacher.</p>')

replaceObject(37, rows.u37Rules, 'Correct the non-finite clause example’s gerund form while preserving its grammar focus.', ['content'], (before) => {
  const after = clone(before)
  after.rows[0][2] = after.rows[0][2].replace('devoted to share', 'devoted to sharing')
  return after
})
replaceObject(37, rows.u37Functions, 'Correct the preposition in the learner-visible preference example.', ['content'], (before) => {
  const after = clone(before)
  after.rows[0][2] = after.rows[0][2].replace('dance by their music', 'dance to their music')
  return after
})
replaceObject(37, rows.u37Exercise, 'Correct the singular subject and natural noun in the learner-visible production model.', ['content'], (before) => {
  const after = clone(before)
  after.headers[1] = after.headers[1].replace('The orphanages is looking for someone filled with humbleness and love to help the children.', 'The orphanage is looking for someone filled with humility and love to help the children.')
  return after
})

addOralTurns(19, rows.u19Oral, 'Discuss close-future events with a partner and ask about one event.', [
  { id: 'scenario', question: 'What close-future event do you have this week?', answerPrompt: selfStudyModel('I start studying tomorrow.') },
  { id: 'follow-up', question: 'What are you going to do before that event?', answerPrompt: 'Answer with one plan using be going to.' },
  { id: 'question', question: 'Ask your partner about one close-future event.', answerPrompt: 'Switch roles and answer with simple present or will.' },
])
addOralTurns(20, rows.u20Oral, 'Discuss tonight’s weather and plans with a partner.', [
  { id: 'scenario', question: 'What weather do you expect tonight?', answerPrompt: selfStudyModel('I’ll take my umbrella.') },
  { id: 'follow-up', question: 'What will you do if the weather changes?', answerPrompt: 'Give an instant decision or plan.' },
  { id: 'question', question: 'Make one promise about the outing to your partner.', answerPrompt: 'Use will and switch roles.' },
])
addOralTurns(21, rows.u21Oral, 'Discuss travel experiences and ongoing actions with a partner.', [
  { id: 'scenario', question: 'What place have you visited?', answerPrompt: selfStudyModel('I have visited a new place.') },
  { id: 'follow-up', question: 'How long have you been interested in traveling?', answerPrompt: 'Use for or since for an action that continues.' },
  { id: 'question', question: 'Ask your partner about a completed travel experience.', answerPrompt: 'Ask and answer with the present perfect.' },
])
addOralTurns(22, rows.u22Oral, 'Discuss how friends should behave and which actions are required or prohibited.', [
  { id: 'scenario', question: 'How should friends behave with one another?', answerPrompt: selfStudyModel('You should listen to your friend.') },
  { id: 'follow-up', question: 'What mustn’t a friend do?', answerPrompt: 'State one prohibition with mustn’t.' },
  { id: 'question', question: 'Ask your partner what a friend does not have to do.', answerPrompt: 'Contrast don’t have to with mustn’t.' },
])
addOralTurns(23, rows.u23Oral, 'Tell an anecdote using indefinite pronouns for people, places, and things.', [
  { id: 'scenario', question: 'Tell your partner about an anecdote involving someone or something.', answerPrompt: selfStudyModel('Someone went somewhere.') },
  { id: 'follow-up', question: 'Where did it happen?', answerPrompt: 'Answer with somewhere, anywhere, or nowhere.' },
  { id: 'question', question: 'Ask your partner about a similar anecdote.', answerPrompt: 'Ask with someone, something, or somewhere.' },
])
addOralTurns(24, rows.u24Oral, 'Discuss a job or expectation with relative clauses.', [
  { id: 'scenario', question: 'Describe a job or place using a relative clause.', answerPrompt: selfStudyModel('The job that I want is flexible.') },
  { id: 'follow-up', question: 'Add one extra detail about the person or thing.', answerPrompt: 'Use commas for a non-restrictive clause.' },
  { id: 'question', question: 'Ask your partner why or how an expectation changed.', answerPrompt: 'Ask and answer with why or how.' },
])
addOralTurns(25, rows.u25Oral, 'Describe a life experience and the feelings it produced.', [
  { id: 'scenario', question: 'Describe an experience that felt fascinating or terrifying.', answerPrompt: selfStudyModel('The story was captivating.') },
  { id: 'follow-up', question: 'What happened during the experience?', answerPrompt: 'Add one detail about a person, place, or thing.' },
  { id: 'question', question: 'Ask your partner to describe a similar experience.', answerPrompt: 'Ask and answer with one adjective.' },
])
addOralTurns(26, rows.u26Oral, 'Discuss habits, general facts, and instructions with a partner.', [
  { id: 'scenario', question: 'What habit annoys you?', answerPrompt: selfStudyModel('If I see litter, I pick it up.') },
  { id: 'follow-up', question: 'What happens when people ignore that habit?', answerPrompt: 'Give another general or factual result.' },
  { id: 'question', question: 'Give your partner one instruction about the situation.', answerPrompt: 'Use if plus an imperative.' },
])
addOralTurns(27, rows.u27Oral, 'Discuss a situation and its possible good and bad consequences.', [
  { id: 'scenario', question: 'What situation can affect people?', answerPrompt: selfStudyModel('If we act now, we can reduce harm.') },
  { id: 'follow-up', question: 'What may happen if people do nothing?', answerPrompt: 'Use a conditional to link the decision and result.' },
  { id: 'question', question: 'Ask your partner for one positive way to respond.', answerPrompt: 'Answer with a likely result.' },
])
addOralTurns(28, rows.u28Oral, 'Discuss an important life decision and hypothetical advice.', [
  { id: 'scenario', question: 'What important decision have you not made yet?', answerPrompt: selfStudyModel('If I were you, I would wait.') },
  { id: 'follow-up', question: 'What would you do in that situation?', answerPrompt: 'Give hypothetical advice with If I were you.' },
  { id: 'question', question: 'Ask your partner about a real future possibility.', answerPrompt: 'Contrast a first conditional possibility with advice.' },
])
addOralTurns(30, rows.u30Oral, 'Describe people, clothing, appearance, and personality at a reunion.', [
  { id: 'scenario', question: 'Describe one classmate’s appearance and clothing.', answerPrompt: selfStudyModel('She has short, wavy hair.') },
  { id: 'follow-up', question: 'How is that person’s personality?', answerPrompt: 'Add one personality adjective.' },
  { id: 'question', question: 'Ask your partner about a classmate.', answerPrompt: 'Use appearance or clothing vocabulary.' },
])
addOralTurns(31, rows.u31Oral, 'Discuss situations you cannot stand and situations you accept.', [
  { id: 'scenario', question: 'What situation can you not stand?', answerPrompt: selfStudyModel('I hate it when people interrupt.') },
  { id: 'follow-up', question: 'What situation do you not mind?', answerPrompt: 'Give one example with do not mind.' },
  { id: 'question', question: 'Ask your partner about a similar situation.', answerPrompt: 'Use when or as long as.' },
])
addOralTurns(32, rows.u32Oral, 'Discuss an important decision and express preferences.', [
  { id: 'scenario', question: 'What decision are you giving thought to?', answerPrompt: selfStudyModel('I would rather choose the first option.') },
  { id: 'follow-up', question: 'Which option would you rather choose?', answerPrompt: 'Use would rather or prefer.' },
  { id: 'question', question: 'Ask your partner what they would like to do.', answerPrompt: 'Use would like or wish.' },
])
addOralTurns(33, rows.u33Oral, 'Discuss a cultural custom, expectation, or culture-shock experience.', [
  { id: 'scenario', question: 'Describe one custom from a place you know.', answerPrompt: selfStudyModel('People are expected to greet one another.') },
  { id: 'follow-up', question: 'What felt unexpected about that custom?', answerPrompt: 'Compare the expectation with your experience.' },
  { id: 'question', question: 'Ask your partner about a different custom.', answerPrompt: 'Ask a clear question about expectations.' },
])
addOralTurns(34, rows.u34Oral, 'Discuss how an object, event, or movement has changed over time.', [
  { id: 'scenario', question: 'What has changed since the past?', answerPrompt: selfStudyModel('Communication was slower in the past.') },
  { id: 'follow-up', question: 'How might it change in the future?', answerPrompt: 'Make one future prediction.' },
  { id: 'question', question: 'Ask your partner about a change they have noticed.', answerPrompt: 'Use time contrasts.' },
])
addOralTurns(35, rows.u35Oral, 'Discuss issues and express context-dependent possibilities.', [
  { id: 'scenario', question: 'What issue might affect people?', answerPrompt: selfStudyModel('They might change their plan.') },
  { id: 'follow-up', question: 'What may happen if people respond?', answerPrompt: 'Use may and explain the context.' },
  { id: 'question', question: 'Ask your partner what could happen in another situation.', answerPrompt: 'Use could and give the condition.' },
])
addOralTurns(36, rows.u36Oral, 'Give suggestions to someone who wants to become more successful.', [
  { id: 'scenario', question: 'What suggestion would help someone who feels unsuccessful?', answerPrompt: selfStudyModel('You had better ask for help.') },
  { id: 'follow-up', question: 'What had better happen next?', answerPrompt: 'Give one strong suggestion with had better.' },
  { id: 'question', question: 'Ask your partner for another helpful idea.', answerPrompt: 'Ask and answer with a suggestion.' },
])
addOralTurns(37, rows.u37Oral, 'Discuss what you want, expect, and look for in a life partner.', [
  { id: 'scenario', question: 'What qualities do you want in a life partner?', answerPrompt: selfStudyModel('I need someone to share life with.') },
  { id: 'follow-up', question: 'What kind of person would you look for?', answerPrompt: 'Use a relative clause with who or that.' },
  { id: 'question', question: 'Ask your partner about future preferences.', answerPrompt: 'Use a future preference.' },
])

// U24 E is a writing activity, not a role-play recording. Keep authored source metadata but remove conversation-only fields.
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['instruction'], 'E. Write 80–120 words about a place where people face unresolved issues. Explain the situation, possible solutions, what people are doing, and your role. Use relative clauses.')
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['type'], 'essay')
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['prompt'], 'Write 80–120 words about a place where people face unresolved issues. Explain the situation, possible solutions, what people are doing, and your role. Use relative clauses.')
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['minWords'], 80)
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['maxWords'], 120)
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'guidedTitle'], 'Describe una situación.')
replaceValue(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'learnerPrompt'], () => 'Write 80–120 words about a place where people face unresolved issues. Explain the situation, possible solutions, what people are doing, and your role. Use relative clauses.')
replaceString(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'aiGradingContext'], (before) => `${before}\n\nEvaluation guidance: Treat this as writing, not role-play. Check the 80–120 word range, a clear situation and role, possible solutions, and accurate restrictive or non-restrictive relative clauses. Do not require a single canonical answer.`)
replaceString(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'exerciseReview', 'prompt'], (before) => before.replace('Role-play a situation about a job or expectation and write an 80–120 word paragraph.', 'Write an 80–120 word paragraph about a place with unresolved issues, possible solutions, actions, and your role.'))
replaceValue(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'exerciseReview', 'kind'], () => 'writing')
replaceValue(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'exerciseReview', 'constraints'], () => ['80–120 words', 'Describe the situation, possible solutions, actions, and your role', 'Use relative clauses'])
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'guidedRole'], DELETE)
addChange(24, rows.u24Essay, 'Convert the E recording into a written open response with an explicit word limit and writing review kind.', ['data', 'turns'], DELETE)

const patches = [...patchMap.values()].sort((a, b) => a.unit - b.unit || a.rowId.localeCompare(b.rowId))
const coveredUnits = [...new Set(patches.map((patch) => patch.unit))].sort((a, b) => a - b)
if (JSON.stringify(coveredUnits) !== JSON.stringify(units)) {
  throw new Error(`Coverage mismatch: ${JSON.stringify(coveredUnits)}`)
}
for (const patch of patches) {
  if (patch.changes.length === 0) throw new Error(`Empty patch for ${patch.rowId}`)
}

const output = {
  schemaVersion: 1,
  units,
  patches,
}
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote ${patches.length} row patches and ${patches.reduce((count, patch) => count + patch.changes.length, 0)} changes to ${outputPath}`)
