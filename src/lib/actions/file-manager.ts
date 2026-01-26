'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { CloudinaryService, type CloudinaryResource, type CloudinaryFolder } from '@/lib/cloudinary'
import { FileCategory, FileResourceType, UsageAction, Prisma } from '@prisma/client'

// Interfaces for server actions
export interface ServerFileAsset {
  id: string
  publicId: string
  fileName: string
  description: string | null
  tags: string[]
  category: FileCategory
  resourceType: FileResourceType
  format: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
  secureUrl: string
  url: string
  folder: string
  uploadedBy: string
  isPublic: boolean
  isActive: boolean
  usageCount: number
  lastAccessedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface FileManagementResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface FileListOptions {
  page?: number
  limit?: number
  search?: string
  resourceType?: FileResourceType
  category?: FileCategory
  folder?: string
  tags?: string[]
  sortBy?: 'createdAt' | 'size' | 'fileName' | 'usageCount'
  sortOrder?: 'asc' | 'desc'
  uploadedBy?: string
}

export interface FileListResult {
  files: ServerFileAsset[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Get current user session
async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return { ...session.user, id: session.user.id as string }
}

// Check if user has admin permissions
async function checkAdminPermissions(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { roles: true, permissions: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const isAdmin = user.roles.includes('ADMIN') || user.permissions.includes('FILE_ADMIN')

  if (!isAdmin) {
    throw new Error('Insufficient permissions')
  }

  return user
}

// Sync Cloudinary resources with database
export async function syncCloudinaryResources(): Promise<
  FileManagementResult<{ message: string }>
> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    // Get all resources from Cloudinary
    const cloudinaryResult = await CloudinaryService.listResources({
      max_results: 500,
      with_field: ['tags', 'context', 'metadata'],
      prefix: 'campus-lingowow/', // Only sync files from this project folder
    })

    const resources = cloudinaryResult.resources

    // Sync each resource with database
    const syncPromises = resources.map(async (resource: CloudinaryResource) => {
      const existingFile = await db.fileAsset.findUnique({
        where: { publicId: resource.public_id },
      })

      if (!existingFile) {
        // Create new file record
        const category = determineFileCategory(resource.folder, resource.context)
        const resourceType = mapResourceType(resource.resource_type)

        await db.fileAsset.create({
          data: {
            publicId: resource.public_id,
            fileName: extractFileName(resource.public_id),
            description: resource.context?.description || undefined,
            tags: resource.tags || [],
            category,
            resourceType,
            format: resource.format,
            size: resource.bytes,
            width: resource.width || undefined,
            height: resource.height || undefined,
            duration: resource.duration || undefined,
            secureUrl: resource.secure_url,
            url: resource.url,
            folder: resource.folder || 'root',
            uploadedBy: user.id,
            metadata: (resource as CloudinaryResource & { metadata?: Record<string, unknown> })
              .metadata as Prisma.InputJsonValue,
          },
        })
      } else {
        // Update existing file record
        await db.fileAsset.update({
          where: { id: existingFile.id },
          data: {
            size: resource.bytes,
            width: resource.width || undefined,
            height: resource.height || undefined,
            duration: resource.duration || undefined,
            metadata: (resource as CloudinaryResource & { metadata?: Record<string, unknown> })
              .metadata as Prisma.InputJsonValue,
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

// Get real file counts for folders (fixes Cloudinary's outdated counts)
export async function getRealFolderCounts(
  folders: CloudinaryFolder[]
): Promise<Map<string, number>> {
  const folderCounts = new Map<string, number>()
  
  // Get file counts for all folders in parallel
  const countPromises = folders.map(async (folder) => {
    const expression = `folder:${folder.path}`
    const result = await CloudinaryService.searchResources(expression)
    return { path: folder.path, count: result.resources.length }
  })
  
  const counts = await Promise.all(countPromises)
  counts.forEach(({ path, count }) => {
    folderCounts.set(path, count)
  })
  
  return folderCounts
}

// List files with filtering and pagination
export async function listFiles(
  options: FileListOptions = {}
): Promise<FileManagementResult<FileListResult>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    const {
      page = 1,
      limit = 20,
      search,
      resourceType,
      folder,
    } = options

    // Build Cloudinary search expression
    let expression = 'folder:campus-lingowow'
    
    if (folder && folder !== 'campus-lingowow') {
      // Search in specific folder ONLY (not subfolders)
      expression = `folder:${folder}`
    }
    
    // Add search filter
    if (search) {
      expression += ` AND filename:${search}*`
    }

    // Add resource type filter
    if (resourceType) {
      const cloudinaryType = resourceType === 'IMAGE' ? 'image' : 
                           resourceType === 'VIDEO' ? 'video' : 
                           resourceType === 'AUDIO' ? 'video' : 'raw'
      expression += ` AND resource_type:${cloudinaryType}`
    }
    
    // Get resources from Cloudinary
    const searchResult = await CloudinaryService.searchResources(expression)
    
    // Convert Cloudinary resources to ServerFileAsset format
    const files: ServerFileAsset[] = searchResult.resources.map(resource => {
      // Determine resource type based on both resource_type and format
      let resourceType: FileResourceType
      if (resource.resource_type === 'image') {
        resourceType = 'IMAGE' as FileResourceType
      } else if (resource.resource_type === 'video') {
        // Check if it's actually audio based on format
        const audioFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'webm']
        const format = (resource.format || '').toLowerCase()
        resourceType = audioFormats.includes(format) ? 'AUDIO' as FileResourceType : 'VIDEO' as FileResourceType
      } else if (resource.resource_type === 'raw') {
        resourceType = 'DOCUMENT' as FileResourceType
      } else {
        resourceType = 'AUDIO' as FileResourceType
      }

      return {
        id: resource.public_id,
        publicId: resource.public_id,
        fileName: resource.public_id.split('/').pop() || resource.public_id,
        description: null,
        tags: [],
        category: 'GENERAL' as FileCategory,
        resourceType,
        format: resource.format || 'unknown',
        size: resource.bytes || 0,
        width: resource.width || null,
        height: resource.height || null,
        duration: resource.duration || null,
        secureUrl: resource.secure_url,
        url: resource.secure_url,
        folder: resource.folder || '',
        uploadedBy: user.id,
        isPublic: true,
        isActive: true,
        usageCount: 0,
        lastAccessedAt: null,
        createdAt: new Date(resource.created_at || Date.now()),
        updatedAt: new Date(resource.created_at || Date.now()),
      }
    })

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFiles = files.slice(startIndex, endIndex)

    return {
      success: true,
      data: {
        files: paginatedFiles,
        total: files.length,
        page,
        limit,
        totalPages: Math.ceil(files.length / limit),
        hasNext: endIndex < files.length,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    console.error('List files error:', error)
    
    // Handle rate limit specifically
    if (error instanceof Error && error.message.includes('Rate Limit Exceeded')) {
      return {
        success: false,
        error: 'Límite de Cloudinary alcanzado. Por favor, espera unos minutos antes de continuar.',
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    }
  }
}

// Get file details
export async function getFileDetails(
  publicId: string
): Promise<FileManagementResult<ServerFileAsset>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    const file = await db.fileAsset.findUnique({
      where: { publicId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transformations: true,
        usageLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!file) {
      return {
        success: false,
        error: 'File not found',
      }
    }

    // Log file access
    if (user.id && file.id) {
      await logFileUsage(file.id, user.id, 'VIEW')
    }

    return {
      success: true,
      data: file as ServerFileAsset,
    }
  } catch (error) {
    console.error('Get file details error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file details',
    }
  }
}

// Update file metadata
export async function updateFileMetadata(
  publicId: string,
  metadata: {
    fileName?: string
    description?: string
    tags?: string[]
    category?: FileCategory
    isPublic?: boolean
  }
): Promise<FileManagementResult<ServerFileAsset>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    const file = await db.fileAsset.findUnique({
      where: { publicId },
    })

    if (!file) {
      return {
        success: false,
        error: 'File not found',
      }
    }

    // Update Cloudinary tags if provided
    if (metadata.tags) {
      const currentTags = file.tags
      const tagsToAdd = metadata.tags.filter((tag: string) => !currentTags.includes(tag))
      const tagsToRemove = currentTags.filter((tag: string) => !metadata.tags!.includes(tag))

      if (tagsToAdd.length > 0) {
        await CloudinaryService.addTags([publicId], tagsToAdd)
      }
      if (tagsToRemove.length > 0) {
        await CloudinaryService.removeTags([publicId], tagsToRemove)
      }
    }

    // Update database record
    const updatedFile = await db.fileAsset.update({
      where: { id: file.id },
      data: {
        ...metadata,
        updatedAt: new Date(),
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return {
      success: true,
      data: updatedFile as ServerFileAsset,
      message: 'File metadata updated successfully',
    }
  } catch (error) {
    console.error('Update file metadata error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update file metadata',
    }
  }
}

// Batch delete files
export async function batchDeleteFiles(
  publicIds: string[]
): Promise<FileManagementResult<{ deleted: string[]; failed: string[] }>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    // Delete from Cloudinary
    const cloudinaryResult = await CloudinaryService.deleteFiles(publicIds)

    // Update database (soft delete)
    const files = await db.fileAsset.findMany({
      where: { publicId: { in: publicIds } },
    })

    await db.fileAsset.updateMany({
      where: { id: { in: files.map((f) => f.id) } },
      data: { isActive: false },
    })

    // Log deletions
    await Promise.all(
      files.map((file) => {
        if (user.id && file.id) {
          return logFileUsage(file.id, user.id, 'DELETE')
        }
        return Promise.resolve()
      })
    )

    return {
      success: true,
      data: cloudinaryResult,
      message: `Deleted ${cloudinaryResult.deleted.length} files successfully`,
    }
  } catch (error) {
    console.error('Batch delete files error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete files',
    }
  }
}

// Move files to folder
export async function moveFiles(
  publicIds: string[],
  destinationFolder: string
): Promise<FileManagementResult<{ moved: string[]; failed: string[] }>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    const moved: string[] = []
    const failed: string[] = []

    for (const publicId of publicIds) {
      try {
        // Enforce campus-lingowow prefix on destination
        const safeDestination = destinationFolder.startsWith('campus-lingowow')
          ? destinationFolder
          : `campus-lingowow/${destinationFolder}`

        // Move in Cloudinary
        const newPublicId = `${safeDestination}/${publicId.split('/').pop()}`
        await CloudinaryService.moveFile(publicId, newPublicId)

        // Update database
        await db.fileAsset.updateMany({
          where: { publicId },
          data: {
            folder: destinationFolder,
            publicId: newPublicId,
            updatedAt: new Date(),
          },
        })

        moved.push(publicId)
      } catch {
        failed.push(publicId)
      }
    }

    return {
      success: true,
      data: { moved, failed },
      message: `Moved ${moved.length} files successfully`,
    }
  } catch (error) {
    console.error('Move files error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move files',
    }
  }
}

// List folders
export async function listFolders(
  prefix?: string
): Promise<FileManagementResult<CloudinaryFolder[]>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    const folders = await CloudinaryService.listFolders(prefix)

    return {
      success: true,
      data: folders,
    }
  } catch (error) {
    console.error('List folders error:', error)
    
    // Handle rate limit specifically
    if (error instanceof Error && error.message.includes('Rate Limit Exceeded')) {
      return {
        success: false,
        error: 'Límite de Cloudinary alcanzado. Por favor, espera unos minutos antes de continuar.',
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list folders',
    }
  }
}

// Create folder
export async function createFolder(path: string): Promise<FileManagementResult<CloudinaryFolder>> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    // Enforce campus-lingowow prefix
    const safePath = path.startsWith('campus-lingowow/') ? path : `campus-lingowow/${path}`

    // Create in Cloudinary
    const cloudinaryFolder = await CloudinaryService.createFolder(safePath)

    // Create in database
    await db.fileFolder.create({
      data: {
        name: cloudinaryFolder.name,
        path: cloudinaryFolder.path,
        creator: {
          connect: { id: user.id },
        },
      },
    })

    return {
      success: true,
      data: cloudinaryFolder,
      message: 'Folder created successfully',
    }
  } catch (error) {
    console.error('Create folder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create folder',
    }
  }
}

// Get usage statistics
export async function getUsageStats(): Promise<
  FileManagementResult<{
    totalFiles: number
    totalSize: number
    byType: Record<FileResourceType, { count: number; size: number }>
    byCategory: Record<FileCategory, { count: number; size: number }>
    recentUploads: number
    cloudinaryUsage: unknown
  }>
> {
  try {
    const user = await getCurrentUser()
    await checkAdminPermissions(user.id)

    // Get database stats
    const [totalFiles, totalSize, byType, byCategory, recentUploads] = await Promise.all([
      db.fileAsset.count({ where: { isActive: true } }),
      db.fileAsset.aggregate({
        where: { isActive: true },
        _sum: { size: true },
      }),
      db.fileAsset.groupBy({
        by: ['resourceType'],
        where: { isActive: true },
        _count: { id: true },
        _sum: { size: true },
      }),
      db.fileAsset.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { id: true },
        _sum: { size: true },
      }),
      db.fileAsset.count({
        where: {
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      }),
    ])

    // Get Cloudinary usage
    const cloudinaryUsage = await CloudinaryService.getUsageStats()

    const byTypeMap = byType.reduce(
      (
        acc: Record<FileResourceType, { count: number; size: number }>,
        item: {
          resourceType: FileResourceType
          _count: { id: number }
          _sum: { size: number | null }
        }
      ) => {
        acc[item.resourceType] = {
          count: item._count.id,
          size: item._sum.size || 0,
        }
        return acc
      },
      {} as Record<FileResourceType, { count: number; size: number }>
    )

    const byCategoryMap = byCategory.reduce(
      (
        acc: Record<FileCategory, { count: number; size: number }>,
        item: { category: FileCategory; _count: { id: number }; _sum: { size: number | null } }
      ) => {
        acc[item.category] = {
          count: item._count.id,
          size: item._sum.size || 0,
        }
        return acc
      },
      {} as Record<FileCategory, { count: number; size: number }>
    )

    return {
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize._sum.size || 0,
        byType: byTypeMap,
        byCategory: byCategoryMap,
        recentUploads,
        cloudinaryUsage,
      },
    }
  } catch (error) {
    console.error('Get usage stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage stats',
    }
  }
}

// Helper functions

function determineFileCategory(folder?: string, context?: Record<string, string>): FileCategory {
  if (context?.category) {
    return context.category as FileCategory
  }

  if (folder) {
    if (folder.includes('course')) return FileCategory.COURSE_CONTENT
    if (folder.includes('lesson')) return FileCategory.LESSON_MATERIAL
    if (folder.includes('assignment') || folder.includes('exam')) return FileCategory.ASSIGNMENT
    if (folder.includes('avatar') || folder.includes('profile')) return FileCategory.USER_AVATAR
    if (folder.includes('brand') || folder.includes('logo')) return FileCategory.BRANDING
    if (folder.includes('doc')) return FileCategory.DOCUMENTATION
    if (folder.includes('media') || folder.includes('video') || folder.includes('audio'))
      return FileCategory.MEDIA
    if (folder.includes('template')) return FileCategory.TEMPLATE
    if (folder.includes('backup')) return FileCategory.BACKUP
  }

  return FileCategory.GENERAL
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

function extractFileName(publicId: string): string {
  return publicId.split('/').pop() || publicId
}

async function logFileUsage(
  fileAssetId: string,
  userId: string,
  action: 'VIEW' | 'DOWNLOAD' | 'EMBED' | 'TRANSFORM' | 'SHARE' | 'DELETE',
  context?: string,
  contextId?: string
): Promise<void> {
  try {
    await db.fileUsageLog.create({
      data: {
        fileAssetId,
        userId,
        action: action as UsageAction,
        context,
        contextId,
      },
    })

    // Update usage count
    await db.fileAsset.update({
      where: { id: fileAssetId },
      data: {
        usageCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to log file usage:', error)
  }
}
