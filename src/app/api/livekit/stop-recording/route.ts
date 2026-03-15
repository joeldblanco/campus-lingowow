import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { EgressClient } from 'livekit-server-sdk'

const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('wss://', 'https://') || ''
const apiKey = process.env.LIVEKIT_API_KEY || ''
const apiSecret = process.env.LIVEKIT_API_SECRET || ''

// POST endpoint for navigator.sendBeacon() — stops recording when user closes tab
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { egressId, bookingId } = body

    if (!egressId || !bookingId) {
      return NextResponse.json({ error: 'Missing egressId or bookingId' }, { status: 400 })
    }

    // Verify user has permission
    const booking = await db.classBooking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { teacherId: session.user.id },
          { studentId: session.user.id },
        ],
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!livekitHost || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

    try {
      await egressClient.stopEgress(egressId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // If already stopped or not found, that's OK
      if (!msg.includes('not found') && !msg.includes('already')) {
        console.error(`[stop-recording] Failed to stop egress ${egressId}:`, msg)
      }
    }

    console.log(`[stop-recording] Beacon stop for egress ${egressId} by user ${session.user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stop-recording] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
