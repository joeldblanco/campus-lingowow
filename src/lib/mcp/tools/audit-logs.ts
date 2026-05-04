import { z } from 'zod'
import { AuditAction, AuditCategory } from '@prisma/client'
import { exportAuditLogs, getAuditLogs } from '@/lib/actions/admin-audit-logs'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const auditActionEnum = z.nativeEnum(AuditAction)
const auditCategoryEnum = z.nativeEnum(AuditCategory)

export const auditLogTools: AnyToolModule[] = [
  {
    name: 'lingowow_audit_logs_list',
    description:
      'Lista entradas del audit log con filtros (action, category, userId, rango de fechas, búsqueda de texto). Útil para que el agente verifique el efecto de sus propias llamadas MCP.',
    scopes: ['mcp:audit-logs:read'],
    inputShape: {
      search: z.string().optional(),
      action: auditActionEnum.optional(),
      category: auditCategoryEnum.optional(),
      userId: z.string().optional(),
      dateFrom: z.string().optional().describe('YYYY-MM-DD'),
      dateTo: z.string().optional().describe('YYYY-MM-DD'),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(200).optional().default(50),
    },
    handler: async (args) => {
      const result = await getAuditLogs(args)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_audit_logs_export',
    description:
      'Exporta los audit logs que coincidan con los filtros (sin paginación). Pensado para reportes; ten cuidado con rangos de fechas amplios — devuelve todo en memoria.',
    scopes: ['mcp:audit-logs:read'],
    inputShape: {
      search: z.string().optional(),
      action: auditActionEnum.optional(),
      category: auditCategoryEnum.optional(),
      userId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    },
    handler: async (args) => {
      const result = await exportAuditLogs(args)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_audit_logs_recent_mcp',
    description:
      'Atajo: lista las invocaciones recientes del propio servidor MCP (action=MCP_TOOL_INVOKED) ordenadas por fecha desc. Útil para que el agente revise sus propias acciones.',
    scopes: ['mcp:audit-logs:read'],
    inputShape: {
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(200).optional().default(50),
      userId: z.string().optional().describe('Filtrar por usuario que invocó la tool'),
    },
    handler: async ({ page, pageSize, userId }) => {
      const result = await getAuditLogs({
        action: AuditAction.MCP_TOOL_INVOKED,
        page,
        pageSize,
        userId,
      })
      return unwrapActionResult(result)
    },
  },
]
