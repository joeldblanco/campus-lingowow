import { readFile, writeFile } from 'node:fs/promises'
import { reviseUnitOneContent, UNIT_ONE_LESSON_ID, type UnitOneContentRow } from '../../src/lib/unit-one-learning'

async function main() {
  const [snapshotPath, outputPath] = process.argv.slice(2)
  if (!snapshotPath || !outputPath) throw new Error('Provide snapshot and output plan paths')
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as { rows: UnitOneContentRow[] }
  const nextRows = reviseUnitOneContent(snapshot.rows)
  await writeFile(outputPath, JSON.stringify({ lessonId: UNIT_ONE_LESSON_ID, previousRows: snapshot.rows, nextRows }, null, 2) + '\n')
  console.log(JSON.stringify({ originalContent: snapshot.rows.length, revisedContent: nextRows.length, originalAudioUnchanged: true }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
