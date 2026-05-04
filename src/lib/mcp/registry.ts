import { academicPeriodTools } from '@/lib/mcp/tools/academic-periods'
import { auditLogTools } from '@/lib/mcp/tools/audit-logs'
import { classTools } from '@/lib/mcp/tools/classes'
import { couponTools } from '@/lib/mcp/tools/coupons'
import { courseTools } from '@/lib/mcp/tools/courses'
import { creditTools } from '@/lib/mcp/tools/credits'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { financeTools } from '@/lib/mcp/tools/finance'
import { productTools } from '@/lib/mcp/tools/products'
import { teacherTools } from '@/lib/mcp/tools/teachers'
import { userTools } from '@/lib/mcp/tools/users'
import type { AnyToolModule } from '@/lib/mcp/types'

export const TOOL_REGISTRY: AnyToolModule[] = [
  ...userTools,
  ...enrollmentTools,
  ...financeTools,
  ...courseTools,
  ...classTools,
  ...couponTools,
  ...productTools,
  ...teacherTools,
  ...academicPeriodTools,
  ...creditTools,
  ...auditLogTools,
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
