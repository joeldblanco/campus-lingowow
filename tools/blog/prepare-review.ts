import { readFile, writeFile } from 'node:fs/promises'
import { blogEditorialUpdates } from '../../src/lib/blog/editorial-updates'
import { planBlogEditorialUpdate } from '../../src/lib/blog/editorial-plan'

async function main() {
  const sources = JSON.parse(
    await readFile('artifacts/blog-review/public-articles-before.json', 'utf8')
  )
  const plan = planBlogEditorialUpdate(sources, blogEditorialUpdates)
  const resources = sources.map((source: { id: string }) => ({
    ...source,
    ...plan.find((entry) => entry.id === source.id)?.data,
  }))
  await writeFile(
    'artifacts/blog-review/public-articles-after.json',
    JSON.stringify(resources, null, 2)
  )
  console.log(
    `Prepared ${plan.length} article revisions from a read-only public snapshot; no database writes.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
