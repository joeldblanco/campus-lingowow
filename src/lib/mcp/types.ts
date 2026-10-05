import type { z } from 'zod'

export interface ToolModule<TShape extends z.ZodRawShape = z.ZodRawShape> {
  name: string
  description: string
  scopes: string[]
  inputShape?: TShape
  handler(args: z.output<z.ZodObject<TShape>>): Promise<unknown>
}

export type AnyToolModule = ToolModule<z.ZodRawShape>

/**
 * Keeps each tool's handler input tied to the shape it exposes to MCP.
 * The generic is inferred from `inputShape` before the tool is collected in
 * the heterogeneous registry.
 */
export function defineTool<TShape extends z.ZodRawShape>(tool: ToolModule<TShape>) {
  return tool
}
