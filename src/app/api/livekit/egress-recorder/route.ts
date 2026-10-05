import { NextRequest, NextResponse } from 'next/server'
import { buildEgressRecorderHtml } from './template'
import { authorizeRecorderToken } from './auth'

// Route handler for egress v1.8.4 which navigates to customBaseUrl?token=...&url=...
// (without appending /{roomName} to the path). Extracts room name from the JWT token.
// The [roomName]/route.ts handler is kept for backward compatibility.

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || ''
  const token = request.nextUrl.searchParams.get('token') || ''

  const authorization = await authorizeRecorderToken(token)
  if (!authorization) {
    return NextResponse.json({ error: 'Token de grabación no válido' }, { status: 401 })
  }

  const html = await buildEgressRecorderHtml({
    roomName: authorization.roomName,
    url,
    token,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
