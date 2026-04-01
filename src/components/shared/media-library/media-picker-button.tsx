'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'
import { FileResourceType } from '@prisma/client'
import { MediaLibrary } from './media-library'
import { ServerFileAsset } from '@/lib/actions/file-manager'

export interface MediaPickerButtonProps {
  onSelect: (file: ServerFileAsset) => void
  allowedTypes?: FileResourceType[]
  initialFolder?: string
  builder?: 'lesson' | 'exam' | 'resource'
  label?: string
  variant?: 'outline' | 'ghost' | 'default' | 'secondary'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  className?: string
  multiple?: boolean
  onSelectMultiple?: (files: ServerFileAsset[]) => void
}

export const MediaPickerButton: React.FC<MediaPickerButtonProps> = ({
  onSelect,
  allowedTypes,
  initialFolder,
  builder = 'lesson',
  label = 'Elegir de biblioteca',
  variant = 'outline',
  size = 'sm',
  className,
  multiple = false,
  onSelectMultiple,
}) => {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (files: ServerFileAsset[]) => {
      if (multiple && onSelectMultiple) {
        onSelectMultiple(files)
      } else if (files.length > 0) {
        onSelect(files[0])
      }
    },
    [multiple, onSelect, onSelectMultiple]
  )

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        {label}
      </Button>

      <MediaLibrary
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        allowedTypes={allowedTypes}
        initialFolder={initialFolder}
        builder={builder}
        multiple={multiple}
      />
    </>
  )
}
