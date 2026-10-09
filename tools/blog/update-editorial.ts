/** Run on the confirmed application's DATABASE_URL. Defaults to read-only. */
import { PrismaClient } from '@prisma/client'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { blogEditorialUpdates } from '../../src/lib/blog/editorial-updates'
import {
  assertReviewedArticlesUnchanged,
  planBlogEditorialUpdate,
} from '../../src/lib/blog/editorial-plan'

const db = new PrismaClient()

async function main() {
  const resources = await db.libraryResource.findMany({
    where: { slug: { in: blogEditorialUpdates.map((update) => update.slug) } },
  })
  const plan = planBlogEditorialUpdate(resources, blogEditorialUpdates)
  console.log(
    JSON.stringify(
      plan.map((entry) => ({ slug: entry.slug, title: entry.data.title })),
      null,
      2
    )
  )
  if (!process.argv.includes('--apply')) {
    console.log(
      'Read-only preview. Apply with --apply --expected=<review-snapshot.json> --backup=<new-file.json>.'
    )
    return
  }
  const backupArg = process.argv.find((arg) => arg.startsWith('--backup='))
  if (!backupArg) throw new Error('--backup=<new-file.json> is required before applying')
  const expectedArg = process.argv.find((arg) => arg.startsWith('--expected='))
  if (!expectedArg) throw new Error('--expected=<review-snapshot.json> is required before applying')
  const reviewed = JSON.parse(
    await readFile(resolve(expectedArg.slice('--expected='.length)), 'utf8')
  )
  if (!Array.isArray(reviewed)) throw new Error('Expected an article array in the review snapshot')
  assertReviewedArticlesUnchanged(resources, reviewed, blogEditorialUpdates)
  const backup = resolve(backupArg.slice('--backup='.length))
  await mkdir(dirname(backup), { recursive: true })
  // wx prevents overwriting an earlier backup.
  await writeFile(backup, JSON.stringify(resources, null, 2), { flag: 'wx' })
  await db.$transaction(async (tx) => {
    for (const entry of plan) {
      const result = await tx.libraryResource.updateMany({
        where: {
          id: entry.id,
          slug: entry.slug,
          updatedAt: entry.expectedUpdatedAt,
          type: 'ARTICLE',
          status: 'PUBLISHED',
          accessLevel: 'PUBLIC',
        },
        data: entry.data,
      })
      if (result.count !== 1)
        throw new Error(`Article changed during review: ${entry.slug}; transaction rolled back`)
    }
  })
  console.log(`Updated ${plan.length} articles. Original rows saved at ${backup}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
