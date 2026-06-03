import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

/**
 * Robust student lookup for the admin assistant.
 *
 * The DB stores a person's name split across `name` (given names) and
 * `lastName`. Searching only `name` made full names like "María Eugenia López"
 * resolve to nobody (the surname lives in `lastName`). On top of that, Postgres
 * ILIKE is accent-sensitive and several students can share given names.
 *
 * This resolver fixes all three: it matches query tokens against the
 * accent-folded `name + lastName`, and reports ambiguity explicitly so the
 * caller can ask the admin to pick instead of silently guessing.
 */

export interface ResolvedStudent {
  id: string
  name: string | null
  lastName: string | null
  email: string | null
  roles: UserRole[]
  timezone: string
}

export type StudentResolution =
  | { kind: 'found'; student: ResolvedStudent }
  | { kind: 'multiple'; students: ResolvedStudent[] }
  | { kind: 'none' }

const SELECT = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  roles: true,
  timezone: true,
} as const

/** Lowercase, strip diacritics, collapse whitespace. */
function fold(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Build the display label "Name LastName" for disambiguation lists. */
export function studentDisplayName(s: { name: string | null; lastName: string | null }): string {
  return `${s.name ?? ''} ${s.lastName ?? ''}`.replace(/\s+/g, ' ').trim()
}

export async function resolveStudent(query: string): Promise<StudentResolution> {
  const q = (query ?? '').trim()
  if (!q) return { kind: 'none' }

  // An exact email is unambiguous — resolve directly.
  if (q.includes('@')) {
    const byEmail = await db.user.findFirst({
      where: { email: { equals: q, mode: 'insensitive' } },
      select: SELECT,
    })
    return byEmail ? { kind: 'found', student: byEmail } : { kind: 'none' }
  }

  const tokens = fold(q).split(' ').filter((w) => w.length >= 2)
  if (tokens.length === 0) return { kind: 'none' }

  // Candidate pool: the people an admin enrolls/schedules. Small in practice;
  // filtered accent-insensitively in JS (the DB can't do that with ILIKE).
  const pool = await db.user.findMany({
    where: { roles: { hasSome: [UserRole.STUDENT, UserRole.GUEST] } },
    select: SELECT,
  })

  const scored = pool
    .map((u) => {
      const full = fold(`${u.name ?? ''} ${u.lastName ?? ''}`)
      const matched = tokens.filter((t) => full.includes(t)).length
      return { u, matched }
    })
    .filter((x) => x.matched > 0)

  if (scored.length === 0) return { kind: 'none' }

  const maxMatched = Math.max(...scored.map((x) => x.matched))
  const best = scored.filter((x) => x.matched === maxMatched).map((x) => x.u)

  if (best.length === 1) return { kind: 'found', student: best[0] }
  return { kind: 'multiple', students: best.slice(0, 8) }
}
