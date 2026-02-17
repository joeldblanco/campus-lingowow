import { NextRequest, NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { db } from '@/lib/db'

const apiKey = process.env.LIVEKIT_API_KEY || ''
const apiSecret = process.env.LIVEKIT_API_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    if (!apiKey || !apiSecret) {
      console.error('[LiveKit Webhook] Missing API key or secret')
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 })
    }

    const body = await request.text()
    const authHeader = request.headers.get('Authorization') || ''

    const receiver = new WebhookReceiver(apiKey, apiSecret)
    let event

    try {
      event = await receiver.receive(body, authHeader)
    } catch (verifyError) {
      console.error('[LiveKit Webhook] Signature verification failed:', verifyError)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`[LiveKit Webhook] Received event: ${event.event}`, {
      egressId: event.egressInfo?.egressId,
      roomName: event.egressInfo?.roomName,
      status: event.egressInfo?.status,
    })

    // Process egress events - these are the recording lifecycle events
    if (event.event === 'egress_ended' && event.egressInfo) {
      await handleEgressEnded(event.egressInfo)
    } else if (event.event === 'egress_started' && event.egressInfo) {
      console.log(`[LiveKit Webhook] Egress started: ${event.egressInfo.egressId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[LiveKit Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

interface EgressFileResult {
  filename?: string
  startedAt?: bigint | number | string
  endedAt?: bigint | number | string
  duration?: bigint | number | string
  size?: bigint | number | string
  location?: string
}

interface EgressInfo {
  egressId: string
  roomName?: string
  roomId?: string
  status?: number
  startedAt?: bigint | number | string
  endedAt?: bigint | number | string
  error?: string
  fileResults?: EgressFileResult[]
  file?: EgressFileResult
  streamResults?: unknown[]
  segmentResults?: unknown[]
}

async function handleEgressEnded(egressInfo: EgressInfo) {
  const { egressId } = egressInfo

  if (!egressId) {
    console.error('[LiveKit Webhook] No egressId in egress_ended event')
    return
  }

  try {
    // Find the recording by egressId
    const recording = await db.classRecording.findUnique({
      where: { egressId },
      select: { id: true, bookingId: true, status: true },
    })

    if (!recording) {
      console.warn(`[LiveKit Webhook] No ClassRecording found for egressId: ${egressId}`)
      return
    }

    // Extract file info from the egress result
    // livekit-server-sdk v2 can return results in fileResults[] or file
    const fileResult = egressInfo.fileResults?.[0] || egressInfo.file
    const filename = fileResult?.filename

    // Extract r2Key from the filename path
    // Format: classes/{bookingId}/{roomName}-{time}.mp4
    let r2Key: string | null = null
    if (filename) {
      const match = filename.match(/(classes\/[^/]+\/[^/]+\.mp4)/)
      r2Key = match ? match[1] : filename
    }

    // Calculate duration from egress timestamps
    let duration: number | null = null
    let startedAt: Date | null = null
    let endedAt: Date | null = null

    const rawStartedAt = egressInfo.startedAt
    const rawEndedAt = egressInfo.endedAt

    if (rawStartedAt && rawEndedAt) {
      try {
        const startNs = typeof rawStartedAt === 'bigint' ? rawStartedAt : BigInt(String(rawStartedAt))
        const endNs = typeof rawEndedAt === 'bigint' ? rawEndedAt : BigInt(String(rawEndedAt))

        startedAt = new Date(Number(startNs / BigInt(1000000)))
        endedAt = new Date(Number(endNs / BigInt(1000000)))
        duration = Number((endNs - startNs) / BigInt(1000000000))
      } catch (e) {
        console.error('[LiveKit Webhook] Error converting timestamps:', e)
        const startMs = Number(rawStartedAt)
        const endMs = Number(rawEndedAt)
        if (!isNaN(startMs) && !isNaN(endMs)) {
          startedAt = new Date(startMs > 1e12 ? startMs : startMs * 1000)
          endedAt = new Date(endMs > 1e12 ? endMs : endMs * 1000)
          duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
        }
      }
    }

    // Check if egress ended with an error
    const isError = egressInfo.error && egressInfo.error.length > 0
    const newStatus = isError ? 'FAILED' : (r2Key ? 'READY' : 'FAILED')

    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings'

    // Update the recording with file info from the webhook
    const updatedRecording = await db.classRecording.update({
      where: { egressId },
      data: {
        roomName: egressInfo.roomName || null,
        filename: filename?.split('/').pop() || null,
        r2Key,
        r2Bucket: r2BucketName,
        duration,
        startedAt,
        endedAt,
        status: newStatus,
        metadata: {
          webhookProcessed: true,
          egressError: egressInfo.error || null,
          processedAt: new Date().toISOString(),
        },
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
                  select: { title: true },
                },
              },
            },
          },
        },
      },
    })

    console.log(`[LiveKit Webhook] Recording ${updatedRecording.id} updated to ${newStatus}`, {
      r2Key,
      duration,
      filename,
      error: egressInfo.error || null,
    })

    // Send notification to student when recording is ready
    if (newStatus === 'READY') {
      try {
        const { createNotification } = await import('@/lib/actions/notifications')
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
        console.log(`[LiveKit Webhook] Notification sent to student ${updatedRecording.booking.studentId}`)
      } catch (notifError) {
        console.error('[LiveKit Webhook] Error creating notification:', notifError)
      }
    }
  } catch (error) {
    console.error(`[LiveKit Webhook] Error handling egress_ended for ${egressId}:`, error)
  }
}
