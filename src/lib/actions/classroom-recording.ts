'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk'

const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('wss://', 'https://') || ''
const apiKey = process.env.LIVEKIT_API_KEY || ''
const apiSecret = process.env.LIVEKIT_API_SECRET || ''

// Cloudflare R2 Configuration
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || ''
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings'

export async function startRecording(bookingId: string, roomName: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    // Verify user has access to this booking (teacher only)
    const booking = await db.classBooking.findFirst({
      where: {
        id: bookingId,
        teacherId: session.user.id,
      },
    })

    if (!booking) {
      return { success: false, error: 'No tienes permiso para grabar esta clase' }
    }

    if (!livekitHost || !apiKey || !apiSecret) {
      return { success: false, error: 'Configuración de LiveKit incompleta' }
    }

    const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

    // Configure output - use Cloudflare R2 if configured, otherwise local
    let output: EncodedFileOutput

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      // Cloudflare R2 storage (S3-compatible)
      const s3Upload = new S3Upload({
        accessKey: r2AccessKeyId,
        secret: r2SecretAccessKey,
        bucket: r2BucketName,
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
      })

      output = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `classes/${bookingId}/${roomName}-{time}.mp4`,
        output: { case: 's3', value: s3Upload },
      })
    } else {
      // Fallback to local storage
      output = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `recordings/${bookingId}/{room_name}-{time}.mp4`,
      })
    }

    // Get custom template URL for full classroom recording (content, whiteboard, screen share)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lingowow.com'
    const templateUrl = `${appUrl}/record`

    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: output },
      {
        layout: 'grid', // Fallback layout if template fails
        customBaseUrl: templateUrl,
        videoOnly: false, // Include audio
      }
    )

    // Store egress ID in video call record
    await db.videoCall.updateMany({
      where: { bookingId },
      data: { recordingUrl: info.egressId },
    })

    return {
      success: true,
      egressId: info.egressId,
      message: 'Grabación iniciada',
    }
  } catch (error) {
    console.error('Error starting recording:', error)
    return { success: false, error: 'Error al iniciar grabación' }
  }
}

export async function stopRecording(egressId: string, bookingId?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    if (!livekitHost || !apiKey || !apiSecret) {
      return { success: false, error: 'Configuración de LiveKit incompleta' }
    }

    const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

    const info = await egressClient.stopEgress(egressId)

    // Get bookingId from VideoCall if not provided
    let resolvedBookingId = bookingId
    if (!resolvedBookingId) {
      const videoCall = await db.videoCall.findFirst({
        where: { recordingUrl: egressId },
        select: { bookingId: true },
      })
      resolvedBookingId = videoCall?.bookingId || undefined
    }

    // Create ClassRecording record automatically
    if (resolvedBookingId) {
      try {
        const fileResult = info.fileResults?.[0]
        const filename = fileResult?.filename

        // Extract r2Key from the filename path
        // Format: classes/{bookingId}/{roomName}-{time}.mp4
        let r2Key: string | null = null
        if (filename) {
          // The filename from LiveKit includes the full path
          const match = filename.match(/(classes\/[^/]+\/[^/]+\.mp4)/)
          r2Key = match ? match[1] : filename
        }

        // Calculate duration from egress info
        let duration: number | null = null
        let startedAt: Date | null = null
        let endedAt: Date | null = null

        if (info.startedAt && info.endedAt) {
          try {
            // LiveKit timestamps are in nanoseconds (can be BigInt or string)
            // Convert directly to BigInt to preserve full precision
            const startNs =
              typeof info.startedAt === 'bigint' ? info.startedAt : BigInt(String(info.startedAt))
            const endNs =
              typeof info.endedAt === 'bigint' ? info.endedAt : BigInt(String(info.endedAt))

            // Convert nanoseconds to milliseconds using BigInt division, then to Number
            startedAt = new Date(Number(startNs / BigInt(1000000)))
            endedAt = new Date(Number(endNs / BigInt(1000000)))
            duration = Number((endNs - startNs) / BigInt(1000000000))
          } catch (e) {
            console.error('Error converting timestamps:', e)
            // Fallback: timestamps might already be in milliseconds or seconds
            const startMs = Number(info.startedAt)
            const endMs = Number(info.endedAt)
            if (!isNaN(startMs) && !isNaN(endMs)) {
              startedAt = new Date(startMs > 1e12 ? startMs : startMs * 1000)
              endedAt = new Date(endMs > 1e12 ? endMs : endMs * 1000)
              duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
            }
          }
        }

        await db.classRecording.upsert({
          where: { bookingId: resolvedBookingId },
          create: {
            bookingId: resolvedBookingId,
            egressId: egressId,
            roomName: info.roomName || null,
            filename: filename?.split('/').pop() || null,
            r2Key: r2Key,
            r2Bucket: r2BucketName,
            duration,
            startedAt,
            endedAt,
            status: 'READY',
          },
          update: {
            egressId: egressId,
            roomName: info.roomName || null,
            filename: filename?.split('/').pop() || null,
            r2Key: r2Key,
            r2Bucket: r2BucketName,
            duration,
            startedAt,
            endedAt,
            status: 'READY',
          },
        })

        console.log(`ClassRecording created/updated for booking ${resolvedBookingId}`)
      } catch (dbError) {
        console.error('Error creating ClassRecording record:', dbError)
        // Don't fail the whole operation if DB insert fails
      }
    }

    return {
      success: true,
      message: 'Grabación detenida',
      fileUrl: info.fileResults?.[0]?.filename,
    }
  } catch (error) {
    console.error('Error stopping recording:', error)
    return { success: false, error: 'Error al detener grabación' }
  }
}

export async function getRecordingStatus(egressId: string) {
  try {
    if (!livekitHost || !apiKey || !apiSecret) {
      return { success: false, error: 'Configuración de LiveKit incompleta' }
    }

    const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

    const egresses = await egressClient.listEgress({ egressId })

    if (egresses.length === 0) {
      return { success: false, error: 'Grabación no encontrada' }
    }

    const egress = egresses[0]

    return {
      success: true,
      status: egress.status,
      startedAt: egress.startedAt,
      endedAt: egress.endedAt,
    }
  } catch (error) {
    console.error('Error getting recording status:', error)
    return { success: false, error: 'Error al obtener estado de grabación' }
  }
}
