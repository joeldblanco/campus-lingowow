'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { S3Client, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
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
  segmentNumber: number
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

// Obtener grabaciones del estudiante actual o todas si es admin
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

    const isAdmin = session.user.roles?.includes('ADMIN')

    // Construir filtros para booking
    const bookingFilter: Record<string, unknown> = {
      status: 'COMPLETED',
    }

    // Solo filtrar por studentId si NO es admin
    if (!isAdmin) {
      bookingFilter.studentId = session.user.id
    }

    if (options?.courseId) {
      bookingFilter.enrollment = {
        courseId: options.courseId,
      }
    }

    if (options?.dateFrom || options?.dateTo) {
      bookingFilter.day = {
        ...(options?.dateFrom && { gte: options.dateFrom }),
        ...(options?.dateTo && { lte: options.dateTo }),
      }
    }

    const where: Record<string, unknown> = {
      booking: bookingFilter,
      status: options?.status || 'READY',
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
        signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 21600 }) // 6 horas
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
        recordings: true,
      },
    })

    if (!booking) {
      return { success: false, error: 'Clase no encontrada' }
    }

    const isStudent = booking.studentId === session.user.id
    const isTeacher = booking.teacherId === session.user.id
    const isAdmin = session.user.roles?.includes('ADMIN')

    if (!isStudent && !isTeacher && !isAdmin) {
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

    // Buscar si ya existe una grabación con este egressId
    const existingRecording = metadata?.egress_id 
      ? await db.classRecording.findUnique({ where: { egressId: metadata.egress_id } })
      : null

    let recording
    if (existingRecording) {
      // Actualizar grabación existente
      recording = await db.classRecording.update({
        where: { id: existingRecording.id },
        data: recordingData,
      })
    } else {
      // Crear nueva grabación con número de segmento
      const lastRecording = await db.classRecording.findFirst({
        where: { bookingId },
        orderBy: { segmentNumber: 'desc' },
        select: { segmentNumber: true },
      })
      const segmentNumber = (lastRecording?.segmentNumber || 0) + 1

      recording = await db.classRecording.create({
        data: {
          ...recordingData,
          segmentNumber,
        },
      })
    }

    return {
      success: true,
      data: recording,
    }
  } catch (error) {
    console.error('Error syncing recording from R2:', error)
    return { success: false, error: 'Error al sincronizar grabación' }
  }
}

// Obtener cursos del estudiante para filtros (o todos si es admin)
export async function getStudentCoursesForFilter() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' }
    }

    const isAdmin = session.user.roles?.includes('ADMIN')

    let courses

    if (isAdmin) {
      // Admin: obtener todos los cursos que tienen grabaciones
      const coursesWithRecordings = await db.course.findMany({
        where: {
          enrollments: {
            some: {
              bookings: {
                some: {
                  recordings: {
                    some: {},
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          language: true,
          level: true,
        },
        distinct: ['id'],
      })
      courses = coursesWithRecordings
    } else {
      // Estudiante: solo sus cursos
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
      courses = enrollments.map(e => e.course)
    }

    return {
      success: true,
      data: courses,
    }
  } catch (error) {
    console.error('Error fetching student courses:', error)
    return { success: false, error: 'Error al obtener cursos' }
  }
}

// Verificar si el usuario actual es administrador
export async function isUserAdmin() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, isAdmin: false }
    }

    const isAdmin = session.user.roles?.includes('ADMIN') || false

    return { success: true, isAdmin }
  } catch (error) {
    console.error('Error checking user role:', error)
    return { success: false, isAdmin: false }
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

// Eliminar carpeta de grabaciones de R2 para una clase específica
export async function deleteRecordingFolder(classId: string) {
  try {
    const prefix = `classes/${classId}/`
    
    // Listar todos los objetos en la carpeta
    const listCommand = new ListObjectsV2Command({
      Bucket: r2BucketName,
      Prefix: prefix,
    })

    const listResponse = await s3Client.send(listCommand)
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      // No hay archivos que eliminar
      return { success: true, message: 'No hay grabaciones para eliminar' }
    }

    // Preparar lista de objetos a eliminar
    const objectsToDelete = listResponse.Contents
      .filter(obj => obj.Key)
      .map(obj => ({ Key: obj.Key! }))

    if (objectsToDelete.length === 0) {
      return { success: true, message: 'No hay grabaciones para eliminar' }
    }

    // Eliminar todos los objetos
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: r2BucketName,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    })

    const deleteResponse = await s3Client.send(deleteCommand)

    console.log(`Deleted ${deleteResponse.Deleted?.length || 0} recording files for class ${classId}`)

    return { 
      success: true, 
      deletedCount: deleteResponse.Deleted?.length || 0,
      message: `Se eliminaron ${deleteResponse.Deleted?.length || 0} archivos de grabación`
    }
  } catch (error) {
    console.error('Error deleting recording folder from R2:', error)
    return { success: false, error: 'Error al eliminar grabaciones de R2' }
  }
}
