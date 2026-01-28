import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import crypto from 'crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Token validity window: 5 minutes
const TOKEN_VALIDITY_MS = 5 * 60 * 1000

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const roomName = searchParams.get('roomName')
    const recordingToken = searchParams.get('rt')
    const timestamp = searchParams.get('ts')

    console.log('[Recording Token API] Request received for room:', roomName)

    if (!roomName) {
      console.log('[Recording Token API] Error: roomName is required')
      return NextResponse.json(
        { error: 'roomName is required' },
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

    // Validate the recording token (HMAC signature)
    if (!recordingToken || !timestamp) {
      console.log('[Recording Token API] Error: Missing security token')
      return NextResponse.json(
        { error: 'Unauthorized: Missing security token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if timestamp is within validity window
    const tokenTime = parseInt(timestamp, 10)
    const now = Date.now()
    if (isNaN(tokenTime) || now - tokenTime > TOKEN_VALIDITY_MS) {
      console.log('[Recording Token API] Error: Token expired')
      return NextResponse.json(
        { error: 'Unauthorized: Token expired' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify HMAC signature using constant-time comparison to prevent timing attacks
    const expectedToken = crypto
      .createHmac('sha256', apiSecret)
      .update(`${roomName}:${timestamp}`)
      .digest('hex')

    // Use timingSafeEqual for constant-time comparison (prevents timing attacks)
    const tokenBuffer = Buffer.from(recordingToken, 'utf8')
    const expectedBuffer = Buffer.from(expectedToken, 'utf8')
    
    if (tokenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      console.log('[Recording Token API] Error: Invalid token signature')
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('[Recording Token API] Security token validated successfully')

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
