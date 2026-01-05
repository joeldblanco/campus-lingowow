'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

// Cloudflare R2 Configuration
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || ''
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || ''
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lingowow-recordings'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
})

interface RecordingMetadata {
  egress_id: string
  room_id: string
  room_name: string
  started_at: number
  ended_at: number
  files: {
    filename: string
    location: string
  }[]
}

// POST: Sync a specific booking's recording from R2
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Only admins can sync recordings
    const isAdmin = session.user.roles?.includes('ADMIN')
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId es requerido' }, { status: 400 })
    }

    // Verify booking exists
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: { recording: true }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
    }

    // Search for files in R2 for this booking
    const prefix = `classes/${bookingId}/`
    
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      Prefix: prefix,
    })

    const listResponse = await s3Client.send(listCommand)
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron grabaciones en R2 para este booking',
        prefix 
      }, { status: 404 })
    }

    // Find video file (.mp4) and metadata file (.json)
    const videoFile = listResponse.Contents.find(obj => obj.Key?.endsWith('.mp4'))
    const metadataFile = listResponse.Contents.find(obj => obj.Key?.endsWith('.json'))

    if (!videoFile?.Key) {
      return NextResponse.json({ 
        error: 'No se encontró archivo de video',
        files: listResponse.Contents.map(f => f.Key)
      }, { status: 404 })
    }

    // Get metadata if JSON file exists
    let metadata: RecordingMetadata | null = null
    if (metadataFile?.Key) {
      try {
        const getMetadataCommand = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: metadataFile.Key,
        })
        const metadataResponse = await s3Client.send(getMetadataCommand)
        const metadataBody = await metadataResponse.Body?.transformToString()
        if (metadataBody) {
          metadata = JSON.parse(metadataBody)
        }
      } catch (error) {
        console.error('Error reading metadata file:', error)
      }
    }

    // Calculate duration from metadata
    let duration: number | null = null
    let startedAt: Date | null = null
    let endedAt: Date | null = null

    if (metadata) {
      // Timestamps come in nanoseconds
      startedAt = new Date(metadata.started_at / 1000000)
      endedAt = new Date(metadata.ended_at / 1000000)
      duration = Math.round((metadata.ended_at - metadata.started_at) / 1000000000)
    }

    // Create or update recording record
    const recordingData = {
      bookingId,
      egressId: metadata?.egress_id || null,
      roomId: metadata?.room_id || null,
      roomName: metadata?.room_name || null,
      filename: videoFile.Key.split('/').pop() || null,
      r2Key: videoFile.Key,
      r2Bucket: r2BucketName,
      fileSize: videoFile.Size || null,
      duration,
      startedAt,
      endedAt,
      status: 'READY' as const,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    }

    const recording = await db.classRecording.upsert({
      where: { bookingId },
      create: recordingData,
      update: recordingData,
    })

    return NextResponse.json({
      success: true,
      recording,
      message: 'Grabación sincronizada correctamente'
    })

  } catch (error) {
    console.error('Error syncing recording:', error)
    return NextResponse.json({ error: 'Error al sincronizar grabación' }, { status: 500 })
  }
}

// GET: List all bookings with recordings in R2 but no DB record
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const isAdmin = session.user.roles?.includes('ADMIN')
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // List all folders in R2 under classes/
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      Prefix: 'classes/',
      Delimiter: '/',
    })

    const listResponse = await s3Client.send(listCommand)
    
    // Extract booking IDs from folder names
    const r2BookingIds = (listResponse.CommonPrefixes || [])
      .map(prefix => prefix.Prefix?.replace('classes/', '').replace('/', ''))
      .filter((id): id is string => !!id)

    // Get existing recordings from DB
    const existingRecordings = await db.classRecording.findMany({
      where: {
        bookingId: { in: r2BookingIds }
      },
      select: { bookingId: true }
    })

    const existingBookingIds = new Set(existingRecordings.map(r => r.bookingId))

    // Find bookings that have R2 files but no DB record
    const missingRecordings = r2BookingIds.filter(id => !existingBookingIds.has(id))

    // Get booking details for missing recordings
    const bookings = await db.classBooking.findMany({
      where: {
        id: { in: missingRecordings }
      },
      include: {
        student: { select: { name: true, lastName: true } },
        teacher: { select: { name: true, lastName: true } },
        enrollment: {
          include: {
            course: { select: { title: true } }
          }
        }
      },
      orderBy: { day: 'desc' }
    })

    return NextResponse.json({
      success: true,
      totalInR2: r2BookingIds.length,
      totalInDB: existingRecordings.length,
      missingCount: missingRecordings.length,
      missingBookings: bookings.map(b => ({
        id: b.id,
        day: b.day,
        timeSlot: b.timeSlot,
        student: `${b.student.name} ${b.student.lastName || ''}`.trim(),
        teacher: `${b.teacher.name} ${b.teacher.lastName || ''}`.trim(),
        course: b.enrollment.course.title,
        status: b.status
      }))
    })

  } catch (error) {
    console.error('Error listing missing recordings:', error)
    return NextResponse.json({ error: 'Error al listar grabaciones' }, { status: 500 })
  }
}
