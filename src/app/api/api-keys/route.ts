import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateApiKey } from '@/lib/api-auth'
import { hasAnyMcpWriteScope } from '@/lib/mcp/scopes'
import { z } from 'zod'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

const MCP_WRITE_MAX_DAYS = 90

/**
 * GET /api/api-keys
 * List all API keys for the current user
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKeys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: apiKeys,
    })
  } catch (error) {
    console.error('Error listing API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createApiKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, scopes, expiresInDays } = validation.data

    // Reglas de seguridad para scopes MCP de escritura: requieren rol ADMIN
    // y expiración obligatoria (máx 90 días).
    const requestedScopes = scopes ?? ['lessons:read', 'lessons:write']
    const requiresAdmin =
      hasAnyMcpWriteScope(requestedScopes) || requestedScopes.includes('*')

    if (requiresAdmin) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true },
      })
      if (!user?.roles.includes(UserRole.ADMIN)) {
        return NextResponse.json(
          {
            error:
              'Los scopes MCP de escritura solo pueden asignarse a usuarios con rol ADMIN',
          },
          { status: 403 }
        )
      }
      if (!expiresInDays || expiresInDays > MCP_WRITE_MAX_DAYS) {
        return NextResponse.json(
          {
            error: `Las API keys con scopes MCP de escritura requieren expiración entre 1 y ${MCP_WRITE_MAX_DAYS} días`,
          },
          { status: 400 }
        )
      }
    }

    // Generate the API key
    const { rawKey, hash, prefix } = generateApiKey()

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    // Create the API key record
    const apiKey = await db.apiKey.create({
      data: {
        name,
        key: hash,
        prefix,
        userId: session.user.id,
        scopes: requestedScopes,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Return the raw key ONLY on creation (it cannot be retrieved later)
    return NextResponse.json({
      success: true,
      data: {
        ...apiKey,
        key: rawKey, // Only returned once!
      },
      message:
        'API key created successfully. Save this key securely - it cannot be retrieved again.',
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
