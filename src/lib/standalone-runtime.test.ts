// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { verifyStandalone } from '../../scripts/deployment/verify-standalone.mjs'

const roots: string[] = []
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'lingowow-runtime-'))
  roots.push(root)
  for (const file of ['server.js', '.next/static/chunk.js', 'public/images/lessons/this-is-me/peter.webp',
    'prisma/schema.prisma', 'prisma/migrations/initial/migration.sql', 'node_modules/prisma/build/index.js',
    'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node',
    'node_modules/@sparticuz/chromium/bin/chromium.br']) {
    const path = resolve(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'fixture')
  }
  return root
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))
describe('standalone release runtime gate', () => {
  it('accepts a complete Linux runtime', () => expect(() => verifyStandalone(fixture())).not.toThrow())
  it.each(['.next/static', 'public/images/lessons/this-is-me', 'node_modules/prisma/build/index.js',
    'node_modules/.prisma/client', 'node_modules/@sparticuz/chromium/bin'])('rejects a release missing %s', file => {
    const root = fixture()
    rmSync(resolve(root, file), { recursive: true, force: true })
    expect(() => verifyStandalone(root)).toThrow('Incomplete runtime')
  })
  it('rejects a client without a Linux query engine', () => {
    const root = fixture()
    rmSync(resolve(root, 'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node'))
    writeFileSync(resolve(root, 'node_modules/.prisma/client/index.js'), 'client')
    expect(() => verifyStandalone(root)).toThrow('Missing Linux Prisma query engine')
  })
})
