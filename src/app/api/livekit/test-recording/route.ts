'use server'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AccessToken, EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk'

const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('wss://', 'https://') || ''
const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
const apiKey = process.env.LIVEKIT_API_KEY || ''
const apiSecret = process.env.LIVEKIT_API_SECRET || ''
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || ''
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings'

async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const roles = (session.user as { roles?: string[] }).roles || []
  if (!roles.includes('ADMIN')) return null
  return session.user
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'create-room': {
        const roomName = `test-rec-${Date.now()}`

        const at = new AccessToken(apiKey, apiSecret, {
          identity: user.id,
          name: (user as { name?: string }).name || 'Test Admin',
          metadata: JSON.stringify({ isModerator: true }),
        })
        at.addGrant({
          roomJoin: true,
          room: roomName,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
          roomAdmin: true,
          roomCreate: true,
        })
        const token = await at.toJwt()

        return NextResponse.json({
          success: true,
          roomName,
          token,
          wsUrl,
        })
      }

      case 'start-recording': {
        const { roomName } = body
        if (!roomName) {
          return NextResponse.json({ error: 'roomName requerido' }, { status: 400 })
        }

        const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)

        let output: EncodedFileOutput
        if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
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
            filepath: `test-recordings/${roomName}-{time}.mp4`,
            output: { case: 's3', value: s3Upload },
          })
        } else {
          output = new EncodedFileOutput({
            fileType: EncodedFileType.MP4,
            filepath: `test-recordings/${roomName}-{time}.mp4`,
          })
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lingowow.com'
        const templateUrl = `${appUrl}/api/livekit/egress-recorder`

        const info = await egressClient.startRoomCompositeEgress(
          roomName,
          { file: output },
          {
            layout: 'grid',
            customBaseUrl: templateUrl,
            videoOnly: false,
          }
        )

        return NextResponse.json({
          success: true,
          egressId: info.egressId,
          status: info.status,
        })
      }

      case 'stop-recording': {
        const { egressId } = body
        if (!egressId) {
          return NextResponse.json({ error: 'egressId requerido' }, { status: 400 })
        }

        const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)
        const info = await egressClient.stopEgress(egressId)

        return NextResponse.json({
          success: true,
          status: info.status,
          error: (info as unknown as { error?: string }).error || '',
          fileResults: info.fileResults,
        })
      }

      case 'check-status': {
        const { egressId } = body
        if (!egressId) {
          return NextResponse.json({ error: 'egressId requerido' }, { status: 400 })
        }

        const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)
        const egresses = await egressClient.listEgress({ egressId })

        if (egresses.length === 0) {
          return NextResponse.json({ error: 'Egress no encontrado' }, { status: 404 })
        }

        const egress = egresses[0]
        return NextResponse.json({
          success: true,
          egressId: egress.egressId,
          status: egress.status,
          error: (egress as unknown as { error?: string }).error || '',
          startedAt: egress.startedAt?.toString(),
          endedAt: egress.endedAt?.toString(),
          fileResults: egress.fileResults,
        })
      }

      case 'list-egresses': {
        const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)
        const egresses = await egressClient.listEgress({})

        return NextResponse.json({
          success: true,
          egresses: egresses.map(e => ({
            egressId: e.egressId,
            roomName: e.roomName,
            status: e.status,
            error: (e as unknown as { error?: string }).error || '',
            startedAt: e.startedAt?.toString(),
            endedAt: e.endedAt?.toString(),
          })),
        })
      }

      case 'check-egress-logs': {
        const egressClient = new EgressClient(livekitHost, apiKey, apiSecret)
        const egresses = await egressClient.listEgress({})

        const recent = egresses
          .sort((a, b) => {
            const aTime = Number(a.startedAt || 0)
            const bTime = Number(b.startedAt || 0)
            return bTime - aTime
          })
          .slice(0, 10)

        return NextResponse.json({
          success: true,
          total: egresses.length,
          recent: recent.map(e => ({
            egressId: e.egressId,
            roomName: e.roomName,
            status: e.status,
            error: (e as unknown as { error?: string }).error || '',
            startedAt: e.startedAt?.toString(),
            endedAt: e.endedAt?.toString(),
            fileResults: e.fileResults?.map(f => ({
              filename: f.filename,
              size: f.size?.toString(),
            })),
          })),
        })
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Test recording error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 })
  }
}
