import { describe, expect, it } from 'vitest'
import snapshot from '../../tests/fixtures/unit1-content-before-dual-mode.json'
import { reviseUnitOneContent, UNIT_ONE_AUDIO_FACTS, UNIT_ONE_NEW_CONTENT_IDS, type UnitOneContentRow } from './unit-one-learning'
import { mapContentToBlock } from './content-mapper'
import { buildIllustratedLessonSteps, getIllustratedLessonTaskTitle } from './illustrated-lesson'
import { assignLessonBackgrounds } from './lesson-backgrounds'

const rows = snapshot.rows as UnitOneContentRow[]
describe('Unit 1 complete learning revision', () => {
  it('adds only five screens, retains every original identity and is idempotent', () => {
    const revised = reviseUnitOneContent(rows)
    expect(revised).toHaveLength(rows.length + 5)
    for (const row of rows) expect(revised.find(item => item.id === row.id)).toBeDefined()
    expect(revised.filter(row => !rows.some(old => old.id === row.id)).map(row => row.id).sort()).toEqual([...UNIT_ONE_NEW_CONTENT_IDS].sort())
    expect(reviseUnitOneContent(revised)).toEqual(revised)
  })
  it('preserves both current audio URLs and the verified listening exercise', () => {
    const revised = reviseUnitOneContent(rows)
    for (const row of rows.filter(row => row.data.type === 'audio')) {
      expect(revised.find(item => item.id === row.id)?.data.url).toBe(row.data.url)
    }
    const listening = rows.find(row => row.data.type === 'true_false')!
    expect(revised.find(row => row.id === listening.id)?.data.items).toEqual(listening.data.items)
    expect(UNIT_ONE_AUDIO_FACTS.flat().join(' ')).not.toMatch(/Smith|Teacher|20 years|Lincoln/)
    expect(UNIT_ONE_AUDIO_FACTS.flat().join(' ')).toContain('Both are 17')
  })
  it('archives conflicting vocabulary without overwriting the prior authored material', () => {
    const old = rows.find(row => row.data.type === 'vocabulary')!
    const updated = reviseUnitOneContent(rows).find(row => row.id === old.id)!
    expect((updated.data.data as Record<string, unknown>).originalVocabulary).toEqual(old.data.items)
    expect(updated.data.items).toHaveLength(9)
  })
  it('keeps Carl’s original questions and adds contact retrieval with four options', () => {
    const old = rows.find(row => row.id === 'dev-unit1-interleaved-reading')!
    const updated = reviseUnitOneContent(rows).find(row => row.id === old.id)!
    const items = updated.data.items as Array<{ id: string; options: unknown[]; correctOptionId: string }>
    expect(items).toHaveLength(7)
    expect(items[0].id).toBe('carl-contact-email-v1')
    expect(items.every(item => item.options.length === 4)).toBe(true)
    for (const item of old.data.items as typeof items) expect(items.find(next => next.id === item.id)?.correctOptionId).toBe(item.correctOptionId)
    expect((updated.data.data as Record<string, unknown>).originalReadingItems).toEqual(old.data.items)
  })
  it('renders eighteen focused scenes with explicit approved art and teaching titles', () => {
    const blocks = reviseUnitOneContent(rows).map(row => mapContentToBlock(row as Parameters<typeof mapContentToBlock>[0]))
    const steps = buildIllustratedLessonSteps(blocks)
    expect(steps).toHaveLength(18)
    expect(steps.slice(0, 3).map(getIllustratedLessonTaskTitle)).toEqual(['Conoce a Jake y Pete.', 'En la misma clase.', '¿Dónde viven?'])
    expect(steps.map(getIllustratedLessonTaskTitle)).toContain('¿De quién hablamos?')
    const backgrounds = Object.values(assignLessonBackgrounds(steps))
    expect(backgrounds).toHaveLength(18)
    expect(new Set(backgrounds).size).toBe(16) // Opening dialogue spans three continuous scenes.
  })
  it('rejects wrong lessons and unexpected inventory before generating a revision', () => {
    expect(() => reviseUnitOneContent([{ ...rows[0], lessonId: 'another-lesson' }])).toThrow('Unexpected lesson')
    expect(() => reviseUnitOneContent(rows.slice(1))).toThrow('inventory')
    expect(() => reviseUnitOneContent([...rows, { ...rows[0], id: 'unreviewed' }])).toThrow('inventory')
  })
})
