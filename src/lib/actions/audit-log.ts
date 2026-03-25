'use server'

import { auth } from '@/auth'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditCategory } from '@prisma/client'

interface TrackEventParams {
  action: AuditAction
  category: AuditCategory
  description: string
  metadata?: Record<string, unknown>
}

export async function trackEvent(params: TrackEventParams) {
  const session = await auth()
  if (!session?.user?.id) return

  await createAuditLog({
    userId: session.user.id,
    action: params.action,
    category: params.category,
    description: params.description,
    metadata: {
      ...params.metadata,
      email: session.user.email,
      roles: session.user.roles,
    },
  })
}
