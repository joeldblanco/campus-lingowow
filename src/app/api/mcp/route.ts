import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { authenticateMcpRequest } from '@/lib/mcp/auth'
import { runWithMcpContext } from '@/lib/mcp/context'
import { buildMcpServer } from '@/lib/mcp/server'
import { checkMcpRateLimit } from '@/lib/mcp/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handle(request: NextRequest): Promise<Response> {
  const auth = await authenticateMcpRequest(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json(
      { error: auth.error || 'No autorizado' },
      { status: auth.status || 401 }
    )
  }

  const rate = checkMcpRateLimit(auth.userId)
  if (!rate.ok) {
    return NextResponse.json(
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
  return response
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
