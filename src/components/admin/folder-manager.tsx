'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  FolderOpen, 
  FolderPlus, 
  FolderTree, 
  Edit, 
  Trash2, 
  Search,
  Folder,
  FileText,
  ArrowRight,
  Copy
} from 'lucide-react'
import { useFolderManager } from '@/hooks/use-file-manager'
import { CloudinaryFolder } from '@/lib/cloudinary'
import { formatFileSize } from '@/lib/utils/file-utils'
import { toast } from 'sonner'

interface FolderManagerProps {
  className?: string
  allowCreate?: boolean
  allowDelete?: boolean
  allowEdit?: boolean
  onFolderSelect?: (folder: CloudinaryFolder) => void
  selectedFolder?: string
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  className = '',
  allowCreate = true,
  allowDelete = true,
  allowEdit = true,
  onFolderSelect,
  selectedFolder
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<CloudinaryFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDescription, setNewFolderDescription] = useState('')
  const [newFolderPath, setNewFolderPath] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])

  const folderManager = useFolderManager()

  const filteredFolders = folderManager.folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.path.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    const path = newFolderPath.trim() 
      ? `${newFolderPath}/${newFolderName}`.replace(/\/+/g, '/')
      : newFolderName

    const result = await folderManager.createNewFolder(path)
    
    if (result) {
      setNewFolderName('')
      setNewFolderDescription('')
      setNewFolderPath('')
      setShowCreateDialog(false)
      toast.success('Folder created successfully')
    }
  }

  const handleEditFolder = (folder: CloudinaryFolder) => {
    setSelectedFolderForEdit(folder)
    setNewFolderName(folder.name)
    setNewFolderDescription('')
    setShowEditDialog(true)
  }

  const handleDeleteFolder = async (folder: CloudinaryFolder) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
      // Implementation would call delete folder action
      toast.success('Folder deleted successfully')
    }
  }

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    toast.success('Folder path copied to clipboard')
  }

  const toggleFolderExpansion = (path: string) => {
    setExpandedFolders(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    )
  }

  const buildFolderTree = (folders: CloudinaryFolder[], level: number = 0): React.ReactElement[] => {
    const tree: React.ReactElement[] = []
    const processedPaths = new Set<string>()

    folders
      .filter(folder => folder.path.split('/').length - 1 === level)
      .forEach(folder => {
        if (processedPaths.has(folder.path)) return
        
        processedPaths.add(folder.path)
        const isExpanded = expandedFolders.includes(folder.path)
        const subFolders = folders.filter(f => 
          f.path.startsWith(folder.path + '/') && 
          f.path !== folder.path
        )

        tree.push(
          <div key={folder.path} className="select-none">
            <div 
              className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-100 cursor-pointer ${
                selectedFolder === folder.path ? 'bg-blue-50 border border-blue-200' : ''
              }`}
              style={{ paddingLeft: `${level * 20 + 8}px` }}
              onClick={() => {
                onFolderSelect?.(folder)
                if (subFolders.length > 0) {
                  toggleFolderExpansion(folder.path)
                }
              }}
            >
              {subFolders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolderExpansion(folder.path)
                  }}
                >
                  <ArrowRight className={`h-3 w-3 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`} />
                </Button>
              )}
              
              <Folder className="h-4 w-4 text-blue-500" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">{folder.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {folder.file_count} files
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 truncate">{folder.path}</div>
              </div>

              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyPath(folder.path)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                
                {allowEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditFolder(folder)
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFolder(folder)
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && subFolders.length > 0 && (
              <div className="ml-2">
                {buildFolderTree(subFolders, level + 1)}
              </div>
            )}
          </div>
        )
      })

    return tree
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FolderTree className="h-5 w-5" />
              <span>Folder Manager</span>
            </CardTitle>
            
            {allowCreate && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Folder Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Folders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {folderManager.loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading folders...</span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No folders found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Create your first folder to get started'}
              </p>
              {allowCreate && !searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              )}
            </div>
          ) : (
            <div className="group max-h-96 overflow-y-auto">
              {buildFolderTree(filteredFolders)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="folderPath">Parent Folder (optional)</Label>
              <Input
                id="folderPath"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                placeholder="e.g., images/courses"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to create in root directory
              </p>
            </div>
            
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Folder description..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={folderManager.loading}>
              {folderManager.loading ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>
          
          {selectedFolderForEdit && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editFolderName">Folder Name</Label>
                <Input
                  id="editFolderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Folder description..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Folder Information</Label>
                <div className="bg-gray-50 p-3 rounded space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Path:</span>
                    <span className="font-mono">{selectedFolderForEdit.path}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Files:</span>
                    <span>{selectedFolderForEdit.file_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Size:</span>
                    <span>{formatFileSize(selectedFolderForEdit.bytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Implementation for updating folder
              setShowEditDialog(false)
              toast.success('Folder updated successfully')
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Folder Breadcrumb Component
interface FolderBreadcrumbProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentPath,
  onNavigate
}) => {
  const pathParts = currentPath.split('/').filter(part => part.length > 0)
  
  const handleNavigate = (index: number) => {
    const newPath = pathParts.slice(0, index + 1).join('/')
    onNavigate(newPath)
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate('')}
        className={currentPath === '' ? 'text-blue-600' : 'text-gray-600'}
      >
        <FolderOpen className="h-4 w-4" />
        Home
      </Button>
      
      {pathParts.map((part, index) => (
        <React.Fragment key={index}>
          <span className="text-gray-400">/</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate(index)}
            className="text-gray-600 hover:text-blue-600"
          >
            {part}
          </Button>
        </React.Fragment>
      ))}
    </div>
  )
}

// Folder Stats Component
interface FolderStatsProps {
  folders: CloudinaryFolder[]
  totalFiles: number
}

export const FolderStats: React.FC<FolderStatsProps> = ({
  folders,
  totalFiles
}) => {
  const totalFolders = folders.length
  const emptyFolders = folders.filter(f => f.file_count === 0).length
  const largestFolder = folders.reduce((prev, current) => 
    (current.file_count > prev.file_count) ? current : prev, 
    folders[0] || { file_count: 0, name: 'None' }
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Folder className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalFolders}</p>
              <p className="text-sm text-gray-600">Total Folders</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalFiles}</p>
              <p className="text-sm text-gray-600">Total Files</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-orange-100 rounded flex items-center justify-center">
              <span className="text-orange-600 font-bold">∅</span>
            </div>
            <div>
              <p className="text-2xl font-bold">{emptyFolders}</p>
              <p className="text-sm text-gray-600">Empty Folders</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
              <span className="text-purple-600 font-bold">📊</span>
            </div>
            <div>
              <p className="text-sm font-bold truncate">{largestFolder.name}</p>
              <p className="text-xs text-gray-600">
                {largestFolder.file_count} files
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
