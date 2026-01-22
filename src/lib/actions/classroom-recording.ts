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

    // Verify user has access to this booking (teacher OR student)
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
      return { success: false, error: 'No tienes permiso para grabar esta clase' }
    }

    // Check if there's already an active recording for this room
    const existingRecording = await db.classRecording.findFirst({
      where: {
        bookingId,
        status: 'PROCESSING',
      },
    })

    if (existingRecording?.egressId) {
      // Recording already in progress, return existing egress ID
      return {
        success: true,
        egressId: existingRecording.egressId,
        message: 'Grabación ya en progreso',
        alreadyRecording: true,
      }
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

    // Get the next segment number for this booking
    const lastRecording = await db.classRecording.findFirst({
      where: { bookingId },
      orderBy: { segmentNumber: 'desc' },
      select: { segmentNumber: true },
    })
    const segmentNumber = (lastRecording?.segmentNumber || 0) + 1

    // Create a new ClassRecording record with PROCESSING status
    await db.classRecording.create({
      data: {
        bookingId,
        egressId: info.egressId,
        roomName,
        status: 'PROCESSING',
        segmentNumber,
        startedAt: new Date(),
      },
    })

    return {
      success: true,
      egressId: info.egressId,
      message: 'Grabación iniciada',
      segmentNumber,
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

    // Get bookingId from ClassRecording or VideoCall if not provided
    let resolvedBookingId = bookingId
    if (!resolvedBookingId) {
      const recording = await db.classRecording.findUnique({
        where: { egressId },
        select: { bookingId: true },
      })
      
      if (!recording) {
        const videoCall = await db.videoCall.findFirst({
          where: { recordingUrl: egressId },
          select: { bookingId: true },
        })
        resolvedBookingId = videoCall?.bookingId || undefined
      } else {
        resolvedBookingId = recording.bookingId
      }
    }

    // SECURITY: Fail-safe - bookingId must be resolved to verify permissions
    if (!resolvedBookingId) {
      return { success: false, error: 'No se pudo verificar los permisos de esta grabación' }
    }

    // Verify user has permission to stop this recording (teacher OR student of the class)
    const booking = await db.classBooking.findFirst({
      where: {
        id: resolvedBookingId,
        OR: [
          { teacherId: session.user.id },
          { studentId: session.user.id },
        ],
      },
    })

    if (!booking) {
      return { success: false, error: 'No tienes permiso para detener esta grabación' }
    }

    const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

    const info = await egressClient.stopEgress(egressId)

    // Update ClassRecording record with file info
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

        // Update the existing recording record by egressId (unique)
        const updatedRecording = await db.classRecording.update({
          where: { egressId },
          data: {
            roomName: info.roomName || null,
            filename: filename?.split('/').pop() || null,
            r2Key: r2Key,
            r2Bucket: r2BucketName,
            duration,
            startedAt,
            endedAt,
            status: 'READY',
          },
          include: {
            booking: {
              select: {
                studentId: true,
                day: true,
                timeSlot: true,
                enrollment: {
                  select: {
                    course: {
                      select: {
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        console.log(`ClassRecording updated for egressId ${egressId}`)

        // Crear notificación para el estudiante cuando la grabación esté lista
        try {
          const { createNotification } = await import('./notifications')
          await createNotification({
            userId: updatedRecording.booking.studentId,
            type: 'RECORDING_READY',
            title: 'Grabación disponible',
            message: `La grabación de tu clase de ${updatedRecording.booking.enrollment.course.title} del ${updatedRecording.booking.day} está lista para ver.`,
            link: `/recordings/${updatedRecording.id}`,
            metadata: {
              recordingId: updatedRecording.id,
              bookingId: updatedRecording.bookingId,
              courseTitle: updatedRecording.booking.enrollment.course.title,
            },
          })
        } catch (notifError) {
          console.error('Error creating notification for recording:', notifError)
          // No fallar la operación si falla la notificación
        }
      } catch (dbError) {
        console.error('Error updating ClassRecording record:', dbError)
        // Don't fail the whole operation if DB update fails
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
