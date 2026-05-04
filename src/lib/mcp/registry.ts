import { academicPeriodTools } from '@/lib/mcp/tools/academic-periods'
import { activityTools } from '@/lib/mcp/tools/activities'
import { analyticsTools } from '@/lib/mcp/tools/analytics'
import { auditLogTools } from '@/lib/mcp/tools/audit-logs'
import { classTools } from '@/lib/mcp/tools/classes'
import { commercialExtrasTools } from '@/lib/mcp/tools/commercial-extras'
import { couponTools } from '@/lib/mcp/tools/coupons'
import { courseTools } from '@/lib/mcp/tools/courses'
import { creditTools } from '@/lib/mcp/tools/credits'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { examTools } from '@/lib/mcp/tools/exams'
import { fileManagerTools } from '@/lib/mcp/tools/file-manager'
import { financeTools } from '@/lib/mcp/tools/finance'
import { gradeTools } from '@/lib/mcp/tools/grades'
import { libraryTools } from '@/lib/mcp/tools/library'
import { notificationTools } from '@/lib/mcp/tools/notifications'
import { productTools } from '@/lib/mcp/tools/products'
import { teacherAvailabilityTools } from '@/lib/mcp/tools/teacher-availability'
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
  ...teacherAvailabilityTools,
  ...academicPeriodTools,
  ...creditTools,
  ...auditLogTools,
  ...examTools,
  ...gradeTools,
  ...notificationTools,
  ...analyticsTools,
  ...activityTools,
  ...fileManagerTools,
  ...libraryTools,
  ...commercialExtrasTools,
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
