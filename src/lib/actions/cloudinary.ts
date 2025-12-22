'use server'

import CloudinaryService, { CloudinaryUploadResult } from '@/lib/cloudinary'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { FileCategory, FileResourceType, Prisma } from '@prisma/client'

export interface FileUploadResult {
  success: boolean
  data?: CloudinaryUploadResult
  error?: string
}

export async function uploadImageFile(
  formData: FormData,
  folder: string = 'images'
): Promise<FileUploadResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Get current user
    const session = await auth()
    const userId = session?.user?.id as string

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadImage(base64, `campus-lingowow/${folder}`)

    // Save metadata to database
    if (userId) {
      try {
        await db.fileAsset.create({
          data: {
            publicId: result.public_id,
            fileName: file.name,
            description: null,
            tags: [],
            category: determineCategory(folder),
            resourceType: FileResourceType.IMAGE,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            duration: null,
            secureUrl: result.secure_url,
            url: result.url,
            folder: `campus-lingowow/${folder}`,
            uploadedBy: userId,
            isPublic: true,
            isActive: true,
          },
        })
      } catch (dbError) {
        console.error('Failed to save file metadata to database:', dbError)
        // Don't fail the upload if database save fails
      }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Image upload error:', error)
    return { success: false, error: 'Failed to upload image' }
  }
}

function determineCategory(folder: string): FileCategory {
  if (folder.includes('product')) return FileCategory.GENERAL
  if (folder.includes('course')) return FileCategory.COURSE_CONTENT
  if (folder.includes('lesson')) return FileCategory.LESSON_MATERIAL
  if (folder.includes('exam') || folder.includes('assignment')) return FileCategory.ASSIGNMENT
  if (folder.includes('avatar') || folder.includes('profile')) return FileCategory.USER_AVATAR
  if (folder.includes('brand') || folder.includes('logo')) return FileCategory.BRANDING
  return FileCategory.GENERAL
}

export async function uploadVideoFile(
  formData: FormData,
  folder: string = 'videos'
): Promise<FileUploadResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadVideo(base64, `campus-lingowow/${folder}`)

    return { success: true, data: result }
  } catch (error) {
    console.error('Video upload error:', error)
    return { success: false, error: 'Failed to upload video' }
  }
}

export async function uploadAudioFile(
  formData: FormData,
  folder: string = 'audio'
): Promise<FileUploadResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Get current user
    const session = await auth()
    const userId = session?.user?.id as string

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadAudio(base64, `campus-lingowow/${folder}`)

    // Save metadata to database
    if (userId) {
      try {
        await db.fileAsset.create({
          data: {
            publicId: result.public_id,
            fileName: file.name,
            description: null,
            tags: [],
            category: determineCategory(folder),
            resourceType: FileResourceType.AUDIO,
            format: result.format,
            size: result.bytes,
            width: null,
            height: null,
            duration: null,
            secureUrl: result.secure_url,
            url: result.url,
            folder: `campus-lingowow/${folder}`,
            uploadedBy: userId,
            isPublic: true,
            isActive: true,
          },
        })
      } catch (dbError) {
        console.error('Failed to save file metadata to database:', dbError)
        // Don't fail the upload if database save fails
      }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Audio upload error:', error)
    return { success: false, error: 'Failed to upload audio' }
  }
}

export async function uploadDocumentFile(
  formData: FormData,
  folder: string = 'documents'
): Promise<FileUploadResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadDocument(base64, `campus-lingowow/${folder}`)

    return { success: true, data: result }
  } catch (error) {
    console.error('Document upload error:', error)
    return { success: false, error: 'Failed to upload document' }
  }
}

export async function deleteCloudinaryFile(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete from Cloudinary
    const success = await CloudinaryService.deleteFile(publicId)

    if (success) {
      // 2. Delete from Database
      try {
        await db.fileAsset.delete({
          where: { publicId },
        })
        return { success: true }
      } catch (dbError) {
        console.error('Failed to delete file from database:', dbError)
        // We still return success as the physical file is gone, but we might want to flag this
        return { success: true, error: 'File deleted but metadata cleanup failed' }
      }
    } else {
      return { success: false, error: 'Failed to delete file from Cloudinary' }
    }
  } catch (error) {
    console.error('File deletion error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

export type GetFileAssetsParams = {
  page?: number
  limit?: number
  search?: string
  resourceType?: FileResourceType
  category?: FileCategory
  folder?: string
}

export async function getFileAssets({
  page = 1,
  limit = 20,
  search,
  resourceType,
  category,
  folder,
}: GetFileAssetsParams = {}) {
  try {
    const skip = (page - 1) * limit

    const where: Prisma.FileAssetWhereInput = {
      isActive: true, // Only show active files
      folder: { startsWith: 'campus-lingowow' }, // Only show files from this project
    }

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { publicId: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ]
    }

    if (resourceType) {
      where.resourceType = resourceType
    }

    if (category) {
      where.category = category
    }

    if (folder && folder !== 'all') {
      where.folder = { contains: folder }
    }

    const [files, total] = await Promise.all([
      db.fileAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.fileAsset.count({ where }),
    ])

    return {
      success: true,
      data: files,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    }
  } catch (error) {
    console.error('Error fetching file assets:', error)
    return { success: false, error: 'Failed to fetch files' }
  }
}

export async function uploadFileByType(
  formData: FormData,
  fileType: 'image' | 'video' | 'audio' | 'document',
  folder?: string
): Promise<FileUploadResult> {
  switch (fileType) {
    case 'image':
      return uploadImageFile(formData, folder)
    case 'video':
      return uploadVideoFile(formData, folder)
    case 'audio':
      return uploadAudioFile(formData, folder)
    case 'document':
      return uploadDocumentFile(formData, folder)
    default:
      return { success: false, error: 'Invalid file type' }
  }
}

// ... (previous content)

// Re-export these for use in other files if needed, or keep them local if only used here.
// For now, I'll copy the logic.

// Sync Cloudinary resources with database
export async function syncCloudinaryResources(): Promise<{
  success: boolean
  data?: { message: string }
  error?: string
}> {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get all resources from Cloudinary
    const cloudinaryResult = await CloudinaryService.listResources({
      max_results: 500,
      with_field: ['tags', 'context', 'metadata'],
      prefix: 'campus-lingowow/', // Only sync files from this project folder
    })

    const resources = cloudinaryResult.resources

    // Sync each resource with database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncPromises = resources.map(async (resource: any) => {
      const existingFile = await db.fileAsset.findUnique({
        where: { publicId: resource.public_id },
      })

      if (!existingFile) {
        // Create new file record
        const category = determineCategory(resource.folder) // Use local determineCategory
        const resourceType = mapResourceType(resource.resource_type) // Need to define this or use local logic

        await db.fileAsset.create({
          data: {
            publicId: resource.public_id,
            fileName: resource.public_id.split('/').pop() || resource.public_id,
            description: resource.context?.description || undefined,
            tags: resource.tags || [],
            category,
            resourceType,
            format: resource.format || 'unknown',
            size: resource.bytes || 0, // Default to 0 if missing
            width: resource.width || undefined,
            height: resource.height || undefined,
            duration: resource.duration || undefined,
            secureUrl: resource.secure_url,
            url: resource.url,
            folder: resource.folder || 'root',
            uploadedBy: userId,
            metadata: resource.metadata || {},
            isActive: true,
          },
        })
      } else {
        // Update existing file record
        await db.fileAsset.update({
          where: { id: existingFile.id },
          data: {
            size: resource.bytes || 0,
            width: resource.width || undefined,
            height: resource.height || undefined,
            duration: resource.duration || undefined,
            metadata: resource.metadata || {},
            tags: resource.tags || [],
            updatedAt: new Date(),
          },
        })
      }
    })

    await Promise.all(syncPromises)

    return {
      success: true,
      data: { message: `Synced ${resources.length} files from Cloudinary` },
    }
  } catch (error) {
    console.error('Sync Cloudinary resources error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync resources',
    }
  }
}

function mapResourceType(resourceType: string): FileResourceType {
  switch (resourceType) {
    case 'image':
      return FileResourceType.IMAGE
    case 'video':
      return FileResourceType.VIDEO
    case 'audio':
      return FileResourceType.AUDIO
    case 'raw':
      return FileResourceType.RAW
    default:
      return FileResourceType.RAW
  }
}
