'use server'

import { db } from '@/lib/db'

export async function subscribeToNewsletter(
  email: string,
  userId?: string,
  source?: string
) {
  try {
    const subscription = await db.newsletterSubscription.upsert({
      where: { email },
      create: {
        email,
        userId,
        source,
        isSubscribed: true,
        subscribedAt: new Date(),
      },
      update: {
        isSubscribed: true,
        userId: userId || undefined,
        subscribedAt: new Date(),
        unsubscribedAt: null,
      },
    })

    return { success: true, subscription }
  } catch (error) {
    console.error('Error subscribing to newsletter:', error)
    return { success: false, error: 'Error al suscribirse al newsletter' }
  }
}

export async function unsubscribeFromNewsletter(email: string) {
  try {
    const subscription = await db.newsletterSubscription.update({
      where: { email },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    })

    return { success: true, subscription }
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error)
    return { success: false, error: 'Error al cancelar suscripción' }
  }
}

export async function getNewsletterSubscriptions(options?: {
  isSubscribed?: boolean
  page?: number
  limit?: number
}) {
  try {
    const { isSubscribed, page = 1, limit = 50 } = options || {}
    
    const where = isSubscribed !== undefined ? { isSubscribed } : {}
    
    const [subscriptions, total] = await Promise.all([
      db.newsletterSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.newsletterSubscription.count({ where }),
    ])

    return {
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching newsletter subscriptions:', error)
    return { success: false, error: 'Error al obtener suscripciones' }
  }
}

export async function checkNewsletterSubscription(email: string) {
  try {
    const subscription = await db.newsletterSubscription.findUnique({
      where: { email },
    })

    return {
      success: true,
      isSubscribed: subscription?.isSubscribed ?? false,
      subscription,
    }
  } catch (error) {
    console.error('Error checking newsletter subscription:', error)
    return { success: false, error: 'Error al verificar suscripción' }
  }
}
