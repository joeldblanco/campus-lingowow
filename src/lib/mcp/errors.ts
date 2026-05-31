import { z } from 'zod'

export class McpToolError extends Error {
  constructor(
    message: string,
    public code: 'BAD_REQUEST' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' = 'INTERNAL',
    public details?: unknown
  ) {
    super(message)
    this.name = 'McpToolError'
  }
}

export function toMcpError(error: unknown): McpToolError {
  if (error instanceof McpToolError) return error

  if (error instanceof z.ZodError) {
    const message = error.errors.map((e) => `${e.path.join('.') || 'input'}: ${e.message}`).join('; ')
    return new McpToolError(`Validación fallida: ${message}`, 'BAD_REQUEST', error.errors)
  }

  if (error instanceof Error) {
    return new McpToolError(error.message, 'INTERNAL')
  }

  return new McpToolError('Error desconocido', 'INTERNAL')
}

/**
 * Normaliza el resultado de una server action que devuelve { error } o { success: false, error }
 * en un McpToolError. Devuelve el resultado intacto si no hay error.
 */
export function unwrapActionResult<T>(result: T): T {
  if (result && typeof result === 'object') {
    const r = result as { error?: string; success?: boolean }
    if (r.error) {
      throw new McpToolError(r.error, 'BAD_REQUEST')
    }
    if (r.success === false) {
      throw new McpToolError(r.error || 'La acción falló', 'BAD_REQUEST')
    }
  }
  return result
}
