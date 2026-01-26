'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Folder } from 'lucide-react'
import { CloudinaryFolder } from '@/lib/cloudinary'
import { cn } from '@/lib/utils'

interface FolderItemProps {
  folder: CloudinaryFolder
  isSelected?: boolean
  onClick: (folder: CloudinaryFolder) => void
  iconSize?: 'small' | 'medium' | 'large'
}

export const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  isSelected = false,
  onClick,
  iconSize = 'medium'
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDisplayName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1] // Get the last part (folder name)
  }

  const getRelativePath = (path: string) => {
    // Remove campus-lingowow prefix for display
    return path.replace('campus-lingowow/', '')
  }

  const getIconSize = () => {
    switch (iconSize) {
      case 'small': return 'h-6 w-6'
      case 'medium': return 'h-8 w-8'
      case 'large': return 'h-12 w-12'
      default: return 'h-8 w-8'
    }
  }

  const getTextSize = () => {
    switch (iconSize) {
      case 'small': return 'text-xs'
      case 'medium': return 'text-sm'
      case 'large': return 'text-base'
      default: return 'text-sm'
    }
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "ring-2 ring-primary bg-primary/5",
        iconSize === 'small' ? "p-2" : iconSize === 'large' ? "p-4" : "p-3"
      )}
      onClick={() => onClick(folder)}
    >
      <CardContent className={cn(
        "flex flex-col items-center justify-center text-center gap-2",
        iconSize === 'small' ? "py-2" : iconSize === 'large' ? "py-4" : "py-3"
      )}>
        <Folder className={cn("text-blue-500", getIconSize())} />
        
        <div className="w-full">
          <h3 className={cn("font-medium truncate", getTextSize())}>
            {getDisplayName(folder.name)}
          </h3>
          
          {iconSize !== 'small' && (
            <Badge variant="outline" className={cn("text-xs mt-1", getTextSize())}>
              {folder.file_count} files
            </Badge>
          )}
          
          {iconSize === 'large' && (
            <div className="text-xs text-muted-foreground mt-1">
              <div>{formatFileSize(folder.bytes)}</div>
              <div>{getRelativePath(folder.path)}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
