import { classTools } from '@/lib/mcp/tools/classes'
import { couponTools } from '@/lib/mcp/tools/coupons'
import { courseTools } from '@/lib/mcp/tools/courses'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { financeTools } from '@/lib/mcp/tools/finance'
import { productTools } from '@/lib/mcp/tools/products'
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
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
