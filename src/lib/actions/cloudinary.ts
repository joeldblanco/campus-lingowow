'use server'

import CloudinaryService, { CloudinaryUploadResult } from '@/lib/cloudinary'

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

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadImage(base64, folder)
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Image upload error:', error)
    return { success: false, error: 'Failed to upload image' }
  }
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await CloudinaryService.uploadAudio(base64, folder)
    
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
