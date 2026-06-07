import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn() }))
vi.mock('@/lib/tokens', () => ({ generateVerificationToken: vi.fn() }))
vi.mock('@/lib/mail', () => ({ sendVerificationEmail: vi.fn() }))

import { db } from '@/lib/db'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/mail'
import { createUser, updateUser } from './user'

const VALID_INPUT = {
  name: 'Luz',
  lastName: 'Zambrano',
  email: 'LMZambrano35@gmail.com',
  password: 'LuzMaria123*',
  roles: ['STUDENT' as const],
  status: 'ACTIVE' as const,
}

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.user.create).mockImplementation(
      (async ({ data }: { data: Record<string, unknown> }) =>
        ({ id: 'user-1', ...data })) as never
    )
    vi.mocked(generateVerificationToken).mockResolvedValue({
      id: 'tok-1',
      email: 'lmzambrano35@gmail.com',
      token: 'verify-token',
      expires: new Date(0),
    } as never)
  })

  it('stores the password as a bcrypt hash, never plaintext', async () => {
    await createUser(VALID_INPUT)

    const createArg = vi.mocked(db.user.create).mock.calls[0][0] as {
      data: { password: string }
    }
    const stored = createArg.data.password

    expect(stored).not.toBe('LuzMaria123*')
    expect(await bcrypt.compare('LuzMaria123*', stored)).toBe(true)
  })

  it('normalizes the email to lowercase and leaves emailVerified unset', async () => {
    await createUser(VALID_INPUT)

    const createArg = vi.mocked(db.user.create).mock.calls[0][0] as {
      data: { email: string; emailVerified?: unknown }
    }
    expect(createArg.data.email).toBe('lmzambrano35@gmail.com')
    expect(createArg.data.emailVerified).toBeUndefined()
  })

  it('sends a verification email to the new user', async () => {
    await createUser(VALID_INPUT)

    expect(generateVerificationToken).toHaveBeenCalledWith('lmzambrano35@gmail.com')
    expect(sendVerificationEmail).toHaveBeenCalledWith('lmzambrano35@gmail.com', 'verify-token')
  })

  it('rejects a duplicate email', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'existing' } as never)

    const res = await createUser(VALID_INPUT)

    expect(res).toEqual({ error: 'Ya existe un usuario con este email' })
    expect(db.user.create).not.toHaveBeenCalled()
  })
})

describe('updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(db.user.update).mockImplementation(
      (async ({ data }: { data: Record<string, unknown> }) =>
        ({ id: 'user-1', email: 'u@example.com', ...data })) as never
    )
  })

  it('hashes a plaintext password before writing', async () => {
    await updateUser('user-1', { password: 'LuzMaria123*' })

    const updateArg = vi.mocked(db.user.update).mock.calls[0][0] as {
      data: { password: string }
    }
    const written = updateArg.data.password

    expect(written).not.toBe('LuzMaria123*')
    expect(await bcrypt.compare('LuzMaria123*', written)).toBe(true)
  })

  it('does not re-hash an already-bcrypt password (idempotent)', async () => {
    const existingHash = await bcrypt.hash('LuzMaria123*', 10)

    await updateUser('user-1', { name: 'Luz', password: existingHash })

    const updateArg = vi.mocked(db.user.update).mock.calls[0][0] as {
      data: { password: string }
    }
    expect(updateArg.data.password).toBe(existingHash)
  })

  it('leaves data untouched when no password is provided', async () => {
    await updateUser('user-1', { name: 'Nuevo Nombre' })

    const updateArg = vi.mocked(db.user.update).mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(updateArg.data).toEqual({ name: 'Nuevo Nombre' })
    expect(updateArg.data.password).toBeUndefined()
  })
})
