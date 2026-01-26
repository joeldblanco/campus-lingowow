'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, 
  Download, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText,
  Calendar,
  HardDrive,
  Check
} from 'lucide-react'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { FileResourceType } from '@prisma/client'
import { formatFileSize, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface MediaItemProps {
  file: ServerFileAsset
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  viewMode: 'grid' | 'list'
  multiple: boolean
}

export const MediaItem: React.FC<MediaItemProps> = ({
  file,
  isSelected,
  onSelect,
  onPreview,
  viewMode,
  multiple
}) => {
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
      case FileResourceType.DOCUMENT:
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
      case FileResourceType.DOCUMENT:
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderThumbnail = () => {
    if (file.resourceType === FileResourceType.IMAGE) {
      return (
        <div className="relative aspect-square overflow-hidden rounded-md">
          <Image
            src={file.secureUrl}
            alt={file.fileName}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="aspect-square flex flex-col items-center justify-center bg-muted rounded-md border-2 border-dashed border-muted-foreground/20">
        <div className="text-2xl mb-1 text-muted-foreground">
          {getFileIcon(file.resourceType)}
        </div>
        <div className="text-[10px] text-muted-foreground text-center px-1">
          {file.format.toUpperCase()}
        </div>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Checkbox for multiple selection */}
            {multiple && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Thumbnail */}
            <div className="w-16 h-16 flex-shrink-0">
              {file.resourceType === FileResourceType.IMAGE ? (
                <div className="relative w-full h-full overflow-hidden rounded-md">
                  <Image
                    src={file.secureUrl}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
                  {getFileIcon(file.resourceType)}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{file.fileName}</h3>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getFileTypeColor(file.resourceType))}
                >
                  {file.resourceType.split('_')[0]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(file.size)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(file.createdAt)}
                </span>
                {file.folder && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {file.folder}
                  </span>
                )}
              </div>
              {file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {file.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {file.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{file.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview()
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(file.url, '_blank')
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md overflow-hidden relative",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-2">
        {/* Selection indicator */}
        {multiple && (
          <div className="absolute top-1 left-1 z-50 bg-white rounded-sm p-0.5">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
          </div>
        )}

        {isSelected && !multiple && (
          <div className="absolute top-1 right-1 z-50 bg-white rounded-full p-0.5">
            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div className="mb-2">
          {renderThumbnail()}
        </div>

        {/* File Info - Compact */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-[10px] truncate pr-1" title={file.fileName}>
              {file.fileName}
            </h3>
            <Badge 
              variant="secondary" 
              className={cn("text-[8px] shrink-0 px-1 py-0", getFileTypeColor(file.resourceType))}
            >
              {file.format.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-[8px] text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
          </div>

          {/* Actions - Compact */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
            >
              <Eye className="h-2 w-2" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                window.open(file.url, '_blank')
              }}
            >
              <Download className="h-2 w-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
