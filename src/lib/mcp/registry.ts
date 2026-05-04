import { academicPeriodTools } from '@/lib/mcp/tools/academic-periods'
import { analyticsTools } from '@/lib/mcp/tools/analytics'
import { auditLogTools } from '@/lib/mcp/tools/audit-logs'
import { classTools } from '@/lib/mcp/tools/classes'
import { couponTools } from '@/lib/mcp/tools/coupons'
import { courseTools } from '@/lib/mcp/tools/courses'
import { creditTools } from '@/lib/mcp/tools/credits'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { examTools } from '@/lib/mcp/tools/exams'
import { financeTools } from '@/lib/mcp/tools/finance'
import { gradeTools } from '@/lib/mcp/tools/grades'
import { notificationTools } from '@/lib/mcp/tools/notifications'
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
  ...examTools,
  ...gradeTools,
  ...notificationTools,
  ...analyticsTools,
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
