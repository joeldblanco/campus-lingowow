import { db } from '@/lib/db'
import { LibraryResourceAccess, SubscriptionStatus } from '@prisma/client'

export interface UserAccessInfo {
  userId: string | null
  hasActiveSubscription: boolean
  hasPremiumPlan: boolean
  accessibleLevels: LibraryResourceAccess[]
}

const PREMIUM_PLAN_SLUGS = ['wow', 'plan-wow', 'wow-plan']

export async function getUserAccessInfo(userId: string | null): Promise<UserAccessInfo> {
  if (!userId) {
    return {
      userId: null,
      hasActiveSubscription: false,
      hasPremiumPlan: false,
      accessibleLevels: [LibraryResourceAccess.PUBLIC],
    }
  }

  const activeSubscription = await db.subscription.findFirst({
    where: {
      userId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      plan: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  })

  const hasActiveSubscription = !!activeSubscription
  const hasPremiumPlan = activeSubscription
    ? PREMIUM_PLAN_SLUGS.some(
        (slug) =>
          activeSubscription.plan.slug.toLowerCase().includes(slug) ||
          activeSubscription.plan.name.toLowerCase().includes('wow')
      )
    : false

  const accessibleLevels: LibraryResourceAccess[] = [LibraryResourceAccess.PUBLIC]

  if (hasActiveSubscription) {
    accessibleLevels.push(LibraryResourceAccess.PRIVATE)
  }

  if (hasPremiumPlan) {
    accessibleLevels.push(LibraryResourceAccess.PREMIUM)
  }

  return {
    userId,
    hasActiveSubscription,
    hasPremiumPlan,
    accessibleLevels,
  }
}

export function canAccessResource(
  resourceAccessLevel: LibraryResourceAccess,
  userAccessInfo: UserAccessInfo
): boolean {
  return userAccessInfo.accessibleLevels.includes(resourceAccessLevel)
}

export function getAccessLevelFilter(userAccessInfo: UserAccessInfo) {
  return {
    accessLevel: {
      in: userAccessInfo.accessibleLevels,
    },
  }
}
