import { NextRequest, NextResponse } from 'next/server'
import { buildEgressRecorderHtml } from './template'

// Route handler for egress v1.8.4 which navigates to customBaseUrl?token=...&url=...
// (without appending /{roomName} to the path). Extracts room name from the JWT token.
// The [roomName]/route.ts handler is kept for backward compatibility.

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || ''
  const token = request.nextUrl.searchParams.get('token') || ''

  // Extract room name from JWT token payload (no verification needed, just reading claims)
  let roomName = 'recording'
  try {
    const parts = token.split('.')
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      roomName = payload.video?.room || payload.sub || 'recording'
    }
  } catch {
    // fallback
  }

  const html = await buildEgressRecorderHtml({ roomName, url, token })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
