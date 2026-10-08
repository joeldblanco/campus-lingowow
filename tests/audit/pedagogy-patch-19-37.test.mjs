import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(testDir, '../..')
const baselinePath = resolve(root, 'docs/audit/course-builder-learning-draft.json')
const patchPath = resolve(root, 'docs/audit/pedagogy/patch-19-37.json')
const manifestPath = resolve(root, 'docs/audit/course-source-manifest.json')

const clone = (value) => JSON.parse(JSON.stringify(value))
const missing = (value) => value === undefined

function getAt(object, path) {
  let current = object
  for (const segment of path) {
    if (
      current === null ||
      current === undefined ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    )
      return undefined
    current = current[segment]
  }
  return current
}

function setAt(object, path, value) {
  const last = path[path.length - 1]
  let current = object
  for (const segment of path.slice(0, -1)) {
    if (!Object.prototype.hasOwnProperty.call(current, segment) || current[segment] === null) {
      current[segment] = typeof segment === 'number' ? [] : {}
    }
    current = current[segment]
  }
  current[last] = value
}

function applyPatch(baseline, patchDocument) {
  const result = clone(baseline)
  const rows = new Map(result.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row])))
  for (const patch of patchDocument.patches) {
    const row = rows.get(patch.rowId)
    expect(row, `missing row ${patch.rowId}`).toBeDefined()
    expect(row.lessonId).toBe(patch.lessonId)
    for (const change of patch.changes) {
      const current = getAt(row.data, change.path)
      if (change.before?.$missing === true) expect(current).toBeUndefined()
      else expect(current).toEqual(change.before)
      if (change.after?.$delete === true) {
        const parent = getAt(row.data, change.path.slice(0, -1))
        delete parent[change.path.at(-1)]
      } else {
        setAt(row.data, change.path, clone(change.after))
      }
    }
  }
  return result
}

function collectImmutableValues(row) {
  const immutable = new Set([
    'sourceText',
    'nativeParagraphs',
    'originalIDs',
    'originalSource',
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
  const found = {}
  function walk(value, path) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      const nextPath = [...path, key]
      if (immutable.has(key)) found[nextPath.join('.')] = child
      walk(child, nextPath)
    }
  }
  walk(row.data, ['data'])
  return found
}

const [baseline, patchDocument, manifest] = await Promise.all([
  readFile(baselinePath, 'utf8').then(JSON.parse),
  readFile(patchPath, 'utf8').then(JSON.parse),
  readFile(manifestPath, 'utf8').then(JSON.parse),
])

describe('authored U19–37 pedagogical patch', () => {
  it('covers exactly U19–U37 and maps lessons through the source manifest', () => {
    expect(patchDocument.schemaVersion).toBe(1)
    expect(patchDocument.units).toEqual(Array.from({ length: 19 }, (_, index) => index + 19))
    const units = new Set(patchDocument.patches.map((patch) => patch.unit))
    expect([...units].sort((a, b) => a - b)).toEqual(patchDocument.units)

    const unitByLesson = new Map()
    for (const source of manifest.sources) {
      const match = String(source.deck?.deckTitle ?? '').match(/Unit\s*(\d+)/i)
      if (match && source.lesson?.id) unitByLesson.set(source.lesson.id, Number(match[1]))
    }
    for (const patch of patchDocument.patches)
      expect(unitByLesson.get(patch.lessonId)).toBe(patch.unit)
    expect(unitByLesson.get('cmkq3xx5w0001jr04cw7bh9g7')).toBe(21)
    expect(unitByLesson.get('cmkpx0d310001gy04zr4lq99y')).toBe(22)
  })

  it('records exact baseline before values and preserves row identity and immutable provenance', () => {
    const beforeRows = new Map(
      baseline.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row]))
    )
    const after = applyPatch(baseline, patchDocument)
    const afterRows = new Map(
      after.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row]))
    )

    for (const patch of patchDocument.patches) {
      const beforeRow = beforeRows.get(patch.rowId)
      const afterRow = afterRows.get(patch.rowId)
      expect(afterRow.id).toBe(beforeRow.id)
      expect(afterRow.order).toBe(beforeRow.order)
      expect(afterRow.title).toBe(beforeRow.title)
      expect(afterRow.contentType).toBe(beforeRow.contentType)
      expect(afterRow.parentId).toBe(beforeRow.parentId)
      expect(afterRow.lessonId).toBe(beforeRow.lessonId)
      expect(collectImmutableValues(afterRow)).toEqual(collectImmutableValues(beforeRow))
    }
  })

  it('turns self-study oral activities into 3–5 topic-specific turns', () => {
    const after = applyPatch(baseline, patchDocument)
    const rows = new Map(after.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row])))
    const oralPatches = patchDocument.patches.filter((patch) =>
      patch.changes.some((change) => change.path.join('.') === 'data.turns' && Array.isArray(change.after))
    )
    expect(oralPatches.length).toBe(19)
    for (const patch of oralPatches) {
      expect(rows.get(patch.rowId).data.data.guidedRole).toBe('conversation')
      const turns = rows.get(patch.rowId).data.data.turns
      expect(turns.length).toBeGreaterThanOrEqual(3)
      expect(turns.length).toBeLessThanOrEqual(5)
      for (const turn of turns) {
        expect(Object.keys(turn).sort()).toEqual(['answerPrompt', 'id', 'question'])
        expect(turn.question).not.toContain('Responde a la situación')
        expect(turn.answerPrompt).not.toContain('Responde a la situación')
        expect(turn.question).not.toMatch(/your teacher/i)
        expect(turn.answerPrompt).not.toMatch(/your teacher/i)
      }
      expect(turns[0].answerPrompt).toMatch(
        /^Por tu cuenta, interpreta ambos papeles; con tu profesora, alternen\. Modelo:/
      )
    }
  })

  it('converts U24 and U29 E activities to written review prompts', () => {
    const after = applyPatch(baseline, patchDocument)
    const rows = new Map(after.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row])))
    const u24 = rows.get(
      'course-guided-cmn7vc7pm0001le04qfcuwa27-recording-14-d-act-out-a-situation-with-your-teacher-where-you-can-expre-035'
    )
    const u29 = rows.get(
      'course-guided-cmnmm9nmo000tw1qkxzhh3pwc-recording-15-d-following-the-example-from-the-previous-activity-act-out--036'
    )
    expect(u24.data.data.guidedTitle).toBe('Describe una situación.')
    expect(u29.data.data.guidedTitle).toBe('Cuenta qué ocurrió.')
    for (const row of [u24, u29]) {
      expect(row.data.instruction).toMatch(/80.?120 words/i)
      expect(row.data.type).toBe('essay')
      expect(row.data.prompt).toMatch(/80.?120 words/i)
      expect(row.data.minWords).toBe(80)
      expect(row.data.maxWords).toBe(120)
      expect(row.data.data.exerciseReview.kind).toBe('writing')
      expect(row.data.data.guidedRole).toBeUndefined()
      expect(row.data.data.turns).toBeUndefined()
      expect(row.data.data.learnerPrompt).toMatch(/80.?120 words/i)
    }
  })

  it('keeps valid short-answer variants and corrected authored examples', () => {
    const after = applyPatch(baseline, patchDocument)
    const rows = new Map(after.plans.flatMap((plan) => plan.nextRows.map((row) => [row.id, row])))
    const u23 = rows.get(
      'course-guided-cmn7vbcg20005l804sg2hxgf4-short-answer-12-a-listen-to-the-audio-and-answer-the-questions-your-teac-029'
    )
    const u25 = rows.get(
      'course-guided-cmnmm9m3i000hw1qklyh7h658-short-answer-13-a-look-at-the-words-in-the-box-and-complete-the-paragrap-029'
    )
    expect(u23.data.items[1].acceptedAnswers).toContain('someplace')
    expect(u23.data.items[7].acceptedAnswers).toContain('somebody went somewhere to do something')
    expect(u25.data.items[1].acceptedAnswers).toContain('never ending')
    expect(u25.data.items[1].question).toMatch(/continuing without end/i)

    const u36 = rows.get(
      'course-guided-cmnmm9q04001ew1qke5tfufyk-text-6-look-at-the-information-where-do-you-think-these-phrases-belong-011'
    )
    expect(u36.data.content).toContain('Hit the nail on the head')
    expect(u36.data.content).not.toContain('Hit the nose on the head')
  })
})
