import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const roomName = searchParams.get('roomName')

    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit configuration missing' },
        { status: 500 }
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

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating recording token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
