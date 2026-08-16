import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260816000000_add_abandoned_carts/migration.sql'
  ),
  'utf8'
)

describe('abandoned cart migration', () => {
  it('creates the enum and table required by the Prisma model', () => {
    expect(migration).toContain('CREATE TYPE "AbandonedCartStatus"')
    expect(migration).toContain('CREATE TABLE "abandoned_carts"')
    expect(migration).toContain(
      '"status" "AbandonedCartStatus" NOT NULL DEFAULT \'PENDING\''
    )
  })

  it('enforces unique email and recovery token values', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "abandoned_carts_email_key"'
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "abandoned_carts_recoveryToken_key"'
    )
  })
})
