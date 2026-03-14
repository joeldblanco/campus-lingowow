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

    // Audit mode: list all prefixes and their sizes
    if (req.nextUrl.searchParams.get('audit') === 'true') {
      return auditBucket()
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

    console.log(`[cleanup-recordings] Deleting recordings older than ${cutoffDate.toISOString()}`)

    // 1. Find DB recordings older than RETENTION_DAYS with an r2Key
    const oldRecordings = await db.classRecording.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        r2Key: { not: null },
      },
      select: {
        id: true,
        r2Key: true,
        bookingId: true,
        createdAt: true,
      },
    })

    if (oldRecordings.length === 0) {
      console.log('[cleanup-recordings] No old recordings found')
      return NextResponse.json({ deleted: 0, message: 'No recordings to clean up' })
    }

    console.log(`[cleanup-recordings] Found ${oldRecordings.length} recordings to delete`)

    // 2. Delete objects from R2 in batches of 1000 (S3 limit)
    const r2Keys = oldRecordings
      .map(r => r.r2Key)
      .filter((key): key is string => key !== null)

    // Also collect associated .json metadata keys
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
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: r2BucketName,
          Delete: {
            Objects: batch.map(Key => ({ Key })),
            Quiet: true,
          },
        })
        await s3Client.send(deleteCommand)
        r2Deleted += batch.length
      } catch (err) {
        console.error(`[cleanup-recordings] Error deleting R2 batch starting at ${i}:`, err)
      }
    }

    // 3. Also scan R2 for orphaned files older than retention (no DB record)
    let orphanedDeleted = 0
    let continuationToken: string | undefined
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: r2BucketName,
        Prefix: 'classes/',
        ContinuationToken: continuationToken,
      })
      const listResponse = await s3Client.send(listCommand)
      continuationToken = listResponse.NextContinuationToken

      if (listResponse.Contents) {
        const orphanKeys = listResponse.Contents
          .filter(obj => obj.LastModified && obj.LastModified < cutoffDate)
          .map(obj => obj.Key)
          .filter((key): key is string => key !== null)

        if (orphanKeys.length > 0) {
          for (let i = 0; i < orphanKeys.length; i += 1000) {
            const batch = orphanKeys.slice(i, i + 1000)
            try {
              const deleteCommand = new DeleteObjectsCommand({
                Bucket: r2BucketName,
                Delete: {
                  Objects: batch.map(Key => ({ Key })),
                  Quiet: true,
                },
              })
              await s3Client.send(deleteCommand)
              orphanedDeleted += batch.length
            } catch (err) {
              console.error(`[cleanup-recordings] Error deleting orphaned batch:`, err)
            }
          }
        }
      }
    } while (continuationToken)

    // 4. Also clean test-recordings/ folder
    let testDeleted = 0
    let testToken: string | undefined
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: r2BucketName,
        Prefix: 'test-recordings/',
        ContinuationToken: testToken,
      })
      const listResponse = await s3Client.send(listCommand)
      testToken = listResponse.NextContinuationToken

      if (listResponse.Contents) {
        const oldTestKeys = listResponse.Contents
          .filter(obj => obj.LastModified && obj.LastModified < cutoffDate)
          .map(obj => obj.Key)
          .filter((key): key is string => key !== null)

        if (oldTestKeys.length > 0) {
          for (let i = 0; i < oldTestKeys.length; i += 1000) {
            const batch = oldTestKeys.slice(i, i + 1000)
            try {
              const deleteCommand = new DeleteObjectsCommand({
                Bucket: r2BucketName,
                Delete: {
                  Objects: batch.map(Key => ({ Key })),
                  Quiet: true,
                },
              })
              await s3Client.send(deleteCommand)
              testDeleted += batch.length
            } catch (err) {
              console.error(`[cleanup-recordings] Error deleting test recordings batch:`, err)
            }
          }
        }
      }
    } while (testToken)

    // 5. Update DB records — mark as EXPIRED
    const recordingIds = oldRecordings.map(r => r.id)
    await db.classRecording.updateMany({
      where: { id: { in: recordingIds } },
      data: {
        status: 'DELETED',
        r2Key: null,
      },
    })

    const summary = {
      dbRecordsExpired: oldRecordings.length,
      r2FilesDeleted: r2Deleted,
      orphanedFilesDeleted: orphanedDeleted,
      testFilesDeleted: testDeleted,
      cutoffDate: cutoffDate.toISOString(),
    }

    console.log('[cleanup-recordings] Cleanup complete:', summary)

    return NextResponse.json(summary)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[cleanup-recordings] Cron job error:', error)
    return NextResponse.json({ error: 'Cleanup failed', detail: errorMessage }, { status: 500 })
  }
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
