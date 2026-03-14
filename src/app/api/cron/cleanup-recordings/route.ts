import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

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

const RETENTION_DAYS = 30

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const action = req.nextUrl.searchParams.get('action') || 'cleanup'

    if (action === 'audit') {
      return auditBucket()
    }

    if (action === 'cleanup-orphans') {
      return cleanupOrphanDbRecords()
    }

    // Default: full cleanup
    return runFullCleanup()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[cleanup-recordings] Cron job error:', error)
    return NextResponse.json({ error: 'Cleanup failed', detail: errorMessage }, { status: 500 })
  }
}

async function runFullCleanup() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

  console.log(`[cleanup-recordings] Deleting recordings older than ${cutoffDate.toISOString()}`)

  // 1. Find DB recordings older than RETENTION_DAYS
  const oldRecordings = await db.classRecording.findMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      r2Key: true,
      bookingId: true,
      createdAt: true,
    },
  })

  // 2. Delete R2 files for those with r2Key
  const r2Keys = oldRecordings
    .map(r => r.r2Key)
    .filter((key): key is string => key !== null)

  const allKeys = [...r2Keys]
  for (const key of r2Keys) {
    if (key.endsWith('.mp4')) {
      allKeys.push(key.replace('.mp4', '.json'))
    }
  }

  let r2Deleted = 0
  for (let i = 0; i < allKeys.length; i += 1000) {
    const batch = allKeys.slice(i, i + 1000)
    try {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: r2BucketName,
        Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
      }))
      r2Deleted += batch.length
    } catch (err) {
      console.error(`[cleanup-recordings] Error deleting R2 batch at ${i}:`, err)
    }
  }

  // 3. Scan R2 for orphaned files older than retention
  let orphanedDeleted = 0
  for (const prefix of ['classes/', 'test-recordings/']) {
    let continuationToken: string | undefined
    do {
      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: r2BucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }))
      continuationToken = listResponse.NextContinuationToken

      if (listResponse.Contents) {
        const oldKeys = listResponse.Contents
          .filter(obj => obj.LastModified && obj.LastModified < cutoffDate)
          .map(obj => obj.Key)
          .filter((key): key is string => key !== null)

        for (let i = 0; i < oldKeys.length; i += 1000) {
          const batch = oldKeys.slice(i, i + 1000)
          try {
            await s3Client.send(new DeleteObjectsCommand({
              Bucket: r2BucketName,
              Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
            }))
            orphanedDeleted += batch.length
          } catch (err) {
            console.error(`[cleanup-recordings] Error deleting orphaned batch (${prefix}):`, err)
          }
        }
      }
    } while (continuationToken)
  }

  // 4. DELETE DB records entirely
  const recordingIds = oldRecordings.map(r => r.id)
  let dbDeleted = 0
  if (recordingIds.length > 0) {
    const result = await db.classRecording.deleteMany({
      where: { id: { in: recordingIds } },
    })
    dbDeleted = result.count
  }

  const summary = {
    dbRecordsDeleted: dbDeleted,
    r2FilesDeleted: r2Deleted,
    orphanedR2FilesDeleted: orphanedDeleted,
    cutoffDate: cutoffDate.toISOString(),
  }

  console.log('[cleanup-recordings] Cleanup complete:', summary)
  return NextResponse.json(summary)
}

async function cleanupOrphanDbRecords() {
  // Find all DB recordings with status READY that have an r2Key
  const recordings = await db.classRecording.findMany({
    where: {
      status: 'READY',
      r2Key: { not: null },
    },
    select: {
      id: true,
      r2Key: true,
      createdAt: true,
    },
  })

  console.log(`[cleanup-orphans] Checking ${recordings.length} READY recordings for missing R2 files`)

  // Check which r2Keys actually exist in R2
  // Build a set of all existing keys in the bucket
  const existingKeys = new Set<string>()
  let continuationToken: string | undefined
  do {
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: r2BucketName,
      ContinuationToken: continuationToken,
    }))
    continuationToken = listResponse.NextContinuationToken
    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) existingKeys.add(obj.Key)
      }
    }
  } while (continuationToken)

  console.log(`[cleanup-orphans] Found ${existingKeys.size} files in R2`)

  // Find recordings whose r2Key doesn't exist in R2
  const orphanIds = recordings
    .filter(r => r.r2Key && !existingKeys.has(r.r2Key))
    .map(r => r.id)

  let dbDeleted = 0
  if (orphanIds.length > 0) {
    const result = await db.classRecording.deleteMany({
      where: { id: { in: orphanIds } },
    })
    dbDeleted = result.count
  }

  const summary = {
    totalChecked: recordings.length,
    existingR2Files: existingKeys.size,
    orphanDbRecordsDeleted: dbDeleted,
  }

  console.log('[cleanup-orphans] Complete:', summary)
  return NextResponse.json(summary)
}

async function auditBucket() {
  const prefixes: Record<string, { count: number; sizeBytes: number; oldest: string | null; newest: string | null }> = {}
  let totalFiles = 0
  let totalSize = 0
  let continuationToken: string | undefined

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      ContinuationToken: continuationToken,
    })
    const response = await s3Client.send(listCommand)
    continuationToken = response.NextContinuationToken

    if (response.Contents) {
      for (const obj of response.Contents) {
        const key = obj.Key || ''
        const prefix = key.split('/')[0] || '(root)'
        const size = obj.Size || 0
        const modified = obj.LastModified?.toISOString() || null

        if (!prefixes[prefix]) {
          prefixes[prefix] = { count: 0, sizeBytes: 0, oldest: null, newest: null }
        }
        prefixes[prefix].count++
        prefixes[prefix].sizeBytes += size
        if (modified && (!prefixes[prefix].oldest || modified < prefixes[prefix].oldest!)) {
          prefixes[prefix].oldest = modified
        }
        if (modified && (!prefixes[prefix].newest || modified > prefixes[prefix].newest!)) {
          prefixes[prefix].newest = modified
        }

        totalFiles++
        totalSize += size
      }
    }
  } while (continuationToken)

  const summary = Object.entries(prefixes).map(([prefix, data]) => ({
    prefix,
    files: data.count,
    sizeMB: Math.round(data.sizeBytes / 1024 / 1024 * 100) / 100,
    oldest: data.oldest,
    newest: data.newest,
  })).sort((a, b) => b.sizeMB - a.sizeMB)

  return NextResponse.json({
    totalFiles,
    totalSizeGB: Math.round(totalSize / 1024 / 1024 / 1024 * 100) / 100,
    prefixes: summary,
  })
}
