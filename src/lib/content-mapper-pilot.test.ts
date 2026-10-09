import { describe, expect, it } from 'vitest'
import { mapContentToBlock } from './content-mapper'
import { buildIllustratedLessonSteps } from './illustrated-lesson'

describe('curriculum pilot data through the real content mapper', () => {
  it('preserves the scene, question feedback and archive exclusion from persisted rows', () => {
    const metadata = { learningRevision: 'curriculum-pilot-v1', pilotSceneId: 'meaning', guidedTitle: 'Comprende la norma.' }
    const rows = [
      { id: 'teaching', order: 0, contentType: 'RICH_TEXT', data: { type: 'text', content: '<p>A rule can make an action optional.</p>', data: metadata } },
      { id: 'question', order: 1, contentType: 'RICH_TEXT', data: { type: 'multiple_choice', data: { ...metadata, feedbackMode: 'continue' }, items: [{ id: 'one', question: 'Optional?', options: [{ id: 'yes', text: 'Not required' }, { id: 'no', text: 'Forbidden' }], correctOptionId: 'yes', explanation: 'Not required is different from forbidden.' }] } },
      { id: 'archived', order: 2, contentType: 'RICH_TEXT', data: { type: 'teacher_notes', content: '', data: { archivedPilotSource: true } } },
      { id: 'archived-native', order: 3, contentType: 'RICH_TEXT', data: { type: 'multiple_choice', items: [], data: { archivedPilotSource: true } } },
    ]
    const mapped = rows.map(row => mapContentToBlock(row as never))
    const steps = buildIllustratedLessonSteps(mapped)
    expect(steps).toHaveLength(1)
    expect(steps[0].blocks.map(block => block.id)).toEqual(['teaching', 'question'])
    expect(mapped[1].data?.feedbackMode).toBe('continue')
    expect(mapped[1].type === 'multiple_choice' && mapped[1].items?.[0].explanation).toBe('Not required is different from forbidden.')
  })
})
