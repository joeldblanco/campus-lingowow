import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveStudent, studentDisplayName } from './resolve-student'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: { user: { findFirst: vi.fn(), findMany: vi.fn() } },
}))

const M1 = { id: 'm1', name: 'Maria Eugenia', lastName: 'Lopez De Hernandez', email: 'm1@x.com', roles: ['STUDENT'], timezone: 'America/Chicago' }
const M2 = { id: 'm2', name: 'María Eugenia', lastName: 'López', email: 'm2@x.com', roles: ['STUDENT'], timezone: 'America/Chicago' }
const E1 = { id: 'e1', name: 'Elizabeth', lastName: 'Mendoza', email: 'eliz@x.com', roles: ['STUDENT'], timezone: 'America/New_York' }
const POOL = [M1, M2, E1]

describe('resolveStudent', () => {
  afterEach(() => vi.clearAllMocks())

  it('resolves an exact email without scanning the pool', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(M2 as never)
    const r = await resolveStudent('m2@x.com')
    expect(r).toEqual({ kind: 'found', student: M2 })
    expect(db.user.findMany).not.toHaveBeenCalled()
  })

  it('matches a full name across name + lastName (the bug: surname is in lastName)', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue(POOL as never)
    const r = await resolveStudent('Elizabeth Mendoza')
    expect(r).toEqual({ kind: 'found', student: E1 })
  })

  it('is accent-insensitive (typed without accents still matches)', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue(POOL as never)
    const r = await resolveStudent('maria eugenia lopez')
    // both "María Eugenia López" and "Maria Eugenia Lopez De Hernandez" qualify
    expect(r.kind).toBe('multiple')
  })

  it('reports ambiguity when several students share the name (no silent guess)', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue(POOL as never)
    const r = await resolveStudent('María Eugenia López')
    expect(r.kind).toBe('multiple')
    if (r.kind === 'multiple') {
      expect(r.students.map((s) => s.id).sort()).toEqual(['m1', 'm2'])
    }
  })

  it('returns none when nobody matches', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue(POOL as never)
    expect(await resolveStudent('Fulano Inexistente')).toEqual({ kind: 'none' })
  })

  it('studentDisplayName joins name + lastName cleanly', () => {
    expect(studentDisplayName(M2)).toBe('María Eugenia López')
    expect(studentDisplayName({ name: 'Solo', lastName: null })).toBe('Solo')
  })
})
