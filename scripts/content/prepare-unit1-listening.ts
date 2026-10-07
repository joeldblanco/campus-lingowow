import { readFile, writeFile } from 'node:fs/promises'
import { planUnitOneListeningRevision, type ListeningContentRow } from '../../src/lib/unit-one-listening'

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2)
  if (!inputPath || !outputPath) throw new Error('Provide a read-only dev snapshot and output plan path')
  const snapshot = JSON.parse(await readFile(inputPath, 'utf8')) as { rows: ListeningContentRow[]; responses: number }
  if (snapshot.responses !== 0) throw new Error('Recorded responses require a separate historical-content review')
  const patches = planUnitOneListeningRevision(snapshot.rows)
  await writeFile(outputPath, JSON.stringify({ lessonId: 'cmk4otvgp0001w1p4ijdkv6i2', expectedContentCount: snapshot.rows.length, patches }, null, 2) + '\n')
  console.log(JSON.stringify({ patchCount: patches.length, contentIds: patches.map(patch => patch.id) }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
