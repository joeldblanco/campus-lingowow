import { AccessToken } from 'livekit-server-sdk'

interface LiveKitUser {
  id: string
  name: string
  email: string
  avatar?: string
  isModerator: boolean
}

export async function generateLiveKitToken(
  user: LiveKitUser,
  roomName: string
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Faltan variables de entorno de LiveKit (LIVEKIT_API_KEY, LIVEKIT_API_SECRET)')
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({
      email: user.email,
      avatar: user.avatar,
      isModerator: user.isModerator,
    }),
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: user.isModerator,
    roomCreate: user.isModerator,
    roomList: user.isModerator,
    roomRecord: user.isModerator,
  })

  return await at.toJwt()
}

export function generateRoomName(bookingId: string): string {
  const timestamp = Date.now().toString().slice(-6)
  return `lingowow-clase-${bookingId}-${timestamp}`
}
