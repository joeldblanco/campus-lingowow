import jwt from 'jsonwebtoken'

interface JitsiUser {
  id: string
  name: string
  email: string
  avatar?: string
  isModerator: boolean
}

interface JitsiJWTPayload {
  aud: string
  context: {
    user: {
      id: string
      name: string
      email: string
      avatar?: string
      moderator: boolean
      'hidden-from-recorder': boolean
    }
    features: {
      recording: boolean
      livestreaming: boolean
      transcription: boolean
      'outbound-call': boolean
      'sip-outbound-call': boolean
    }
  }
  iss: string
  room: string
  sub: string
  exp: number
  nbf: number
}

export function generateJitsiJWT(user: JitsiUser, roomName: string, privateKey?: string): string {
  const appId = process.env.JAAS_APP_ID
  const kid = process.env.JAAS_KID
  
  // Usar la clave privada pasada como parámetro o desde variable de entorno
  const key = privateKey || process.env.JAAS_PRIVATE_KEY

  if (!appId || !kid || !key) {
    throw new Error('Faltan variables de entorno de JaaS (JAAS_APP_ID, JAAS_KID, JAAS_PRIVATE_KEY)')
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = now + (60 * 60) // 1 hora de expiración

  const payload: JitsiJWTPayload = {
    aud: 'jitsi',
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        moderator: user.isModerator, // TEACHER y ADMIN son moderadores
        'hidden-from-recorder': false
      },
      features: {
        recording: user.isModerator, // Solo moderadores (TEACHER/ADMIN) pueden grabar
        livestreaming: user.isModerator, // Solo moderadores pueden hacer streaming
        transcription: false,
        'outbound-call': false,
        'sip-outbound-call': false
      }
    },
    iss: 'chat',
    room: '*', // Wildcard permite cualquier sala del tenant
    sub: appId,
    exp,
    nbf: now - 10 // 10 segundos de gracia
  }

  const token = jwt.sign(payload, key, {
    algorithm: 'RS256',
    header: {
      alg: 'RS256',
      kid,
      typ: 'JWT'
    }
  })

  return token
}

export function generateRoomName(bookingId: string): string {
  // Formato: lingowow-clase-{bookingId}-{timestamp}
  const timestamp = Date.now().toString().slice(-6)
  return `lingowow-clase-${bookingId}-${timestamp}`
}
