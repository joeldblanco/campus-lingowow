import assessment from '../../docs/content/unit-1-listening/assessment-v1.json'

export interface ListeningContentRow { id: string; data: Record<string, unknown> }
export interface ListeningContentPatch {
  id: string
  previousData: Record<string, unknown>
  nextData: Record<string, unknown>
}

/** Returns payload-only, compare-and-swap patches; never deletes content or progress. */
export function planUnitOneListeningRevision(rows: ListeningContentRow[]): ListeningContentPatch[] {
  const audioRows = rows.filter(row => row.id === assessment.audioBlockId)
  const exerciseRows = rows.filter(row => row.id === assessment.exerciseBlockId)
  if (audioRows.length !== 1 || exerciseRows.length !== 1) throw new Error('Listening content missing or duplicated')
  const audio = audioRows[0]
  const exercise = exerciseRows[0]
  if (audio.data.type !== 'audio' || audio.data.url !== assessment.source.audioUrl || exercise.data.type !== 'true_false') {
    throw new Error('Unexpected listening source or block type')
  }
  const items = assessment.items.map(({ id, statement, correctAnswer }) => ({ id, statement, correctAnswer }))
  if (exercise.data.listeningRevision === assessment.revision) {
    if (JSON.stringify(exercise.data.items) !== JSON.stringify(items)) throw new Error('Published revision was edited')
    return audio.data.prompt === assessment.instruction ? [] : [{
      id: audio.id, previousData: audio.data, nextData: { ...audio.data, prompt: assessment.instruction },
    }]
  }
  if (exercise.data.listeningRevision || !Array.isArray(exercise.data.items)) throw new Error('Unknown listening revision')
  for (const item of items) {
    const previous = exercise.data.items.find((old: Record<string, unknown>) => old.id === item.id)
    if (previous && (previous.statement !== item.statement || previous.correctAnswer !== item.correctAnswer)) {
      throw new Error('An item ID cannot be reused for a different assessment')
    }
  }
  return [
    { id: audio.id, previousData: audio.data, nextData: { ...audio.data, prompt: assessment.instruction } },
    {
      id: exercise.id,
      previousData: exercise.data,
      nextData: { ...exercise.data, items, listeningRevision: assessment.revision, previousListeningItems: exercise.data.items },
    },
  ]
}
