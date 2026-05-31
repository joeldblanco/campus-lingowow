import { AsyncLocalStorage } from 'async_hooks'
import type { UserRole } from '@prisma/client'

export interface McpRequestContext {
  userId: string
  scopes: string[]
  roles: UserRole[]
  source: 'mcp'
}

const storage = new AsyncLocalStorage<McpRequestContext>()

export function runWithMcpContext<T>(ctx: McpRequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(ctx, fn)
}

export function getMcpContext(): McpRequestContext | undefined {
  return storage.getStore()
}

export function isMcpRequest(): boolean {
  return storage.getStore()?.source === 'mcp'
}
