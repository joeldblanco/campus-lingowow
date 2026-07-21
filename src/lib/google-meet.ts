import { JWT } from 'google-auth-library'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created'
const MEET_SPACES_URL = 'https://meet.googleapis.com/v2/spaces'

type GoogleMeetSpaceResponse = {
  name?: string
  meetingUri?: string
}

type GoogleMeetBooking = {
  meetingUrl: string | null
  meetingSpaceName: string | null
  meetingCode: string | null
}

export type EnsureGoogleMeetResult =
  | {
      success: true
      meetingUrl: string
      meetingSpaceName: string | null
      meetingCode: string | null
      created: boolean
    }
  | {
      success: false
      error: string
      retryable: true
    }

function normalizePrivateKey(key: string) {
  return key.replace(/\\n/g, '\n')
}

function getGoogleMeetConfig() {
  return {
    clientEmail: process.env.GOOGLE_MEET_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_MEET_PRIVATE_KEY,
    impersonatedUser: process.env.GOOGLE_MEET_IMPERSONATED_USER,
    accessType: process.env.GOOGLE_MEET_ACCESS_TYPE || 'OPEN',
  }
}

function extractMeetingCode(meetingUri: string | null | undefined) {
  if (!meetingUri) return null

  try {
    const url = new URL(meetingUri)
    const code = url.pathname.split('/').filter(Boolean)[0]
    return code || null
  } catch {
    const match = meetingUri.match(/meet\.google\.com\/([^/?#]+)/)
    return match?.[1] ?? null
  }
}

async function getMeetAccessToken() {
  const config = getGoogleMeetConfig()
  if (!config.clientEmail || !config.privateKey || !config.impersonatedUser) {
    throw new Error('Google Meet no configurado')
  }

  const client = new JWT({
    email: config.clientEmail,
    key: normalizePrivateKey(config.privateKey),
    subject: config.impersonatedUser,
    scopes: [MEET_SCOPE],
  })

  const response = await client.getAccessToken()
  const token = response?.token
  if (!token) {
    throw new Error('No se pudo obtener token de Google Meet')
  }

  return token
}

async function createGoogleMeetSpace() {
  const token = await getMeetAccessToken()
  const { accessType } = getGoogleMeetConfig()

  const response = await fetch(MEET_SPACES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google Meet API ${response.status}: ${body || response.statusText}`)
  }

  const space = (await response.json()) as GoogleMeetSpaceResponse
  if (!space.meetingUri) {
    throw new Error('Google Meet API no devolvió meetingUri')
  }

  return {
    meetingUrl: space.meetingUri,
    meetingSpaceName: space.name ?? null,
    meetingCode: extractMeetingCode(space.meetingUri),
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error desconocido creando sala Google Meet'
}

function existingMeetingResult(booking: GoogleMeetBooking): EnsureGoogleMeetResult {
  if (!booking.meetingUrl) {
    return {
      success: false,
      error: 'Clase sin sala Google Meet',
      retryable: true,
    }
  }

  return {
    success: true,
    meetingUrl: booking.meetingUrl,
    meetingSpaceName: booking.meetingSpaceName,
    meetingCode: booking.meetingCode,
    created: false,
  }
}

async function lockGoogleMeetBooking(tx: Prisma.TransactionClient, bookingId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${bookingId})::bigint)`
}

export async function ensureGoogleMeetSpaceForBooking(
  bookingId: string
): Promise<EnsureGoogleMeetResult> {
  const booking = await db.classBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      meetingUrl: true,
      meetingSpaceName: true,
      meetingCode: true,
    },
  })

  if (!booking) {
    return {
      success: false,
      error: 'Clase no encontrada',
      retryable: true,
    }
  }

  if (booking.meetingUrl) {
    return existingMeetingResult(booking)
  }

  return db.$transaction(
    async (tx) => {
      await lockGoogleMeetBooking(tx, bookingId)

      const lockedBooking = await tx.classBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          meetingUrl: true,
          meetingSpaceName: true,
          meetingCode: true,
        },
      })

      if (!lockedBooking) {
        return {
          success: false,
          error: 'Clase no encontrada',
          retryable: true,
        }
      }

      if (lockedBooking.meetingUrl) {
        return existingMeetingResult(lockedBooking)
      }

      try {
        const space = await createGoogleMeetSpace()

        await tx.classBooking.update({
          where: { id: bookingId },
          data: {
            meetingProvider: 'GOOGLE_MEET',
            meetingUrl: space.meetingUrl,
            meetingSpaceName: space.meetingSpaceName,
            meetingCode: space.meetingCode,
            meetingCreatedAt: new Date(),
            meetingLastError: null,
          },
        })

        return {
          success: true,
          ...space,
          created: true,
        }
      } catch (error) {
        const message = toErrorMessage(error)
        await tx.classBooking.update({
          where: { id: bookingId },
          data: {
            meetingProvider: 'GOOGLE_MEET',
            meetingLastError: message,
          },
        })

        return {
          success: false,
          error: message,
          retryable: true,
        }
      }
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    }
  )
}
