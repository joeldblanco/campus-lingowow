'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 Configuration (S3-compatible)
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

// Tipos para las grabaciones
export interface RecordingMetadata {
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

export interface RecordingWithDetails {
  id: string
  bookingId: string
  status: string
  duration: number | null
  startedAt: Date | null
  endedAt: Date | null
  fileUrl: string | null
  booking: {
    id: string
    day: string
    timeSlot: string
    student: {
      id: string
      name: string
      lastName: string | null
      image: string | null
    }
    teacher: {
      id: string
      name: string
      lastName: string | null
      image: string | null
    }
    enrollment: {
      course: {
        id: string
        title: string
        language: string
        level: string
      }
    }
  }
}

// Obtener grabaciones del estudiante actual
export async function getStudentRecordings(options?: {
  page?: number
  limit?: number
  courseId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const page = options?.page || 1
    const limit = options?.limit || 12
    const skip = (page - 1) * limit

    // Construir filtros
    const where: Record<string, unknown> = {
      booking: {
        studentId: session.user.id,
        status: 'COMPLETED',
      },
      status: options?.status || 'READY',
    }

    if (options?.courseId) {
      where.booking = {
        ...where.booking as Record<string, unknown>,
        enrollment: {
          courseId: options.courseId,
        },
      }
    }

    if (options?.dateFrom || options?.dateTo) {
      where.booking = {
        ...where.booking as Record<string, unknown>,
        day: {
          ...(options?.dateFrom && { gte: options.dateFrom }),
          ...(options?.dateTo && { lte: options.dateTo }),
        },
      }
    }

    const [recordings, total] = await Promise.all([
      db.classRecording.findMany({
        where,
        include: {
          booking: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  image: true,
                },
              },
              teacher: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  image: true,
                },
              },
              enrollment: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      language: true,
                      level: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      db.classRecording.count({ where }),
    ])

    return {
      success: true,
      data: recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching student recordings:', error)
    return { success: false, error: 'Error al obtener grabaciones' }
  }
}

// Obtener una grabación específica con URL firmada
export async function getRecordingById(recordingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const recording = await db.classRecording.findUnique({
      where: { id: recordingId },
      include: {
        booking: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
              },
            },
            enrollment: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    language: true,
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!recording) {
      return { success: false, error: 'Grabación no encontrada' }
    }

    // Verificar acceso: el usuario debe ser el estudiante o el profesor de la clase
    const isStudent = recording.booking.studentId === session.user.id
    const isTeacher = recording.booking.teacherId === session.user.id
    const isAdmin = session.user.roles?.includes('ADMIN')

    if (!isStudent && !isTeacher && !isAdmin) {
      return { success: false, error: 'No tienes acceso a esta grabación' }
    }

    // Generar URL firmada si hay un archivo en R2
    let signedUrl = recording.fileUrl
    if (recording.r2Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: r2BucketName,
          Key: recording.r2Key,
        })
        signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hora
      } catch (error) {
        console.error('Error generating signed URL:', error)
      }
    }

    return {
      success: true,
      data: {
        ...recording,
        signedUrl,
      },
    }
  } catch (error) {
    console.error('Error fetching recording:', error)
    return { success: false, error: 'Error al obtener grabación' }
  }
}

// Sincronizar grabaciones desde R2 (para un booking específico)
export async function syncRecordingFromR2(bookingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    // Verificar que el booking existe y el usuario tiene acceso
    const booking = await db.classBooking.findUnique({
      where: { id: bookingId },
      include: {
        recording: true,
      },
    })

    if (!booking) {
      return { success: false, error: 'Clase no encontrada' }
    }

    const isTeacher = booking.teacherId === session.user.id
    const isAdmin = session.user.roles?.includes('ADMIN')

    if (!isTeacher && !isAdmin) {
      return { success: false, error: 'No tienes permiso para sincronizar esta grabación' }
    }

    // Buscar archivos en R2 para este booking
    const prefix = `classes/${bookingId}/`
    
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      Prefix: prefix,
    })

    const listResponse = await s3Client.send(listCommand)
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return { success: false, error: 'No se encontraron grabaciones para esta clase' }
    }

    // Buscar el archivo de video (.mp4) y el archivo de metadatos (.json)
    const videoFile = listResponse.Contents.find(obj => obj.Key?.endsWith('.mp4'))
    const metadataFile = listResponse.Contents.find(obj => obj.Key?.endsWith('.json'))

    if (!videoFile?.Key) {
      return { success: false, error: 'No se encontró archivo de video' }
    }

    // Obtener metadatos si existe el archivo JSON
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

    // Calcular duración desde metadatos
    let duration: number | null = null
    let startedAt: Date | null = null
    let endedAt: Date | null = null

    if (metadata) {
      // Los timestamps vienen en nanosegundos
      startedAt = new Date(metadata.started_at / 1000000)
      endedAt = new Date(metadata.ended_at / 1000000)
      duration = Math.round((metadata.ended_at - metadata.started_at) / 1000000000) // segundos
    }

    // Crear o actualizar el registro de grabación
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

    return {
      success: true,
      data: recording,
    }
  } catch (error) {
    console.error('Error syncing recording from R2:', error)
    return { success: false, error: 'Error al sincronizar grabación' }
  }
}

// Obtener cursos del estudiante para filtros
export async function getStudentCoursesForFilter() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
            level: true,
          },
        },
      },
      distinct: ['courseId'],
    })

    const courses = enrollments.map(e => e.course)

    return {
      success: true,
      data: courses,
    }
  } catch (error) {
    console.error('Error fetching student courses:', error)
    return { success: false, error: 'Error al obtener cursos' }
  }
}

// Marcar grabación como vista (para tracking)
export async function markRecordingAsViewed(recordingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    // Por ahora solo registramos en logs, podríamos crear una tabla de vistas
    console.log(`Recording ${recordingId} viewed by user ${session.user.id}`)

    return { success: true }
  } catch (error) {
    console.error('Error marking recording as viewed:', error)
    return { success: false, error: 'Error al registrar vista' }
  }
}
