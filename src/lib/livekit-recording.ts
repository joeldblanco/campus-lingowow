import { db } from '@/lib/db'
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk'

function readConfig() {
  return {
    livekitHost: process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('wss://', 'https://') || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    r2AccountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || '',
    r2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    r2BucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.lingowow.com',
  }
}

export type StartRoomRecordingResult =
  | { success: true; egressId: string; segmentNumber: number; alreadyRecording: boolean }
  | { success: false; error: string }

/**
 * Internal helper: starts an egress for a room. NO auth check — must only be called
 * from trusted code paths (webhook receiver after signature verification, or a
 * server action that already authorized the caller).
 *
 * `roomName` is expected to follow the `class-<bookingId>` convention; the bookingId
 * is derived from it.
 */
export async function startRoomRecording(roomName: string): Promise<StartRoomRecordingResult> {
  if (!roomName.startsWith('class-')) {
    return { success: false, error: `roomName "${roomName}" no es una sala de clase` }
  }

  const bookingId = roomName.slice('class-'.length)
  if (!bookingId) {
    return { success: false, error: 'roomName sin bookingId' }
  }

  const cfg = readConfig()
  if (!cfg.livekitHost || !cfg.apiKey || !cfg.apiSecret) {
    return { success: false, error: 'Configuración de LiveKit incompleta' }
  }

  const existingRecording = await db.classRecording.findFirst({
    where: { bookingId, status: 'PROCESSING' },
    select: { egressId: true },
  })

  if (existingRecording?.egressId) {
    return {
      success: true,
      egressId: existingRecording.egressId,
      segmentNumber: 0,
      alreadyRecording: true,
    }
  }

  const egressClient = new EgressClient(cfg.livekitHost, cfg.apiKey, cfg.apiSecret)

  let output: EncodedFileOutput

  if (cfg.r2AccountId && cfg.r2AccessKeyId && cfg.r2SecretAccessKey) {
    const s3Upload = new S3Upload({
      accessKey: cfg.r2AccessKeyId,
      secret: cfg.r2SecretAccessKey,
      bucket: cfg.r2BucketName,
      region: 'auto',
      endpoint: `https://${cfg.r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
    })

    output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `classes/${bookingId}/${roomName}-{time}.mp4`,
      output: { case: 's3', value: s3Upload },
    })
  } else {
    output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${bookingId}/{room_name}-{time}.mp4`,
    })
  }

  const templateUrl = `${cfg.appUrl}/api/livekit/egress-recorder`

  const info = await egressClient.startRoomCompositeEgress(
    roomName,
    { file: output },
    {
      layout: 'grid',
      customBaseUrl: templateUrl,
      videoOnly: false,
    }
  )

  await db.videoCall.updateMany({
    where: { bookingId },
    data: { recordingUrl: info.egressId },
  })

  const lastRecording = await db.classRecording.findFirst({
    where: { bookingId },
    orderBy: { segmentNumber: 'desc' },
    select: { segmentNumber: true },
  })
  const segmentNumber = (lastRecording?.segmentNumber || 0) + 1

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
    segmentNumber,
    alreadyRecording: false,
  }
}
