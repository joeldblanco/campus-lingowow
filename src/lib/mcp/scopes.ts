/**
 * Catálogo de scopes MCP y presets para la UI de creación de API keys.
 * Mantener sincronizado con los scopes declarados en src/lib/mcp/tools/*.ts.
 */

export interface McpScopeDefinition {
  scope: string
  domain: string
  action: 'read' | 'write' | 'admin'
  description: string
}

export const MCP_SCOPES: McpScopeDefinition[] = [
  // Usuarios
  { scope: 'mcp:users:read', domain: 'users', action: 'read', description: 'Listar y consultar usuarios' },
  { scope: 'mcp:users:write', domain: 'users', action: 'write', description: 'Crear, actualizar y eliminar usuarios' },
  // Inscripciones
  { scope: 'mcp:enrollments:read', domain: 'enrollments', action: 'read', description: 'Listar inscripciones y stats' },
  { scope: 'mcp:enrollments:write', domain: 'enrollments', action: 'write', description: 'Crear/actualizar/eliminar inscripciones y sincronizar estados' },
  // Finanzas
  { scope: 'mcp:finance:read', domain: 'finance', action: 'read', description: 'Reportes financieros y confirmaciones de pago' },
  { scope: 'mcp:finance:write', domain: 'finance', action: 'write', description: 'Crear movimientos, reglas recurrentes, actualizar pagos' },
  // Cursos
  { scope: 'mcp:courses:read', domain: 'courses', action: 'read', description: 'Listar y consultar cursos y stats' },
  { scope: 'mcp:courses:write', domain: 'courses', action: 'write', description: 'Crear, actualizar, archivar y publicar cursos' },
  // Clases / sesiones
  { scope: 'mcp:classes:read', domain: 'classes', action: 'read', description: 'Listar y consultar clases (sesiones) y stats' },
  { scope: 'mcp:classes:write', domain: 'classes', action: 'write', description: 'Crear, actualizar, reprogramar, eliminar clases (incluye operaciones en lote)' },
  // Cupones
  { scope: 'mcp:coupons:read', domain: 'coupons', action: 'read', description: 'Listar y consultar cupones' },
  { scope: 'mcp:coupons:write', domain: 'coupons', action: 'write', description: 'Crear, actualizar y eliminar cupones' },
  // Productos / Planes
  { scope: 'mcp:products:read', domain: 'products', action: 'read', description: 'Listar productos, planes, categorías y tags' },
  { scope: 'mcp:products:write', domain: 'products', action: 'write', description: 'Crear, actualizar y eliminar productos y planes' },
  // Profesores
  { scope: 'mcp:teachers:read', domain: 'teachers', action: 'read', description: 'Listar profesores, disponibilidad, reportes y proyecciones de pago' },
  { scope: 'mcp:teachers:write', domain: 'teachers', action: 'write', description: 'Marcar clases como pagables/no pagables' },
  // Períodos académicos
  { scope: 'mcp:academic-periods:read', domain: 'academic-periods', action: 'read', description: 'Listar períodos, temporadas y consultar período por fecha' },
  { scope: 'mcp:academic-periods:write', domain: 'academic-periods', action: 'write', description: 'Crear/activar períodos y temporadas, generar año completo' },
  // Créditos virtuales
  { scope: 'mcp:credits:read', domain: 'credits', action: 'read', description: 'Consultar balances, transacciones y paquetes de créditos' },
  { scope: 'mcp:credits:write', domain: 'credits', action: 'write', description: 'Ajustar balances de usuarios y gestionar paquetes de créditos' },
  // Audit logs
  { scope: 'mcp:audit-logs:read', domain: 'audit-logs', action: 'read', description: 'Leer y exportar el registro de auditoría' },
]

export interface McpScopePreset {
  id: string
  label: string
  description: string
  scopes: string[]
  destructive?: boolean
}

export const MCP_SCOPE_PRESETS: McpScopePreset[] = [
  {
    id: 'mcp-readonly',
    label: 'MCP solo lectura',
    description: 'Acceso de solo lectura a usuarios, inscripciones, finanzas y cursos.',
    scopes: MCP_SCOPES.filter((s) => s.action === 'read').map((s) => s.scope),
  },
  {
    id: 'mcp-full',
    label: 'MCP admin completo',
    description: 'Lectura y escritura en todos los dominios MCP. Solo para usuarios con rol ADMIN.',
    scopes: MCP_SCOPES.map((s) => s.scope),
    destructive: true,
  },
]

/**
 * Scopes de escritura MCP que requieren expiración obligatoria
 * (sugerida en el plan: máx 90 días). El cliente puede inspeccionar
 * esto para forzar `expiresInDays` en el formulario.
 */
export const MCP_WRITE_SCOPES = MCP_SCOPES.filter((s) => s.action === 'write').map(
  (s) => s.scope
)

export function isMcpWriteScope(scope: string): boolean {
  return MCP_WRITE_SCOPES.includes(scope) || scope === 'mcp:*' || scope === '*'
}

export function hasAnyMcpWriteScope(scopes: string[]): boolean {
  return scopes.some(isMcpWriteScope)
}
