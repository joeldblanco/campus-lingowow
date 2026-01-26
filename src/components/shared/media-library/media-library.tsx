'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Upload, 
  Check,
  Loader2,
  FolderOpen,
  ArrowLeft,
  Home,
  Settings
} from 'lucide-react'
import { useAdvancedFileManager } from '@/hooks/use-file-manager'
import { FileResourceType } from '@prisma/client'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { MediaItem } from './media-item'
import { MediaUpload } from './media-upload'
import { MediaPreview } from './media-preview'
import { FolderItem } from './folder-item'
import { cn } from '@/lib/utils'

export interface MediaLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (files: ServerFileAsset[]) => void
  allowedTypes?: FileResourceType[]
  initialFolder?: string
  multiple?: boolean
  maxSelection?: number
  builder?: 'lesson' | 'exam' | 'resource'
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  open,
  onOpenChange,
  onSelect,
  allowedTypes = [],
  initialFolder = '',
  multiple = false,
  maxSelection = 10,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  builder = 'lesson' // Keep prop for interface compatibility but not used
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<ServerFileAsset[]>([])
  const [previewFile, setPreviewFile] = useState<ServerFileAsset | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')
  const [folderIconSize, setFolderIconSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [currentFolder, setCurrentFolder] = useState<string>(
  initialFolder ? `campus-lingowow/${initialFolder}` : 'campus-lingowow'
)

  // Get builder filters - DISABLED: Always show all content
  const getBuilderFilters = useCallback(() => {
    const baseFolder = 'campus-lingowow'
    
    // Always return the same configuration regardless of builder type
    return { 
      folder: initialFolder ? `${baseFolder}/${initialFolder}` : baseFolder, 
      allowedTypes: allowedTypes.length > 0 ? allowedTypes : [FileResourceType.IMAGE, FileResourceType.VIDEO, FileResourceType.AUDIO, FileResourceType.DOCUMENT]
    }
  }, [initialFolder, allowedTypes])

  const builderFilters = getBuilderFilters()

  // Initialize file manager with builder-specific filters
  const fileManager = useAdvancedFileManager({
    folder: builderFilters.folder,
    resourceType: builderFilters.allowedTypes[0],
    limit: 20
  })

  // Handle file selection
  const handleFileSelect = useCallback((file: ServerFileAsset) => {
    if (multiple) {
      const isSelected = selectedFiles.some(f => f.publicId === file.publicId)
      if (isSelected) {
        setSelectedFiles(prev => prev.filter(f => f.publicId !== file.publicId))
      } else if (selectedFiles.length < maxSelection) {
        setSelectedFiles(prev => [...prev, file])
      }
    } else {
      setSelectedFiles([file])
      onSelect([file])
      onOpenChange(false)
    }
  }, [multiple, maxSelection, selectedFiles, onSelect, onOpenChange])

  // Handle multiple selection confirmation
  const handleConfirmSelection = useCallback(() => {
    if (selectedFiles.length > 0) {
      onSelect(selectedFiles)
      onOpenChange(false)
      setSelectedFiles([])
    }
  }, [selectedFiles, onSelect, onOpenChange])

  // Handle file preview
  const handlePreview = useCallback((file: ServerFileAsset) => {
    setPreviewFile(file)
  }, [])

  // Handle upload completion
  const handleUploadComplete = useCallback((files: ServerFileAsset[]) => {
    setShowUpload(false)
    fileManager.refresh()
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, maxSelection))
    } else if (files.length > 0) {
      onSelect(files)
      onOpenChange(false)
    }
  }, [multiple, maxSelection, onSelect, onOpenChange, fileManager])

  // Reset selection when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFiles([])
      setPreviewFile(null)
      setShowUpload(false)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Handle folder navigation
  const handleFolderClick = useCallback((folderPath: string) => {
    // Only allow navigation within campus-lingowow folder
    if (!folderPath.startsWith('campus-lingowow')) {
      return
    }
    setCurrentFolder(folderPath)
    fileManager.updateFilters({ folder: folderPath })
  }, [fileManager])

  const handleBackToRoot = useCallback(() => {
    const rootFolder = 'campus-lingowow'
    setCurrentFolder(rootFolder)
    fileManager.updateFilters({ folder: rootFolder })
  }, [fileManager])

  const handleBackToParent = useCallback(() => {
    const parentPath = currentFolder.split('/').slice(0, -1).join('/')
    // Ensure we don't go above campus-lingowow
    if (parentPath && parentPath.includes('campus-lingowow')) {
      setCurrentFolder(parentPath)
      fileManager.updateFilters({ folder: parentPath })
    } else {
      handleBackToRoot()
    }
  }, [currentFolder, fileManager, handleBackToRoot])

  // Build breadcrumb path
  const buildBreadcrumb = () => {
    if (!currentFolder || currentFolder === 'campus-lingowow') return []
    
    const parts = currentFolder.split('/').filter(Boolean)
    // Remove 'campus-lingowow' from parts since it's the root
    const campusIndex = parts.indexOf('campus-lingowow')
    const relevantParts = campusIndex >= 0 ? parts.slice(campusIndex + 1) : parts
    
    return relevantParts.map((part, index) => {
      const path = ['campus-lingowow', ...relevantParts.slice(0, index + 1)].join('/')
      return { name: part, path }
    })
  }

  const breadcrumb = buildBreadcrumb()

  // Filter folders to show only campus-lingowow and its subfolders (treat campus-lingowow as root)
  const filteredFolders = fileManager.folders.folders.filter(folder => {
    // Only show folders that start with campus-lingowow
    if (!folder.path.startsWith('campus-lingowow')) {
      return false
    }
    
    // If we're at campus-lingowow root, show direct subfolders
    if (currentFolder === 'campus-lingowow') {
      return folder.path !== 'campus-lingowow' && 
             folder.path.split('/').length === 2 // campus-lingowow/subfolder
    }
    
    // If we're in a subfolder, show subfolders within current level
    return folder.path.startsWith(currentFolder + '/') && 
           folder.path.split('/').length === currentFolder.split('/').length + 1
  })

  // Filter files by allowed types
  const filteredFiles = fileManager.files.filter((file: ServerFileAsset) => 
    builderFilters.allowedTypes.length === 0 || builderFilters.allowedTypes.includes(file.resourceType)
  )

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-screen h-screen !max-w-none !max-h-none p-0 rounded-none border-0 flex flex-col">
          <DialogHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <DialogTitle className="flex items-center gap-2">
                  Biblioteca de Medios
                  {selectedFiles.length > 0 && (
                    <Badge variant="secondary">
                      {selectedFiles.length} seleccionados
                    </Badge>
                  )}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir
                </Button>
              </div>
            </div>
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToRoot}
                className="h-6 px-2"
              >
                <Home className="h-3 w-3 mr-1" />
                Campus Lingowow
              </Button>
              
              {breadcrumb.map((crumb) => (
                <React.Fragment key={crumb.path}>
                  <span className="text-muted-foreground">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFolderClick(crumb.path)}
                    className="h-6 px-2"
                  >
                    {crumb.name}
                  </Button>
                </React.Fragment>
              ))}
              
              {currentFolder && currentFolder !== 'campus-lingowow' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToParent}
                  className="h-6 px-2 ml-2"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Atrás
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="border-b px-6 py-2 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="browse">Explorar Archivos</TabsTrigger>
                <TabsTrigger value="upload">Subir Archivos</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="browse" className="flex-1 p-6 pt-4 overflow-hidden flex flex-col min-h-0">
              {/* Search and Filters */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar archivos..."
                    value={fileManager.search.query}
                    onChange={(e) => fileManager.search.search(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Type Filters */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    {builderFilters.allowedTypes.map(type => (
                      <Button
                        key={type}
                        variant={fileManager.typeFilter.selectedTypes.includes(type) ? "default" : "outline"}
                        size="sm"
                        onClick={() => fileManager.typeFilter.toggleType(type)}
                      >
                        {type.split('_')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Files Grid/List */}
              <ScrollArea className="h-[400px]">
                {fileManager.loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Folders Section */}
                    {filteredFolders.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-muted-foreground">Carpetas</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFolderIconSize(folderIconSize === 'small' ? 'medium' : folderIconSize === 'medium' ? 'large' : 'small')}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              {folderIconSize}
                            </Button>
                          </div>
                        </div>
                        <div className={cn(
                          "grid gap-3",
                          folderIconSize === 'small' ? "grid-cols-4 md:grid-cols-6 lg:grid-cols-8" :
                          folderIconSize === 'medium' ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-6" :
                          "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        )}>
                          {filteredFolders.map((folder) => (
                            <FolderItem
                              key={folder.path}
                              folder={folder}
                              onClick={() => handleFolderClick(folder.path)}
                              iconSize={folderIconSize}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files Section */}
                    {filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FolderOpen className="h-12 w-12 mb-4" />
                        <p>No se encontraron archivos o carpetas</p>
                        <p className="text-sm">Intenta ajustar tus filtros o sube nuevos archivos</p>
                      </div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <p>No se encontraron archivos en esta carpeta</p>
                        <p className="text-sm">Intenta ajustar tus filtros o sube nuevos archivos</p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Archivos ({filteredFiles.length})
                        </h3>
                        <div className={cn(
                          "grid gap-2",
                          viewMode === 'grid' ? "grid-cols-4 md:grid-cols-6 lg:grid-cols-8" : "grid-cols-1"
                        )}>
                          {filteredFiles.map((file) => (
                            <MediaItem
                              key={file.publicId}
                              file={file}
                              isSelected={selectedFiles.some(f => f.publicId === file.publicId)}
                              onSelect={() => handleFileSelect(file)}
                              onPreview={() => handlePreview(file)}
                              viewMode={viewMode}
                              multiple={multiple}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </ScrollArea>

              {/* Pagination */}
              {fileManager.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {fileManager.currentPage} de {fileManager.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fileManager.prevPage}
                      disabled={!fileManager.hasPrevPage}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fileManager.nextPage}
                      disabled={!fileManager.hasNextPage}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="flex-1 p-6 pt-2">
              <MediaUpload
                onComplete={handleUploadComplete}
                allowedTypes={builderFilters.allowedTypes}
                folder={builderFilters.folder}
                multiple={true}
              />
            </TabsContent>
          </Tabs>
          </div>

          {/* Footer with Action Buttons */}
          <div className="border-t px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedFiles.length > 0 && (
                  <span>{selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                {multiple && (
                  <Button 
                    onClick={handleConfirmSelection}
                    disabled={selectedFiles.length === 0}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Seleccionar {selectedFiles.length} {selectedFiles.length === 1 ? 'Archivo' : 'Archivos'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewFile && (
        <MediaPreview
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="w-screen h-screen max-w-none p-0 rounded-none border-0">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle className="text-lg font-semibold">Biblioteca de Medios</DialogTitle>
            </DialogHeader>
            <MediaUpload
              onComplete={handleUploadComplete}
              allowedTypes={builderFilters.allowedTypes}
              folder={builderFilters.folder}
              multiple={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
