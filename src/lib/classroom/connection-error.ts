export type ConnectionErrorKind = 'auth' | 'network' | 'server'

export interface ClassroomConnectionCopy {
  title: string
  message: string
}

/**
 * Classifies a failed LiveKit join so the UI can show an honest, cause-specific
 * message instead of a generic "couldn't connect" that users blame on us.
 *
 * - `auth`    → no token was minted, or the signaling server rejected the token
 *               (401/403). Our side / the user's session.
 * - `server`  → misconfiguration or a 5xx / internal error. Our side.
 * - `network` → everything else. The signaling server is reachable for other
 *               participants, so a failure isolated to this client is
 *               overwhelmingly their internet / firewall / VPN.
 *
 * Pure so every branch is unit-testable without LiveKit or the browser.
 */
export function classifyConnectionError(hasToken: boolean, error: unknown): ConnectionErrorKind {
  // No token was ever minted -> our side / the user's session, not their network.
  if (!hasToken) return 'auth'

  const err = (error ?? {}) as {
    message?: unknown
    status?: unknown
    reason?: unknown
  }
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  const status = typeof err.status === 'number' ? err.status : undefined
  const reason = typeof err.reason === 'string' ? err.reason.toLowerCase() : ''

  // Explicit server misconfiguration (e.g. missing NEXT_PUBLIC_LIVEKIT_URL).
  if (message.includes('not configured') || message.includes('livekit_url')) return 'server'

  // HTTP status from token validation against the LiveKit signaling server.
  if (status === 401 || status === 403) return 'auth'
  if (typeof status === 'number' && status >= 500) return 'server'

  // LiveKit ConnectionError reasons, when surfaced as strings.
  // Check 'unreachable' before 'server' — "ServerUnreachable" contains both.
  if (reason.includes('notallowed') || reason.includes('not_allowed')) return 'auth'
  if (reason.includes('unreachable')) return 'network'
  if (reason.includes('internal') || reason.includes('server')) return 'server'

  // Our injected connection timeout, or any other connect failure: the room is
  // reachable for other participants, so this client's failure is almost always
  // local connectivity. Default to network for an accurate, actionable message.
  return 'network'
}

export function getConnectionErrorCopy(kind: ConnectionErrorKind): ClassroomConnectionCopy {
  switch (kind) {
    case 'auth':
      return {
        title: 'No pudimos validar tu acceso',
        message:
          'Tu sesión pudo haber expirado. Recarga la página o vuelve a iniciar sesión. Si el problema continúa, contáctanos.',
      }
    case 'server':
      return {
        title: 'Problema temporal del servicio',
        message:
          'Estamos teniendo un problema técnico de nuestro lado. Inténtalo de nuevo en unos minutos; si el problema persiste, escríbenos.',
      }
    case 'network':
    default:
      return {
        title: 'Problema con tu conexión',
        message:
          'No pudimos conectar con la sala desde tu dispositivo. Suele deberse a tu conexión a internet o a un firewall/VPN que bloquea las videollamadas. Prueba con otra red (por ejemplo, los datos móviles de tu teléfono) y vuelve a intentar.',
      }
  }
}
