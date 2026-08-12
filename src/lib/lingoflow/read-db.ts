import { PrismaClient } from '@prisma/client'

type ReadDatabase = Pick<PrismaClient, 'enrollment'>

let lingoFlowReadDb: ReadDatabase | undefined

export class LingoFlowReadDatabaseUnavailableError extends Error {
  constructor() {
    super('LingoFlow requires LINGOFLOW_DATABASE_URL configured with a dedicated read-only database role.')
    this.name = 'LingoFlowReadDatabaseUnavailableError'
  }
}

/** Uses only the dedicated database URL provisioned with a SELECT-only role. */
export function getLingoFlowReadDb(): ReadDatabase {
  const databaseUrl = process.env.LINGOFLOW_DATABASE_URL
  if (!databaseUrl) throw new LingoFlowReadDatabaseUnavailableError()

  if (!lingoFlowReadDb) {
    lingoFlowReadDb = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  }

  return lingoFlowReadDb
}
