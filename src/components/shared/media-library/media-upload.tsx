'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, 
  X, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { FileResourceType, FileCategory } from '@prisma/client'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { uploadFileByType } from '@/lib/actions/cloudinary'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'

interface MediaUploadProps {
  onComplete: (files: ServerFileAsset[]) => void
  allowedTypes?: FileResourceType[]
  folder?: string
  multiple?: boolean
}

interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  result?: ServerFileAsset
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onComplete,
  allowedTypes = [],
  folder = '',
  multiple = true
}) => {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): FileResourceType => {
    const type = file.type.toLowerCase()
    
    if (type.startsWith('image/')) return FileResourceType.IMAGE
    if (type.startsWith('video/')) return FileResourceType.VIDEO
    if (type.startsWith('audio/')) return FileResourceType.AUDIO
    return FileResourceType.RAW
  }

  const getFileIcon = (resourceType: FileResourceType) => {
    switch (resourceType) {
      case FileResourceType.IMAGE:
        return <FileImage className="h-4 w-4" />
      case FileResourceType.VIDEO:
        return <FileVideo className="h-4 w-4" />
      case FileResourceType.AUDIO:
        return <FileAudio className="h-4 w-4" />
      case FileResourceType.RAW:
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getFileTypeColor = (resourceType: FileResourceType) => {
    switch (resourceType) {
      case FileResourceType.IMAGE:
        return 'bg-green-100 text-green-800'
      case FileResourceType.VIDEO:
        return 'bg-blue-100 text-blue-800'
      case FileResourceType.AUDIO:
        return 'bg-purple-100 text-purple-800'
      case FileResourceType.RAW:
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleFileSelect = useCallback((files: FileList) => {
    const newItems: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploadItems(prev => multiple ? [...prev, ...newItems] : newItems)
  }, [multiple])

  const removeItem = useCallback((id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const uploadSingleFile = useCallback(async (item: UploadItem): Promise<ServerFileAsset | null> => {
    try {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i
      ))

      const formData = new FormData()
      formData.append('file', item.file)

      const resourceType = getFileType(item.file)
      const cloudinaryType = resourceType === FileResourceType.RAW ? 'document' : resourceType.toLowerCase() as 'image' | 'video' | 'audio' | 'document'
      const result = await uploadFileByType(formData, cloudinaryType, folder)

      if (result.success && result.data) {
        // Convert CloudinaryUploadResult to ServerFileAsset format
        const serverFile: ServerFileAsset = {
          id: result.data.public_id,
          publicId: result.data.public_id,
          fileName: item.file.name,
          description: null,
          tags: [],
          category: FileCategory.GENERAL,
          resourceType,
          format: result.data.format || item.file.name.split('.').pop() || '',
          size: item.file.size,
          width: result.data.width,
          height: result.data.height,
          duration: (result.data as { duration?: number }).duration || null,
          secureUrl: result.data.secure_url,
          url: result.data.url,
          folder: folder || 'root',
          uploadedBy: 'current-user', // This would come from auth context
          isPublic: true,
          isActive: true,
          usageCount: 0,
          lastAccessedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        setUploadItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'success', progress: 100, result: serverFile } : i
        ))

        return serverFile
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed'
      
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'error', error: errorMessage } : i
      ))

      toast.error(`Failed to upload ${item.file.name}: ${errorMessage}`)
      return null
    }
  }, [folder])

  const handleUpload = useCallback(async () => {
    if (uploadItems.length === 0) return

    setIsUploading(true)
    
    try {
      const uploadPromises = uploadItems
        .filter(item => item.status === 'pending')
        .map(item => uploadSingleFile(item))

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter((result): result is ServerFileAsset => result !== null)

      if (successfulUploads.length > 0) {
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`)
        onComplete(successfulUploads)
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [uploadItems, onComplete, uploadSingleFile])

  const clearCompleted = useCallback(() => {
    setUploadItems(prev => prev.filter(item => item.status !== 'success'))
  }, [])

  const clearAll = useCallback(() => {
    setUploadItems([])
  }, [])

  const hasPendingItems = uploadItems.some(item => item.status === 'pending')
  const hasCompletedItems = uploadItems.some(item => item.status === 'success')
  const successfulUploads = uploadItems.filter(item => item.status === 'success' && item.result)

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={allowedTypes.length > 0 ? allowedTypes.map(type => {
                switch (type) {
                  case FileResourceType.IMAGE:
                    return 'image/*'
                  case FileResourceType.VIDEO:
                    return 'video/*'
                  case FileResourceType.AUDIO:
                    return 'audio/*'
                  case FileResourceType.RAW:
                    return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
                  default:
                    return '*/*'
                }
              }).join(',') : '*/*'}
              multiple={multiple}
              onChange={(e) => {
                const files = e.target.files
                if (files) {
                  handleFileSelect(files)
                }
              }}
              disabled={isUploading}
            />
            <div 
              className="cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const files = e.dataTransfer.files
                if (files.length > 0) {
                  handleFileSelect(files)
                }
              }}
            >
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium">Upload Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop files here, or click to select
                  </p>
                </div>
                {allowedTypes.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {allowedTypes.map(type => (
                      <Badge key={type} variant="outline" className={getFileTypeColor(type)}>
                        {type.split('_')[0]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadItems.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Upload Queue ({uploadItems.length})
              </h3>
              <div className="flex items-center gap-2">
                {hasCompletedItems && (
                  <Button variant="outline" size="sm" onClick={clearCompleted}>
                    Clear Completed
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {uploadItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {item.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : item.status === 'uploading' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="text-muted-foreground">
                          {getFileIcon(getFileType(item.file))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{item.file.name}</span>
                        <Badge 
                          variant="outline" 
                          className={getFileTypeColor(getFileType(item.file))}
                        >
                          {getFileType(item.file).split('_')[0]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(item.file.size)}</span>
                        {item.status === 'uploading' && (
                          <span>Uploading...</span>
                        )}
                        {item.status === 'success' && (
                          <span className="text-green-600">Uploaded</span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-600">{item.error}</span>
                        )}
                      </div>

                      {item.status === 'uploading' && (
                        <Progress value={item.progress} className="mt-2" />
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={item.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Upload Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {successfulUploads.length} of {uploadItems.length} uploaded
              </div>
              <Button
                onClick={handleUpload}
                disabled={!hasPendingItems || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {hasPendingItems ? `(${uploadItems.filter(i => i.status === 'pending').length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
