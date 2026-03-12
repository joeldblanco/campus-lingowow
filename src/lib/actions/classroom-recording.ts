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
    // Uses API Route Handler that returns raw HTML (not RSC) to guarantee START_RECORDING
    // signal is emitted as a real <script> tag before any JS bundle loads.
    // LiveKit egress appends /{roomName}?url=...&token=...&layout=... to customBaseUrl
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lingowow.com'
    const templateUrl = `${appUrl}/api/livekit/egress-recorder`

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

    let info
    try {
      info = await egressClient.stopEgress(egressId)
    } catch (egressError: unknown) {
      // If egress is already completed or not found, try to update from R2 directly
      const errorMessage = egressError instanceof Error ? egressError.message : String(egressError)
      console.warn(`stopEgress failed for ${egressId}: ${errorMessage}`)

      // If egress was already ended, that's OK - the webhook will handle it
      if (errorMessage.includes('not found') || errorMessage.includes('already')) {
        return {
          success: true,
          message: 'Grabación ya finalizada (será procesada por webhook)',
          pendingWebhook: true,
        }
      }
      throw egressError
    }

    // Check if the egress was aborted or failed
    // Status 5 = EGRESS_FAILED/ABORTED, Status 4 = EGRESS_COMPLETE
    const egressError = (info as unknown as { error?: string }).error || ''
    const egressStatus = info.status
    const isEgressFailed = egressStatus === 5 || egressError.length > 0

    if (isEgressFailed) {
      console.log(`stopRecording: egressId=${egressId} was aborted/failed, status=${egressStatus}, error=${egressError}`)
      await db.classRecording.update({
        where: { egressId },
        data: {
          status: 'FAILED',
          metadata: {
            egressError: egressError || 'Egress aborted',
            egressStatus,
            stoppedAt: new Date().toISOString(),
          },
        },
      })
      return {
        success: true,
        message: 'La grabación no se completó correctamente',
        pendingWebhook: false,
      }
    }

    // Extract file info - SDK v2 can return in fileResults[] or file
    const fileResult = info.fileResults?.[0] || (info as unknown as { file?: { filename?: string } }).file
    const filename = fileResult?.filename

    // Extract r2Key from the filename path
    // Format: classes/{bookingId}/{roomName}-{time}.mp4
    let r2Key: string | null = null
    if (filename) {
      const match = filename.match(/(classes\/[^/]+\/[^/]+\.mp4)/)
      r2Key = match ? match[1] : filename
    }

    // Calculate duration from egress info
    let duration: number | null = null
    let startedAt: Date | null = null
    let endedAt: Date | null = null

    if (info.startedAt && info.endedAt) {
      try {
        const startNs =
          typeof info.startedAt === 'bigint' ? info.startedAt : BigInt(String(info.startedAt))
        const endNs =
          typeof info.endedAt === 'bigint' ? info.endedAt : BigInt(String(info.endedAt))

        startedAt = new Date(Number(startNs / BigInt(1000000)))
        endedAt = new Date(Number(endNs / BigInt(1000000)))
        duration = Number((endNs - startNs) / BigInt(1000000000))
      } catch (e) {
        console.error('Error converting timestamps:', e)
        const startMs = Number(info.startedAt)
        const endMs = Number(info.endedAt)
        if (!isNaN(startMs) && !isNaN(endMs)) {
          startedAt = new Date(startMs > 1e12 ? startMs : startMs * 1000)
          endedAt = new Date(endMs > 1e12 ? endMs : endMs * 1000)
          duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
        }
      }
    }

    // If we have file info, update to READY immediately
    // If not, keep as PROCESSING - the webhook will update it when the file is uploaded
    const hasFileInfo = !!r2Key
    const newStatus = hasFileInfo ? 'READY' : 'PROCESSING'

    console.log(`stopRecording: egressId=${egressId}, hasFile=${hasFileInfo}, status=${newStatus}, r2Key=${r2Key}`)

    const updatedRecording = await db.classRecording.update({
      where: { egressId },
      data: {
        roomName: info.roomName || null,
        filename: filename?.split('/').pop() || null,
        r2Key,
        r2Bucket: r2BucketName,
        duration,
        startedAt,
        endedAt,
        status: newStatus,
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

    console.log(`ClassRecording updated for egressId ${egressId} -> ${newStatus}`)

    // Send notification only if recording is READY (has file)
    // Otherwise, the webhook will send the notification when the file is ready
    if (hasFileInfo) {
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
      }
    }

    // If file is not ready yet, start background polling as fallback
    // (in case webhook doesn't arrive)
    if (!hasFileInfo) {
      pollEgressUntilReady(egressId).catch(err =>
        console.error(`Background polling failed for ${egressId}:`, err)
      )
    }

    return {
      success: true,
      message: hasFileInfo ? 'Grabación detenida y guardada' : 'Grabación detenida, procesando archivo...',
      fileUrl: filename,
      pendingWebhook: !hasFileInfo,
    }
  } catch (error) {
    console.error('Error stopping recording:', error)

    // Mark recording as FAILED if we can't stop it properly
    try {
      await db.classRecording.updateMany({
        where: { egressId, status: 'PROCESSING' },
        data: { status: 'FAILED' },
      })
    } catch (dbErr) {
      console.error('Error marking recording as FAILED:', dbErr)
    }

    return { success: false, error: 'Error al detener grabación' }
  }
}

/**
 * Background polling: checks egress status every 10s for up to 5 minutes.
 * If the egress completes and has file info, updates the ClassRecording.
 * This is a fallback in case the webhook doesn't arrive.
 */
async function pollEgressUntilReady(egressId: string, maxAttempts = 30, intervalMs = 10000) {
  const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs))

    try {
      // Check if webhook already updated the recording
      const recording = await db.classRecording.findUnique({
        where: { egressId },
        select: { status: true, r2Key: true },
      })

      if (!recording || recording.status === 'READY' || recording.status === 'FAILED') {
        console.log(`pollEgress: ${egressId} already ${recording?.status || 'deleted'}, stopping poll`)
        return
      }

      // Query LiveKit for current egress status
      const egresses = await egressClient.listEgress({ egressId })
      if (egresses.length === 0) {
        console.warn(`pollEgress: egress ${egressId} not found in LiveKit`)
        continue
      }

      const egress = egresses[0]
      // EgressStatus: EGRESS_COMPLETE = 4, EGRESS_FAILED/ABORTED = 5
      const isComplete = egress.status === 4
      const isFailed = egress.status === 5

      if (isFailed) {
        console.log(`pollEgress: ${egressId} egress failed/aborted (status=${egress.status}), marking as FAILED`)
        await db.classRecording.update({
          where: { egressId },
          data: { status: 'FAILED' },
        })
        return
      }

      if (!isComplete) {
        console.log(`pollEgress: ${egressId} attempt ${attempt}/${maxAttempts}, status=${egress.status}`)
        continue
      }

      // Egress is complete - extract file info
      const fileResult = egress.fileResults?.[0] || (egress as unknown as { file?: { filename?: string } }).file
      const filename = fileResult?.filename

      if (!filename) {
        console.warn(`pollEgress: ${egressId} complete but no filename found`)
        await db.classRecording.update({
          where: { egressId },
          data: { status: 'FAILED' },
        })
        return
      }

      const match = filename.match(/(classes\/[^/]+\/[^/]+\.mp4)/)
      const r2Key = match ? match[1] : filename
      const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings'

      let duration: number | null = null
      let startedAt: Date | null = null
      let endedAt: Date | null = null

      if (egress.startedAt && egress.endedAt) {
        try {
          const startNs = typeof egress.startedAt === 'bigint' ? egress.startedAt : BigInt(String(egress.startedAt))
          const endNs = typeof egress.endedAt === 'bigint' ? egress.endedAt : BigInt(String(egress.endedAt))
          startedAt = new Date(Number(startNs / BigInt(1000000)))
          endedAt = new Date(Number(endNs / BigInt(1000000)))
          duration = Number((endNs - startNs) / BigInt(1000000000))
        } catch {
          // Ignore timestamp conversion errors in polling
        }
      }

      const updatedRecording = await db.classRecording.update({
        where: { egressId },
        data: {
          filename: filename.split('/').pop() || null,
          r2Key,
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
              enrollment: { select: { course: { select: { title: true } } } },
            },
          },
        },
      })

      console.log(`pollEgress: ${egressId} updated to READY via polling (attempt ${attempt})`)

      // Send notification
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
          },
        })
      } catch (notifError) {
        console.error('pollEgress: Error creating notification:', notifError)
      }

      return
    } catch (pollError) {
      console.error(`pollEgress: attempt ${attempt} error for ${egressId}:`, pollError)
    }
  }

  // Max attempts reached - mark as FAILED
  console.error(`pollEgress: ${egressId} timed out after ${maxAttempts} attempts`)
  try {
    await db.classRecording.updateMany({
      where: { egressId, status: 'PROCESSING' },
      data: { status: 'FAILED' },
    })
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Recover orphaned recordings stuck in PROCESSING status.
 * Checks LiveKit egress status and R2 for file existence.
 * Can be called from admin panel or a cron job.
 */
export async function recoverOrphanedRecordings() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    // Only admins can run this
    const isAdmin = (session.user as { roles?: string[] }).roles?.includes('ADMIN')
    if (!isAdmin) {
      return { success: false, error: 'Solo administradores pueden ejecutar esta acción' }
    }

    // Find recordings stuck in PROCESSING for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const orphanedRecordings = await db.classRecording.findMany({
      where: {
        status: 'PROCESSING',
        createdAt: { lt: tenMinutesAgo },
      },
      select: {
        id: true,
        egressId: true,
        bookingId: true,
        createdAt: true,
      },
      take: 50,
    })

    if (orphanedRecordings.length === 0) {
      return { success: true, message: 'No hay grabaciones huérfanas', recovered: 0, failed: 0 }
    }

    let recovered = 0
    let failed = 0
    const results: { id: string; status: string; detail: string }[] = []

    for (const rec of orphanedRecordings) {
      try {
        // Try 1: Check LiveKit egress status if we have egressId
        if (rec.egressId && livekitHost && apiKey && apiSecret) {
          const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)
          try {
            const egresses = await egressClient.listEgress({ egressId: rec.egressId })
            if (egresses.length > 0) {
              const egress = egresses[0]
              const fileResult = egress.fileResults?.[0] || (egress as unknown as { file?: { filename?: string } }).file
              const filename = fileResult?.filename

              if (filename) {
                const match = filename.match(/(classes\/[^/]+\/[^/]+\.mp4)/)
                const r2Key = match ? match[1] : filename

                await db.classRecording.update({
                  where: { id: rec.id },
                  data: {
                    filename: filename.split('/').pop() || null,
                    r2Key,
                    r2Bucket: r2BucketName,
                    status: 'READY',
                  },
                })
                recovered++
                results.push({ id: rec.id, status: 'READY', detail: `Recovered from LiveKit egress: ${r2Key}` })
                continue
              }
            }
          } catch (egressErr) {
            console.warn(`recoverOrphaned: LiveKit check failed for ${rec.egressId}:`, egressErr)
          }
        }

        // Try 2: Check R2 directly for files
        try {
          const { syncRecordingFromR2 } = await import('./recordings')
          const syncResult = await syncRecordingFromR2(rec.bookingId)
          if (syncResult.success) {
            recovered++
            results.push({ id: rec.id, status: 'READY', detail: 'Recovered from R2 sync' })
            continue
          }
        } catch (syncErr) {
          console.warn(`recoverOrphaned: R2 sync failed for booking ${rec.bookingId}:`, syncErr)
        }

        // If nothing worked and recording is very old (>1 hour), mark as FAILED
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        if (rec.createdAt < oneHourAgo) {
          await db.classRecording.update({
            where: { id: rec.id },
            data: { status: 'FAILED' },
          })
          failed++
          results.push({ id: rec.id, status: 'FAILED', detail: 'Timed out after 1 hour' })
        } else {
          results.push({ id: rec.id, status: 'PROCESSING', detail: 'Still within recovery window' })
        }
      } catch (recError) {
        console.error(`recoverOrphaned: Error processing ${rec.id}:`, recError)
        results.push({ id: rec.id, status: 'ERROR', detail: String(recError) })
      }
    }

    return {
      success: true,
      message: `Procesadas ${orphanedRecordings.length} grabaciones: ${recovered} recuperadas, ${failed} fallidas`,
      recovered,
      failed,
      total: orphanedRecordings.length,
      results,
    }
  } catch (error) {
    console.error('Error recovering orphaned recordings:', error)
    return { success: false, error: 'Error al recuperar grabaciones huérfanas' }
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
