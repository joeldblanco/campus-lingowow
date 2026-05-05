import { academicPeriodTools } from '@/lib/mcp/tools/academic-periods'
import { activityTools } from '@/lib/mcp/tools/activities'
import { aiGradingLimitsTools } from '@/lib/mcp/tools/ai-grading-limits'
import { analyticsTools } from '@/lib/mcp/tools/analytics'
import { attendanceTools } from '@/lib/mcp/tools/attendance'
import { auditLogTools } from '@/lib/mcp/tools/audit-logs'
import { blockResponseTools } from '@/lib/mcp/tools/block-responses'
import { calendarTools } from '@/lib/mcp/tools/calendar'
import { classTools } from '@/lib/mcp/tools/classes'
import { classroomTools } from '@/lib/mcp/tools/classroom'
import { commercialExtrasTools } from '@/lib/mcp/tools/commercial-extras'
import { couponTools } from '@/lib/mcp/tools/coupons'
import { courseBuilderTools } from '@/lib/mcp/tools/course-builder'
import { courseTools } from '@/lib/mcp/tools/courses'
import { creditTools } from '@/lib/mcp/tools/credits'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { examTools } from '@/lib/mcp/tools/exams'
import { fileManagerTools } from '@/lib/mcp/tools/file-manager'
import { financeTools } from '@/lib/mcp/tools/finance'
import { floatingChatTools } from '@/lib/mcp/tools/floating-chat'
import { gradeTools } from '@/lib/mcp/tools/grades'
import { libraryTools } from '@/lib/mcp/tools/library'
import { notificationTools } from '@/lib/mcp/tools/notifications'
import { productTools } from '@/lib/mcp/tools/products'
import { scheduleTools } from '@/lib/mcp/tools/schedule'
import { teacherAvailabilityTools } from '@/lib/mcp/tools/teacher-availability'
import { teacherTools } from '@/lib/mcp/tools/teachers'
import { userTools } from '@/lib/mcp/tools/users'
import type { AnyToolModule } from '@/lib/mcp/types'

export const TOOL_REGISTRY: AnyToolModule[] = [
  ...userTools,
  ...enrollmentTools,
  ...financeTools,
  ...courseTools,
  ...courseBuilderTools,
  ...classTools,
  ...classroomTools,
  ...attendanceTools,
  ...couponTools,
  ...productTools,
  ...scheduleTools,
  ...teacherTools,
  ...teacherAvailabilityTools,
  ...academicPeriodTools,
  ...creditTools,
  ...auditLogTools,
  ...examTools,
  ...gradeTools,
  ...blockResponseTools,
  ...notificationTools,
  ...floatingChatTools,
  ...analyticsTools,
  ...activityTools,
  ...fileManagerTools,
  ...libraryTools,
  ...commercialExtrasTools,
  ...calendarTools,
  ...aiGradingLimitsTools,
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
