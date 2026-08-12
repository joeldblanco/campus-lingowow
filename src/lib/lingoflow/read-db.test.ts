import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  PrismaClient: vi.fn(),
}))

vi.mock('@prisma/client', () => ({ PrismaClient: mocks.PrismaClient }))

describe('getLingoFlowReadDb', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('fails closed without LINGOFLOW_DATABASE_URL before creating a Prisma client', async () => {
    vi.stubEnv('LINGOFLOW_DATABASE_URL', '')
    const { getLingoFlowReadDb, LingoFlowReadDatabaseUnavailableError } = await import('./read-db')

    expect(() => getLingoFlowReadDb()).toThrow(LingoFlowReadDatabaseUnavailableError)
    expect(mocks.PrismaClient).not.toHaveBeenCalled()
  })

  it('creates and reuses a dedicated Prisma client configured with LINGOFLOW_DATABASE_URL', async () => {
    const dedicatedClient = { enrollment: { findMany: vi.fn() } }
    mocks.PrismaClient.mockImplementation(() => dedicatedClient)
    vi.stubEnv('LINGOFLOW_DATABASE_URL', 'postgresql://readonly-user:example@localhost:5432/lingowow')
    const { getLingoFlowReadDb } = await import('./read-db')

    expect(getLingoFlowReadDb()).toBe(dedicatedClient)
    expect(getLingoFlowReadDb()).toBe(dedicatedClient)
    expect(mocks.PrismaClient).toHaveBeenCalledOnce()
    expect(mocks.PrismaClient).toHaveBeenCalledWith({
      datasources: { db: { url: 'postgresql://readonly-user:example@localhost:5432/lingowow' } },
    })
  })
})
