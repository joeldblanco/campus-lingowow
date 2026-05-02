import { courseTools } from '@/lib/mcp/tools/courses'
import { enrollmentTools } from '@/lib/mcp/tools/enrollments'
import { financeTools } from '@/lib/mcp/tools/finance'
import { userTools } from '@/lib/mcp/tools/users'
import type { AnyToolModule } from '@/lib/mcp/types'

export const TOOL_REGISTRY: AnyToolModule[] = [
  ...userTools,
  ...enrollmentTools,
  ...financeTools,
  ...courseTools,
]

export const ALL_MCP_SCOPES = Array.from(
  new Set(TOOL_REGISTRY.flatMap((tool) => tool.scopes))
).sort()
