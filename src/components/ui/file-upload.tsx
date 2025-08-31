'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, File, Video, Music, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFileByType } from '@/lib/actions/cloudinary'
import Image from 'next/image'

export interface FileUploadProps {
  onUploadComplete?: (result: { public_id: string; secure_url: string }) => void
  onUploadError?: (error: string) => void
  acceptedTypes?: string[]
  maxSize?: number // in MB
  folder?: string
  fileType: 'image' | 'video' | 'audio' | 'document'
  multiple?: boolean
  className?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  acceptedTypes,
  maxSize = 10,
  folder,
  fileType,
  multiple = false,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDefaultAcceptedTypes = () => {
    switch (fileType) {
      case 'image':
        return ['image/*']
      case 'video':
        return ['video/*']
      case 'audio':
        return ['audio/*']
      case 'document':
        return ['.pdf', '.doc', '.docx', '.txt', '.rtf']
      default:
        return ['*/*']
    }
  }

  const getFileTypeIcon = () => {
    switch (fileType) {
      case 'image':
        return <Upload className="h-8 w-8 text-gray-400" />
      case 'video':
        return <Video className="h-8 w-8 text-gray-400" />
      case 'audio':
        return <Music className="h-8 w-8 text-gray-400" />
      case 'document':
        return <FileText className="h-8 w-8 text-gray-400" />
      default:
        return <Upload className="h-8 w-8 text-gray-400" />
    }
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const accepted = acceptedTypes || getDefaultAcceptedTypes()
    const isAccepted = accepted.some(type => {
      if (type === '*/*') return true
      if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase())
      return file.type.match(type.replace('*', '.*'))
    })

    if (!isAccepted) {
      return `File type not accepted. Accepted types: ${accepted.join(', ')}`
    }

    return null
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return

    const file = files[0] // For now, handle single file
    const validationError = validateFile(file)
    
    if (validationError) {
      toast.error(validationError)
      onUploadError?.(validationError)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await uploadFileByType(formData, fileType, folder)

      clearInterval(progressInterval)
      setProgress(100)

      if (result.success && result.data) {
        toast.success('File uploaded successfully!')
        onUploadComplete?.(result.data)
      } else {
        toast.error(result.error || 'Upload failed')
        onUploadError?.(result.error || 'Upload failed')
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFileUpload(files)
    }
  }

  return (
    <div className={className}>
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={(acceptedTypes || getDefaultAcceptedTypes()).join(',')}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={uploading}
          />

          {uploading ? (
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 animate-pulse text-blue-500" />
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">Uploading... {progress}%</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-4">
                {getFileTypeIcon()}
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your {fileType} here, or click to browse
              </p>
              <p className="text-sm text-gray-600">
                Max size: {maxSize}MB • Accepted: {(acceptedTypes || getDefaultAcceptedTypes()).join(', ')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export interface FilePreviewProps {
  file: {
    public_id: string
    secure_url: string
    format: string
    resource_type: string
    original_filename: string
  }
  onRemove?: () => void
  className?: string
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  className = '',
}) => {
  const renderPreview = () => {
    if (file.resource_type === 'image') {
      return (
        <Image
          src={file.secure_url}
          alt={file.original_filename || 'Uploaded file'}
          width={100}
          height={100}
          className="w-full h-full object-cover rounded"
        />
      )
    }

    if (file.resource_type === 'video') {
      return (
        <video
          src={file.secure_url}
          className="w-full h-32 object-cover rounded"
          controls
        />
      )
    }

    return (
      <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
        <File className="h-12 w-12 text-gray-400" />
      </div>
    )
  }

  return (
    <Card className={`relative ${className}`}>
      <CardContent className="p-4">
        {renderPreview()}
        <div className="mt-2">
          <p className="text-sm font-medium truncate">{file.public_id}</p>
          <p className="text-xs text-gray-500">{file.format.toUpperCase()}</p>
        </div>
        {onRemove && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
