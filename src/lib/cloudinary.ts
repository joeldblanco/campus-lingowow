import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  width?: number
  height?: number
  format: string
  resource_type: string
  bytes: number
  created_at: string
}

export interface CloudinaryTransformation {
  width?: number
  height?: number
  crop?: string
  quality?: string | number
  format?: string
  gravity?: string
  effect?: string
  overlay?: string
  underlay?: string
  angle?: number
  radius?: number | string
  border?: string
  color?: string
  dpr?: number
  flags?: string
  [key: string]: string | number | boolean | undefined
}

export interface UploadOptions {
  folder?: string
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  public_id?: string
  transformation?: CloudinaryTransformation[]
  quality?: string | number
  format?: string
}

export class CloudinaryService {
  static async uploadFile(
    file: Buffer | string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const result = await cloudinary.uploader.upload(file as string, {
        folder: options.folder || 'lingowow',
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        transformation: options.transformation,
        quality: options.quality,
        format: options.format,
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
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw new Error('Failed to upload file to Cloudinary')
    }
  }

  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId)
      return result.result === 'ok'
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      throw new Error('Failed to delete file from Cloudinary')
    }
  }

  static async uploadImage(
    file: Buffer | string,
    folder: string = 'images',
    transformations?: CloudinaryTransformation[]
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `lingowow/${folder}`,
      resource_type: 'image',
      transformation: transformations,
      quality: 'auto',
    })
  }

  static async uploadVideo(
    file: Buffer | string,
    folder: string = 'videos'
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `lingowow/${folder}`,
      resource_type: 'video',
      quality: 'auto',
    })
  }

  static async uploadAudio(
    file: Buffer | string,
    folder: string = 'audio'
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `lingowow/${folder}`,
      resource_type: 'video', // Cloudinary treats audio as video
      quality: 'auto',
    })
  }

  static async uploadDocument(
    file: Buffer | string,
    folder: string = 'documents'
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, {
      folder: `lingowow/${folder}`,
      resource_type: 'raw',
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
}

export default CloudinaryService
