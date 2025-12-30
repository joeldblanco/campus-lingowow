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
        teacherId: session.user.id
      }
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

    const info = await egressClient.startRoomCompositeEgress(roomName, { file: output })

    // Store egress ID in video call record
    await db.videoCall.updateMany({
      where: { bookingId },
      data: { recordingUrl: info.egressId }
    })

    return { 
      success: true, 
      egressId: info.egressId,
      message: 'Grabación iniciada'
    }
  } catch (error) {
    console.error('Error starting recording:', error)
    return { success: false, error: 'Error al iniciar grabación' }
  }
}

export async function stopRecording(egressId: string) {
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

    return { 
      success: true, 
      message: 'Grabación detenida',
      fileUrl: info.fileResults?.[0]?.filename
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
      endedAt: egress.endedAt
    }
  } catch (error) {
    console.error('Error getting recording status:', error)
    return { success: false, error: 'Error al obtener estado de grabación' }
  }
}
