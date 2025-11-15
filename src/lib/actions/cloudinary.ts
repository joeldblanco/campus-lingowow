'use server'

import CloudinaryService, { CloudinaryUploadResult } from '@/lib/cloudinary'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { FileCategory, FileResourceType } from '@prisma/client'

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

    const result = await CloudinaryService.uploadImage(base64, folder)
    
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
            folder: `lingowow/${folder}`,
            uploadedBy: userId,
            isPublic: true,
            isActive: true,
          }
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

    const result = await CloudinaryService.uploadVideo(base64, folder)
    
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

    const result = await CloudinaryService.uploadAudio(base64, folder)
    
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
            folder: `lingowow/${folder}`,
            uploadedBy: userId,
            isPublic: true,
            isActive: true,
          }
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

    const result = await CloudinaryService.uploadDocument(base64, folder)
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Document upload error:', error)
    return { success: false, error: 'Failed to upload document' }
  }
}

export async function deleteCloudinaryFile(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await CloudinaryService.deleteFile(publicId)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete file' }
    }
  } catch (error) {
    console.error('File deletion error:', error)
    return { success: false, error: 'Failed to delete file' }
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
