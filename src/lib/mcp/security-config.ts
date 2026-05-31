/**
 * Configuración de seguridad del endpoint MCP — todas las opciones se leen de
 * variables de entorno para que producción/staging puedan ajustarlas sin
 * redeploy de código.
 */

/**
 * Feature flag de kill-switch. Si MCP_DISABLED=true, el endpoint responde 503.
 * Útil para apagar el MCP sin redeploy si se detecta abuso.
 */
export function isMcpDisabled(): boolean {
  const raw = process.env.MCP_DISABLED?.toLowerCase().trim()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

/**
 * Lista de orígenes permitidos para CORS. CSV en MCP_ALLOWED_ORIGINS, ej:
 *   "https://claude.ai,https://desktop.claude.ai"
 * "*" desactiva la restricción (no recomendado en producción).
 * Si la variable no está, no se envían headers CORS y el navegador no
 * permitirá llamadas cross-origin (es la postura por defecto, segura).
 */
export function getAllowedOrigins(): string[] | '*' | undefined {
  const raw = process.env.MCP_ALLOWED_ORIGINS?.trim()
  if (!raw) return undefined
  if (raw === '*') return '*'
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

/**
 * Lista de hosts permitidos para protección contra DNS rebinding. CSV en
 * MCP_ALLOWED_HOSTS, ej: "lingowow.com,api.lingowow.com,localhost:3000".
 * Si está sin definir, NO se valida el host (postura por defecto: trust).
 */
export function getAllowedHosts(): string[] | undefined {
  const raw = process.env.MCP_ALLOWED_HOSTS?.trim()
  if (!raw) return undefined
  return raw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
}

/**
 * Verifica que el header Host coincida con la lista de hosts permitidos.
 * Defensa contra DNS rebinding: un atacante con un dominio que apunta a tu
 * servidor podría engañar al navegador para enviar credenciales.
 */
export function isHostAllowed(request: Request): boolean {
  const allowed = getAllowedHosts()
  if (!allowed) return true
  const host = request.headers.get('host')
  if (!host) return false
  return allowed.includes(host)
}

/**
 * Resuelve el header Access-Control-Allow-Origin para una request dada.
 * Devuelve undefined si no se debe enviar el header.
 */
export function resolveCorsOrigin(request: Request): string | undefined {
  const origin = request.headers.get('origin')
  if (!origin) return undefined
  const allowed = getAllowedOrigins()
  if (!allowed) return undefined
  if (allowed === '*') return '*'
  return allowed.includes(origin) ? origin : undefined
}

/**
 * Aplica los headers CORS estándar a una Response existente.
 */
export function applyCorsHeaders(response: Response, request: Request): Response {
  const allowOrigin = resolveCorsOrigin(request)
  if (allowOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
    response.headers.set('Vary', 'Origin')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID'
    )
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    response.headers.set('Access-Control-Max-Age', '86400')
    response.headers.set('Access-Control-Expose-Headers', 'MCP-Session-Id, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After')
  }
  return response
}
