import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const roomName = searchParams.get('roomName')

    console.log('[Recording Token API] Request received for room:', roomName)

    if (!roomName) {
      console.log('[Recording Token API] Error: roomName is required')
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate roomName format - must be a valid lingowow room
    // This provides basic protection against random access
    if (!roomName.startsWith('lingowow-clase-')) {
      console.log('[Recording Token API] Error: Invalid room name format')
      return NextResponse.json(
        { error: 'Invalid room name' },
        { status: 400, headers: corsHeaders }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      console.log('[Recording Token API] Error: LiveKit configuration missing')
      return NextResponse.json(
        { error: 'LiveKit configuration missing' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Create a read-only token for the recorder
    // This identity is special - it's the egress recorder
    const recorderIdentity = `egress-recorder-${roomName}`

    const at = new AccessToken(apiKey, apiSecret, {
      identity: recorderIdentity,
      name: 'Recorder',
      metadata: JSON.stringify({
        isRecorder: true,
        isModerator: false,
      }),
    })

    // Grant read-only permissions - recorder only needs to subscribe
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false, // Recorder doesn't publish
      canSubscribe: true, // Recorder needs to subscribe to all tracks
      canPublishData: false,
      roomAdmin: false,
      roomCreate: false,
      roomList: false,
      roomRecord: false,
      hidden: true, // Hide recorder from participant list
    })

    const token = await at.toJwt()

    console.log('[Recording Token API] Token generated successfully for:', recorderIdentity)

    return NextResponse.json({ token }, { headers: corsHeaders })
  } catch (error) {
    console.error('[Recording Token API] Error generating recording token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500, headers: corsHeaders }
    )
  }
}
