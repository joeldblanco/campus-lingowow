import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Cloudinary interfaces and types
export interface CloudinaryResource {
  public_id: string
  secure_url: string
  url: string
  format: string
  resource_type: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  created_at: string
  folder?: string
  tags?: string[]
  context?: Record<string, string>
}

export interface CloudinaryFolder {
  name: string
  path: string
  bytes: number
  file_count: number
  created_at: string
}

export interface CloudinarySearchOptions {
  expression?: string
  sort_by?: Array<{ [key: string]: 'asc' | 'desc' }>
  max_results?: number
  next_cursor?: string
  with_field?: string[]
  type?: string
  prefix?: string
  direction?: 'asc' | 'desc'
}

export interface CloudinarySearchResult {
  resources: CloudinaryResource[]
  next_cursor?: string
  total_count: number
  rate_limit_allowed?: number
  rate_limit_remaining?: number
  rate_limit_reset_at?: string
}

export interface CloudinaryUsageStats {
  plan: string
  last_updated: string
  objects: number
  bandwidth: number
  storage: number
  transformed_images: number
  transformed_videos: number
  rate_limit_allowed?: number
  rate_limit_remaining?: number
}

export interface CloudinaryTransformation {
  width?: number
  height?: number
  crop?: string
  quality?: number | string
  format?: string
  gravity?: string
  effect?: string
  angle?: number
  flip?: string
  opacity?: number
  border?: string
  radius?: number
}

export interface CloudinaryUploadResult {
  public_id: string
  version: number
  signature: string
  width: number
  height: number
  format: string
  resource_type: string
  created_at: string
  tags: string[]
  bytes: number
  type: string
  etag: string
  placeholder: boolean
  url: string
  secure_url: string
  access_mode: string
  original_filename: string
}

export interface UploadOptions {
  folder?: string
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  public_id?: string
  transformation?: CloudinaryTransformation[]
  quality?: string | number
  format?: string
  use_filename?: boolean
  unique_filename?: boolean
  filename_override?: string
}

export class CloudinaryService {
  static async uploadFile(
    file: Buffer | string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const result = await cloudinary.uploader.upload(file as string, {
        folder: options.folder || 'campus-lingowow',
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        transformation: options.transformation,
        quality: options.quality,
        format: options.format,
        use_filename: options.use_filename,
        unique_filename: options.unique_filename,
        filename_override: options.filename_override,
      })

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        created_at: result.created_at,
        version: result.version || 0,
        signature: result.signature || '',
        tags: result.tags || [],
        type: result.type || 'upload',
        etag: result.etag || '',
        placeholder: result.placeholder || false,
        url: result.url || result.secure_url,
        access_mode: result.access_mode || 'public',
        original_filename: result.original_filename || '',
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw new Error('Failed to upload file to Cloudinary')
    }
  }

  static async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
      return result.result === 'ok'
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      throw new Error('Failed to delete file from Cloudinary')
    }
  }

  static async uploadImage(
    file: Buffer | string,
    folder: string = 'images',
    transformations?: CloudinaryTransformation[],
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `campus-lingowow/${folder}`,
      resource_type: 'image',
      transformation: transformations,
      quality: 'auto',
      use_filename: true,
      unique_filename: false,
      filename_override: filename,
    })
  }

  static async uploadVideo(
    file: Buffer | string,
    folder: string = 'videos',
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `campus-lingowow/${folder}`,
      resource_type: 'video',
      quality: 'auto',
      use_filename: true,
      unique_filename: false,
      filename_override: filename,
    })
  }

  static async uploadAudio(
    file: Buffer | string,
    folder: string = 'audio',
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `campus-lingowow/${folder}`,
      resource_type: 'video', // Cloudinary treats audio as video
      quality: 'auto',
      use_filename: true,
      unique_filename: false,
      filename_override: filename,
    })
  }

  static async uploadDocument(
    file: Buffer | string,
    folder: string = 'documents',
    filename?: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `campus-lingowow/${folder}`,
      resource_type: 'raw',
      use_filename: true,
      unique_filename: false,
      filename_override: filename,
    })
  }

  static generateThumbnail(publicId: string, width: number = 300, height: number = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    })
  }

  static generateOptimizedUrl(
    publicId: string,
    options: {
      width?: number
      height?: number
      quality?: string | number
      format?: string
      crop?: string
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      quality: options.quality || 'auto',
      format: options.format || 'auto',
      crop: options.crop || 'scale',
    })
  }

  // Admin API methods for advanced file management

  static async listResources(
    options: CloudinarySearchOptions = {}
  ): Promise<CloudinarySearchResult> {
    try {
      const result = await cloudinary.api.resources({
        type: options.type || 'upload',
        prefix: options.prefix,
        tags: options.with_field?.includes('tags') || false,
        context: options.with_field?.includes('context') || false,
        metadata: options.with_field?.includes('metadata') || false,
        direction: options.direction || 'desc',
        max_results: options.max_results || 50,
        next_cursor: options.next_cursor,
      })

      return {
        resources: result.resources,
        next_cursor: result.next_cursor,
        rate_limit_allowed: result.rate_limit_allowed,
        rate_limit_reset_at: result.rate_limit_reset_at,
        rate_limit_remaining: result.rate_limit_remaining,
        total_count: result.total_count,
      }
    } catch (error) {
      console.error('Cloudinary list resources error:', error)
      throw new Error('Failed to list resources from Cloudinary')
    }
  }

  static async searchResources(
    expression: string,
    options: CloudinarySearchOptions = {}
  ): Promise<CloudinarySearchResult> {
    try {
      const result = await cloudinary.search
        .expression(expression)
        .sort_by('created_at', options.direction || 'desc')
        .max_results(options.max_results || 50)
        .execute()

      return {
        resources: result.resources,
        next_cursor: result.next_cursor,
        rate_limit_allowed: result.rate_limit_allowed,
        rate_limit_reset_at: result.rate_limit_reset_at,
        rate_limit_remaining: result.rate_limit_remaining,
        total_count: result.total_count,
      }
    } catch (error) {
      console.error('Cloudinary search resources error:', error)
      throw new Error('Failed to search resources from Cloudinary')
    }
  }

  static async listFolders(prefix?: string): Promise<CloudinaryFolder[]> {
    try {
      const result = await cloudinary.api.sub_folders(prefix || '')
      return result.folders.map(
        (folder: { name: string; path: string; bytes?: number; file_count?: number }) => ({
          name: folder.name,
          path: folder.path,
          bytes: folder.bytes || 0,
          file_count: folder.file_count || 0,
          created_at: new Date().toISOString(),
        })
      )
    } catch (error) {
      console.error('Cloudinary list folders error:', error)
      throw new Error('Failed to list folders from Cloudinary')
    }
  }

  static async createFolder(path: string): Promise<CloudinaryFolder> {
    try {
      // Cloudinary doesn't have a direct create folder API
      // We create a dummy file to establish the folder structure
      const dummyPublicId = `${path}/.folder_marker`
      await cloudinary.uploader.upload('data:text/plain;base64,dGVzdA==', {
        public_id: dummyPublicId,
        resource_type: 'raw',
      })

      // Clean up the dummy file
      await cloudinary.uploader.destroy(dummyPublicId, { resource_type: 'raw' })

      return {
        name: path.split('/').pop() || path,
        path: path,
        bytes: 0,
        file_count: 0,
        created_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Cloudinary create folder error:', error)
      throw new Error('Failed to create folder in Cloudinary')
    }
  }

  static async deleteFolder(path: string): Promise<boolean> {
    try {
      const result = await cloudinary.api.delete_folder(path)
      return result.deleted
    } catch (error) {
      console.error('Cloudinary delete folder error:', error)
      throw new Error('Failed to delete folder from Cloudinary')
    }
  }

  static async deleteFiles(publicIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds)
      return {
        deleted: Object.keys(result.deleted || {}),
        failed: Object.keys(result.failed || {}),
      }
    } catch (error) {
      console.error('Cloudinary batch delete error:', error)
      throw new Error('Failed to delete files from Cloudinary')
    }
  }

  static async moveFile(
    publicId: string,
    destination: string
  ): Promise<{ public_id: string; secure_url: string }> {
    try {
      const result = await cloudinary.uploader.rename(publicId, destination)
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
      }
    } catch (error) {
      console.error('Cloudinary move file error:', error)
      throw new Error('Failed to move file in Cloudinary')
    }
  }

  static async addTags(publicIds: string[], tags: string[]): Promise<boolean> {
    try {
      await cloudinary.uploader.add_tag(tags.join(','), publicIds)
      return true
    } catch (error) {
      console.error('Error adding tags:', error)
      return false
    }
  }

  static async removeTags(publicIds: string[], tags: string[]): Promise<boolean> {
    try {
      await cloudinary.uploader.remove_tag(tags.join(','), publicIds)
      return true
    } catch (error) {
      console.error('Error removing tags:', error)
      return false
    }
  }

  static async addContext(publicIds: string[], context: Record<string, string>): Promise<boolean> {
    try {
      const contextString = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join('|')

      await cloudinary.uploader.add_context(contextString, publicIds)
      return true
    } catch (error) {
      console.error('Error adding context:', error)
      return false
    }
  }

  static async getUsageStats(): Promise<{
    plan: string
    last_updated: string
    objects: number
    bandwidth: number
    storage: number
    transformed_images: number
    transformed_videos: number
  }> {
    try {
      const result = await cloudinary.api.usage()
      return {
        plan: result.plan,
        last_updated: result.last_updated,
        objects: result.objects,
        bandwidth: result.bandwidth,
        storage: result.storage,
        transformed_images: result.transformed_images,
        transformed_videos: result.transformed_videos,
      }
    } catch (error) {
      console.error('Cloudinary usage stats error:', error)
      throw new Error('Failed to get usage stats from Cloudinary')
    }
  }

  static async getResourceAnalysis(publicId: string): Promise<{
    accessibility: {
      score?: number
      issues?: string[]
    }
    colors: {
      prominent?: Array<{
        color?: string
        percent?: number
      }>
    }
    faces: Array<{
      coordinates?: Array<number>
      attributes?: Record<string, unknown>
    }>
    exif: Record<string, unknown>
    image_metadata: Record<string, unknown>
    pages: Array<{
      width?: number
      height?: number
    }>
    quality_analysis: {
      score?: number
      focus?: number
      noise?: number
      contrast?: number
      brightness?: number
    }
  }> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        quality_analysis: true,
        colors: true,
        faces: true,
        accessibility: true,
        image_metadata: true,
        pages: true,
      })

      return {
        accessibility: result.accessibility,
        colors: result.colors,
        faces: result.faces,
        exif: result.exif,
        image_metadata: result.image_metadata,
        pages: result.pages,
        quality_analysis: result.quality_analysis,
      }
    } catch (error) {
      console.error('Cloudinary resource analysis error:', error)
      throw new Error('Failed to get resource analysis from Cloudinary')
    }
  }
}

export default CloudinaryService
