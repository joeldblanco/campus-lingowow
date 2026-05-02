import type { z } from 'zod'

export interface ToolModule<TShape extends z.ZodRawShape = z.ZodRawShape> {
  name: string
  description: string
  scopes: string[]
  inputShape?: TShape
  handler: (args: TShape extends z.ZodRawShape ? z.infer<z.ZodObject<TShape>> : Record<string, never>) => Promise<unknown>
}

export type AnyToolModule = ToolModule<z.ZodRawShape>
