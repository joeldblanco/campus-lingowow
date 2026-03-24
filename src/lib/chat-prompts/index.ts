import { getBasePrompt } from './base'
import { STUDENT_SCHEDULING_SKILL, PAYMENT_FLOW_SKILL } from './skill-student'
import { ADMIN_INVOICING_SKILL, ADMIN_ENROLLMENT_SKILL, ADMIN_SCHEDULING_SKILL, ADMIN_TIMEZONE_SKILL } from './skill-admin'

interface PromptContext {
  name: string
  role: string
  email: string
  timezone: string
  currentDate: string
  roles: string[]
}

/**
 * Build the system prompt dynamically based on the user's roles.
 * Only injects the skill blocks relevant to the active role,
 * reducing token consumption for roles that don't need all instructions.
 */
export function buildSystemPrompt(context: PromptContext): string {
  const parts: string[] = [getBasePrompt(context)]

  if (context.roles.includes('ADMIN')) {
    parts.push(ADMIN_INVOICING_SKILL)
    parts.push(ADMIN_ENROLLMENT_SKILL)
    parts.push(ADMIN_SCHEDULING_SKILL)
    parts.push(ADMIN_TIMEZONE_SKILL)
  }

  if (context.roles.includes('STUDENT')) {
    parts.push(STUDENT_SCHEDULING_SKILL)
  }

  if (context.roles.includes('STUDENT') || context.roles.includes('GUEST')) {
    parts.push(PAYMENT_FLOW_SKILL)
  }

  return parts.join('\n\n')
}
