import { describe, expect, it } from 'vitest'
import assessment from '../../docs/content/unit-1-listening/assessment-v1.json'
import { planUnitOneListeningRevision } from './unit-one-listening'

const originalItems = [
  { id: 'eac6c2b6-78af-48f3-9eac-ede896f25dfe', statement: 'He is 20 years old.', correctAnswer: false },
  { id: '0fae1d61-a8b0-4be5-876e-fce10445505f', statement: 'He works in a restaurant.', correctAnswer: false },
  { id: 'c43fac82-7a2a-4abf-a106-3bafda2aa801', statement: 'He lives with his parents.', correctAnswer: false },
  { id: 'd0a38dfa-06d8-4aba-a8dd-e599233067a5', statement: 'He is a university student.', correctAnswer: true },
  { id: '644e9640-6365-4dd7-8b60-88bfd6e4a4d7', statement: 'His job is in the afternoons.', correctAnswer: true },
  { id: 'b3df60ba-4b58-4751-8e41-248025e30e3c', statement: 'His email address is @yahoo', correctAnswer: false },
]
const rows = [
  { id: 'intro', data: { type: 'audio', url: '/intro.wav' } },
  { id: assessment.audioBlockId, data: { type: 'audio', url: assessment.source.audioUrl, prompt: 'Old instruction', maxReplays: 2 } },
  { id: assessment.exerciseBlockId, data: { type: 'true_false', items: originalItems, title: 'Listening' } },
  { id: 'reading', data: { type: 'text', content: 'Carl reading' } },
]

describe('unit one listening revision from the recorded audio', () => {
  it('assesses the six explicit audio facts with the verified answers', () => {
    expect(assessment.items.map(item => [item.statement, item.correctAnswer])).toEqual([
      ['He is 20 years old.', false],
      ['He is a university student.', true],
      ['He works in a bakery.', true],
      ['He works in the mornings.', false],
      ['He lives with his parents.', false],
      ['He uses a Gmail email address.', true],
    ])
    expect(assessment.items.every(item => item.evidence && item.start >= 0 && item.end <= assessment.source.durationSeconds)).toBe(true)
  })

  it('changes only the two listening payloads, preserving source media, metadata and original input', () => {
    const before = JSON.stringify(rows)
    const plan = planUnitOneListeningRevision(rows)
    expect(plan.map(patch => patch.id)).toEqual([assessment.audioBlockId, assessment.exerciseBlockId])
    expect(plan[0].nextData).toMatchObject({ url: assessment.source.audioUrl, maxReplays: 2, prompt: assessment.instruction })
    expect(plan[1].nextData).toMatchObject({ type: 'true_false', title: 'Listening', previousListeningItems: originalItems })
    expect(JSON.stringify(rows)).toBe(before)
  })

  it('never reuses an old item ID for a different assertion or answer', () => {
    const plan = planUnitOneListeningRevision(rows)
    const next = plan[1].nextData.items as typeof originalItems
    for (const item of next) {
      const old = originalItems.find(previous => previous.id === item.id)
      if (old) expect(item).toEqual(old)
    }
    expect(new Set(next.map(item => item.id)).size).toBe(6)
  })

  it('rejects an unexpected audio source or missing exercise instead of replacing other content', () => {
    expect(() => planUnitOneListeningRevision(rows.filter(row => row.id !== assessment.exerciseBlockId))).toThrow()
    expect(() => planUnitOneListeningRevision(rows.map(row => row.id === assessment.audioBlockId ? { ...row, data: { type: 'audio', url: '/different.wav' } } : row))).toThrow()
  })

  it('is idempotent once the same revision is applied', () => {
    const plan = planUnitOneListeningRevision(rows)
    const applied = rows.map(row => ({ ...row, data: plan.find(patch => patch.id === row.id)?.nextData ?? row.data }))
    expect(planUnitOneListeningRevision(applied)).toEqual([])
  })
})
