'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Eye, 
  Trash2, 
  Edit, 
  Copy, 
  Move, 
  Tag, 
  FolderOpen,
  Grid3X3,
  List,
  RefreshCw,
  Upload,
  BarChart3
} from 'lucide-react'
import { useAdvancedFileManager } from '@/hooks/use-file-manager'
import { FileUpload } from '@/components/ui/file-upload'
import { FileCategory, FileResourceType } from '@prisma/client'
import { formatFileSize, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { ServerFileAsset } from '@/lib/actions/file-manager'

interface FileManagerProps {
  className?: string
  initialFolder?: string
  allowUpload?: boolean
  allowDelete?: boolean
  allowMove?: boolean
  showStats?: boolean
}


export const AdvancedFileManager: React.FC<FileManagerProps> = ({
  className = '',
  initialFolder = '',
  allowUpload = true,
  allowDelete = true,
  allowMove = true,
  showStats = true
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFile, setSelectedFile] = useState<ServerFileAsset | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const fileManager = useAdvancedFileManager({
    folder: initialFolder,
    limit: 20
  })

  const handleFileUpload = async () => {
    toast.success('File uploaded successfully')
    fileManager.refresh()
    setShowUploadDialog(false)
  }

  const handleFileUploadError = (error: string) => {
    toast.error(error)
  }


  const handleDeleteFiles = async () => {
    if (window.confirm(`Are you sure you want to delete ${fileManager.selectedFiles.length} files?`)) {
      await fileManager.deleteSelectedFiles()
    }
  }

  const getFileIcon = (resourceType: FileResourceType) => {
    switch (resourceType) {
      case FileResourceType.IMAGE:
        return '🖼️'
      case FileResourceType.VIDEO:
        return '🎥'
      case FileResourceType.AUDIO:
        return '🎵'
      case FileResourceType.RAW:
        return '📄'
      default:
        return '📎'
    }
  }

  const getCategoryColor = (category: FileCategory) => {
    const colors = {
      GENERAL: 'bg-gray-100 text-gray-800',
      COURSE_CONTENT: 'bg-blue-100 text-blue-800',
      LESSON_MATERIAL: 'bg-green-100 text-green-800',
      ASSIGNMENT: 'bg-purple-100 text-purple-800',
      USER_AVATAR: 'bg-pink-100 text-pink-800',
      BRANDING: 'bg-orange-100 text-orange-800',
      DOCUMENTATION: 'bg-indigo-100 text-indigo-800',
      MEDIA: 'bg-red-100 text-red-800',
      TEMPLATE: 'bg-yellow-100 text-yellow-800',
      BACKUP: 'bg-gray-200 text-gray-800'
    }
    return colors[category] || colors.GENERAL
  }

  const renderFileItem = (file: ServerFileAsset) => (
    <Card 
      key={file.publicId} 
      className={`group hover:shadow-md transition-shadow cursor-pointer ${
        fileManager.selectedFiles.includes(file.publicId) ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => fileManager.toggleFileSelection(file.publicId)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={fileManager.selectedFiles.includes(file.publicId)}
              onCheckedChange={() => fileManager.toggleFileSelection(file.publicId)}
            />
            <span className="text-2xl">{getFileIcon(file.resourceType)}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedFile(file)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              {allowMove && (
                <DropdownMenuItem>
                  <Move className="h-4 w-4 mr-2" />
                  Move
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {allowDelete && (
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => fileManager.operations.deleteFile(file.publicId)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {file.resourceType === 'IMAGE' ? (
          <div className="aspect-square relative mb-3 rounded overflow-hidden">
            <Image
              src={file.secureUrl}
              alt={file.fileName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 rounded flex items-center justify-center mb-3">
            <span className="text-4xl">{getFileIcon(file.resourceType)}</span>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-medium text-sm truncate" title={file.fileName}>
            {file.fileName}
          </h3>
          <p className="text-xs text-gray-500 truncate">{file.folder}</p>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {file.format.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </span>
          </div>
          <Badge className={`text-xs ${getCategoryColor(file.category)}`}>
            {file.category.replace('_', ' ')}
          </Badge>
          {file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {file.tags.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {file.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{file.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderListItem = (file: ServerFileAsset) => (
    <Card 
      key={file.publicId} 
      className={`group hover:shadow-md transition-shadow cursor-pointer ${
        fileManager.selectedFiles.includes(file.publicId) ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => fileManager.toggleFileSelection(file.publicId)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Checkbox 
            checked={fileManager.selectedFiles.includes(file.publicId)}
            onCheckedChange={() => fileManager.toggleFileSelection(file.publicId)}
          />
          
          <div className="flex-shrink-0">
            {file.resourceType === 'IMAGE' ? (
              <div className="w-12 h-12 relative rounded overflow-hidden">
                <Image
                  src={file.secureUrl}
                  alt={file.fileName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xl">{getFileIcon(file.resourceType)}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" title={file.fileName}>
              {file.fileName}
            </h3>
            <p className="text-xs text-gray-500">{file.folder}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {file.format.toUpperCase()}
              </Badge>
              <Badge className={`text-xs ${getCategoryColor(file.category)}`}>
                {file.category.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(file.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedFile(file)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </DropdownMenuItem>
                {allowMove && (
                  <DropdownMenuItem>
                    <Move className="h-4 w-4 mr-2" />
                    Move
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {allowDelete && (
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => fileManager.operations.deleteFile(file.publicId)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>File Manager</span>
              {fileManager.selectedFiles.length > 0 && (
                <Badge variant="secondary">
                  {fileManager.selectedFiles.length} selected
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {allowUpload && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
              
              <Button variant="outline" onClick={fileManager.refresh}>
                <RefreshCw className={`h-4 w-4 mr-2 ${fileManager.loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button variant="outline" onClick={fileManager.sync.sync}>
                <RefreshCw className={`h-4 w-4 mr-2 ${fileManager.sync.syncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              
              {showStats && (
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stats
                </Button>
              )}
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={fileManager.search.query}
                  onChange={(e) => fileManager.search.search(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Type
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => fileManager.typeFilter.clearTypes()}>
                    Clear All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.values(FileResourceType).map(type => (
                    <DropdownMenuItem 
                      key={type}
                      onClick={() => fileManager.typeFilter.toggleType(type as FileResourceType)}
                    >
                      <Checkbox 
                        checked={fileManager.typeFilter.selectedTypes.includes(type as FileResourceType)}
                        className="mr-2"
                      />
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Category
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => fileManager.categoryFilter.clearCategories()}>
                    Clear All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.values(FileCategory).map(category => (
                    <DropdownMenuItem 
                      key={category}
                      onClick={() => fileManager.categoryFilter.toggleCategory(category)}
                    >
                      <Checkbox 
                        checked={fileManager.categoryFilter.selectedCategories.includes(category)}
                        className="mr-2"
                      />
                      {category.replace('_', ' ')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch actions */}
      {fileManager.selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={fileManager.selectAllFiles}
                >
                  {fileManager.isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  onClick={fileManager.clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                {allowMove && (
                  <Button variant="outline">
                    <Move className="h-4 w-4 mr-2" />
                    Move ({fileManager.selectedFiles.length})
                  </Button>
                )}
                
                {allowDelete && (
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteFiles}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({fileManager.selectedFiles.length})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files grid/list */}
      <Card>
        <CardContent className="p-6">
          {fileManager.loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading files...</span>
            </div>
          ) : fileManager.files.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-600 mb-4">
                {fileManager.search.query || 
                 fileManager.typeFilter.selectedTypes.length > 0 || 
                 fileManager.categoryFilter.selectedCategories.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first file to get started'
                }
              </p>
              {allowUpload && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{fileManager.total} files total</span>
                <span>Page {fileManager.currentPage} of {fileManager.totalPages}</span>
              </div>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {fileManager.files.map(renderFileItem)}
                </div>
              ) : (
                <div className="space-y-2">
                  {fileManager.files.map(renderListItem)}
                </div>
              )}
              
              {/* Pagination */}
              {fileManager.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fileManager.prevPage}
                    disabled={!fileManager.hasPrevPage}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, fileManager.totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={fileManager.currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => fileManager.goToPage(page)}
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fileManager.nextPage}
                    disabled={!fileManager.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="images">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="images">
              <FileUpload
                fileType="image"
                folder="images"
                maxSize={10}
                onUploadComplete={handleFileUpload}
                onUploadError={handleFileUploadError}
              />
            </TabsContent>
            
            <TabsContent value="videos">
              <FileUpload
                fileType="video"
                folder="videos"
                maxSize={100}
                onUploadComplete={handleFileUpload}
                onUploadError={handleFileUploadError}
              />
            </TabsContent>
            
            <TabsContent value="audio">
              <FileUpload
                fileType="audio"
                folder="audio"
                maxSize={50}
                onUploadComplete={handleFileUpload}
                onUploadError={handleFileUploadError}
              />
            </TabsContent>
            
            <TabsContent value="documents">
              <FileUpload
                fileType="document"
                folder="documents"
                maxSize={25}
                onUploadComplete={handleFileUpload}
                onUploadError={handleFileUploadError}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* File Details Dialog */}
      {selectedFile && (
        <FileDetailsDialog
          file={selectedFile}
          open={!!selectedFile}
          onOpenChange={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}

// File Details Dialog Component
interface FileDetailsDialogProps {
  file: ServerFileAsset
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FileDetailsDialog: React.FC<FileDetailsDialogProps> = ({
  file,
  open,
  onOpenChange
}) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File preview */}
          <div className="flex justify-center">
            {file.resourceType === 'IMAGE' ? (
              <div className="w-64 h-64 relative rounded overflow-hidden">
                <Image
                  src={file.secureUrl}
                  alt={file.fileName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">
                    {file.resourceType === 'VIDEO' ? '🎥' : 
                     file.resourceType === 'AUDIO' ? '🎵' : '📄'}
                  </div>
                  <p className="text-gray-600">{file.fileName}</p>
                </div>
              </div>
            )}
          </div>

          {/* File information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">File Name</label>
              <p className="text-sm text-gray-900">{file.fileName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Format</label>
              <p className="text-sm text-gray-900">{file.format.toUpperCase()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Size</label>
              <p className="text-sm text-gray-900">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <p className="text-sm text-gray-900">{file.resourceType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Folder</label>
              <p className="text-sm text-gray-900">{file.folder}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Uploaded</label>
              <p className="text-sm text-gray-900">{formatDate(file.createdAt)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
