import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

export interface ApiAuthResult {
  success: boolean
  userId?: string
  error?: string
  status?: number
  scopes?: string[]
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a new API key
 * Returns the raw key (to show user once) and the hash (to store)
 */
export function generateApiKey(): { rawKey: string; hash: string; prefix: string } {
  const rawKey = `lw_live_${crypto.randomBytes(32).toString('hex')}`
  const hash = hashApiKey(rawKey)
  const prefix = rawKey.substring(0, 15) + '...'
  return { rawKey, hash, prefix }
}

/**
 * Authenticate a request using either session or API key
 * Supports:
 * - Session-based auth (cookies)
 * - API Key auth (Authorization: Bearer lw_live_xxx)
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredScopes?: string[]
): Promise<ApiAuthResult> {
  // First, try session-based auth
  const session = await auth()
  if (session?.user?.id) {
    return {
      success: true,
      userId: session.user.id,
      scopes: ['*'], // Session users have all scopes
    }
  }

  // Try API Key auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Unauthorized. Provide a valid session or API key.',
      status: 401,
    }
  }

  const apiKey = authHeader.substring(7) // Remove 'Bearer '

  // Validate API key format
  if (!apiKey.startsWith('lw_live_')) {
    return {
      success: false,
      error: 'Invalid API key format',
      status: 401,
    }
  }

  // Look up the API key
  const keyHash = hashApiKey(apiKey)
  const apiKeyRecord = await db.apiKey.findUnique({
    where: { key: keyHash },
    include: {
      user: {
        select: { id: true, status: true },
      },
    },
  })

  if (!apiKeyRecord) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    }
  }

  // Check if key is active
  if (!apiKeyRecord.isActive) {
    return {
      success: false,
      error: 'API key is inactive',
      status: 401,
    }
  }

  // Check if key is expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      status: 401,
    }
  }

  // Check if user is active
  if (apiKeyRecord.user.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'User account is not active',
      status: 403,
    }
  }

  // Check scopes if required
  if (requiredScopes && requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((scope) =>
      apiKeyRecord.scopes.includes(scope) || apiKeyRecord.scopes.includes('*')
    )
    if (!hasAllScopes) {
      return {
        success: false,
        error: `Missing required scopes: ${requiredScopes.join(', ')}`,
        status: 403,
      }
    }
  }

  // Update last used timestamp (fire and forget)
  db.apiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors on last used update
    })

  return {
    success: true,
    userId: apiKeyRecord.userId,
    scopes: apiKeyRecord.scopes,
  }
}
