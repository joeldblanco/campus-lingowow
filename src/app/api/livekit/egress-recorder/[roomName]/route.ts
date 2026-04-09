import { NextRequest, NextResponse } from 'next/server'
import { buildEgressRecorderHtml } from '../template'

// This Route Handler returns raw HTML (not RSC) for the LiveKit egress headless Chrome.
// It emits START_RECORDING as a real <script> tag in the HTML, guaranteed to execute
// before any JS bundle. The livekit-client SDK is loaded from CDN to avoid Next.js
// bundle hydration issues that prevent the egress from receiving the signal.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  const { roomName } = await params
  const url = request.nextUrl.searchParams.get('url') || ''
  const token = request.nextUrl.searchParams.get('token') || ''
  const html = await buildEgressRecorderHtml({ roomName, url, token })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
