import { auth } from '@/auth'
import { getMcpContext } from '@/lib/mcp/context'
import { db } from '@/lib/db'

export async function getCurrentUser() {
  try {
    const session = await auth()
    if (session?.user) return session.user

    // Fallback para llamadas que entran vía servidor MCP (sin cookies).
    const mcp = getMcpContext()
    if (mcp) {
      const user = await db.user.findUnique({
        where: { id: mcp.userId },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          image: true,
          roles: true,
        },
      })
      return user || null
    }

    return null
  } catch (error) {
    console.error('Error obteniendo el usuario:', error)
    return null
  }
}

/**
 * Devuelve el ID del actor que está ejecutando la operación, desde la sesión NextAuth
 * o desde el contexto MCP cuando la llamada viene del servidor MCP.
 * Útil para registrar el actor en audit logs sin tener que cargar el usuario completo.
 */
export async function getActorId(): Promise<string | undefined> {
  try {
    const session = await auth()
    if (session?.user?.id) return session.user.id
  } catch {
    // ignore
  }
  return getMcpContext()?.userId
}
