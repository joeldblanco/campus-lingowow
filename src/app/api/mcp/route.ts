import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { authenticateMcpRequest } from '@/lib/mcp/auth'
import { runWithMcpContext } from '@/lib/mcp/context'
import { buildMcpServer } from '@/lib/mcp/server'
import { checkMcpRateLimit } from '@/lib/mcp/rate-limit'
import {
  applyCorsHeaders,
  isHostAllowed,
  isMcpDisabled,
  resolveCorsOrigin,
} from '@/lib/mcp/security-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function makeJsonResponse(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
): Response {
  const response = NextResponse.json(body, init)
  return applyCorsHeaders(response, request)
}

async function handle(request: NextRequest): Promise<Response> {
  if (isMcpDisabled()) {
    return makeJsonResponse(
      request,
      { error: 'El servidor MCP está deshabilitado temporalmente.' },
      { status: 503, headers: { 'Retry-After': '300' } }
    )
  }

  if (!isHostAllowed(request)) {
    return makeJsonResponse(
      request,
      { error: 'Host no permitido.' },
      { status: 403 }
    )
  }

  const auth = await authenticateMcpRequest(request)
  if (!auth.success || !auth.userId) {
    return makeJsonResponse(
      request,
      { error: auth.error || 'No autorizado' },
      { status: auth.status || 401 }
    )
  }

  const rate = checkMcpRateLimit(auth.userId)
  if (!rate.ok) {
    return makeJsonResponse(
      request,
      { error: 'Rate limit excedido. Reintenta más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const ctx = {
    userId: auth.userId,
    scopes: auth.scopes ?? [],
    roles: auth.roles ?? [],
    source: 'mcp' as const,
  }

  const response = await runWithMcpContext(ctx, async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    const server = buildMcpServer({ userId: ctx.userId, scopes: ctx.scopes })
    await server.connect(transport)

    try {
      return await transport.handleRequest(request)
    } finally {
      await server.close().catch(() => {})
    }
  })

  response.headers.set('X-RateLimit-Limit', String(rate.limit))
  response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
  return applyCorsHeaders(response, request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function DELETE(request: NextRequest) {
  return handle(request)
}

/**
 * Preflight CORS — los browsers que llaman a /api/mcp desde otro origin
 * envían un OPTIONS antes del POST real. Si CORS no está configurado,
 * resolveCorsOrigin devuelve undefined y respondemos sin headers (lo que
 * efectivamente bloquea el cross-origin call, postura segura por defecto).
 */
export async function OPTIONS(request: NextRequest) {
  const allowOrigin = resolveCorsOrigin(request)
  if (!allowOrigin) {
    return new NextResponse(null, { status: 403 })
  }
  return applyCorsHeaders(new NextResponse(null, { status: 204 }), request)
}
