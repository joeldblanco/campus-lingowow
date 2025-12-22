'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/ui/file-upload'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Trash2, Download, Eye, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCloudinaryFile, getFileAssets, syncCloudinaryResources, GetFileAssetsParams } from '@/lib/actions/cloudinary'
import { FileUploadResult, UploadedFile } from '@/types/file'
import { FileAsset, FileResourceType } from '@prisma/client'

export const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('upload')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  const fetchFiles = useCallback(async (params: GetFileAssetsParams = {}) => {
    setLoading(true)
    try {
      const result = await getFileAssets({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...params
      })

      if (result.success && result.data) {
        setFiles(result.data)
        if (result.pagination) {
          setPagination(prev => ({ ...prev, ...result.pagination }))
        }
      } else {
        toast.error(result.error || 'Failed to fetch files')
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, searchTerm])

  useEffect(() => {
    if (activeTab === 'upload') return

    let resourceType: FileResourceType | undefined
    if (activeTab === 'images') resourceType = 'IMAGE'
    if (activeTab === 'videos') resourceType = 'VIDEO'
    if (activeTab === 'audio') resourceType = 'AUDIO'
    if (activeTab === 'documents') resourceType = 'RAW'

    fetchFiles({ resourceType })
  }, [fetchFiles, activeTab])

  const handleFileUpload = (result: FileUploadResult, folder: string) => {
    toast.success('File uploaded successfully')
    // Switch to the appropriate tab to see the new file
    if (folder === 'images') setActiveTab('images')
    if (folder === 'videos') setActiveTab('videos')
    if (folder === 'audio') setActiveTab('audio')
    if (folder === 'documents') setActiveTab('documents')

    // Refresh list (useEffect will trigger)
  }

  const handleFileDelete = async (publicId: string) => {
    try {
      const result = await deleteCloudinaryFile(publicId)
      if (result.success) {
        setFiles(prev => prev.filter(file => file.publicId !== publicId))
        toast.success('File deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete file')
      }
    } catch {
      toast.error('Failed to delete file')
    }
  }

  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncCloudinaryResources()
      if (result.success) {
        toast.success(result.data?.message || 'Sync successful')
        // Refresh current view
        let resourceType: FileResourceType | undefined
        if (activeTab === 'images') resourceType = 'IMAGE'
        if (activeTab === 'videos') resourceType = 'VIDEO'
        if (activeTab === 'audio') resourceType = 'AUDIO'
        if (activeTab === 'documents') resourceType = 'RAW'
        fetchFiles({ resourceType })
      } else {
        toast.error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync with Cloudinary')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderPagination = () => {
    if (pagination.pages <= 1) return null

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
          disabled={pagination.page <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Page {pagination.page} of {pagination.pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page >= pagination.pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
          disabled={pagination.page >= pagination.pages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Auto-sync on mount
  useEffect(() => {
    handleSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const renderFileGrid = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No files found
        </div>
      )
    }

    if (activeTab === 'documents') {
      return (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded">
                      <Badge variant="outline">{file.format.toUpperCase()}</Badge>
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[300px]" title={file.fileName}>{file.fileName}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={file.secureUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleFileDelete(file.publicId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="overflow-hidden">
            <div className={`relative ${activeTab === 'videos' ? 'aspect-video' : 'aspect-square'}`}>
              {activeTab === 'videos' || activeTab === 'audio' ? (
                <video
                  src={file.secureUrl}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={file.secureUrl}
                  alt={file.fileName}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                {activeTab !== 'videos' && activeTab !== 'audio' && (
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0" asChild>
                    <a href={file.secureUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFileDelete(file.publicId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium truncate" title={file.fileName}>{file.fileName}</p>
              <div className="flex justify-between items-center mt-2">
                <Badge variant="secondary">{file.format.toUpperCase()}</Badge>
                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Administrador de Archivos</CardTitle>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar con Cloudinary
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="upload">Subir Archivos</TabsTrigger>
              <TabsTrigger value="images">Imágenes</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Imágenes</Label>
                  <FileUpload
                    fileType="image"
                    folder="images"
                    maxSize={10}
                    onUploadComplete={(result) => handleFileUpload(result as any, 'images')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Videos</Label>
                  <FileUpload
                    fileType="video"
                    folder="videos"
                    maxSize={100}
                    onUploadComplete={(result) => handleFileUpload(result as any, 'videos')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Audio</Label>
                  <FileUpload
                    fileType="audio"
                    folder="audio"
                    maxSize={50}
                    onUploadComplete={(result) => handleFileUpload(result as any, 'audio')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Documentos</Label>
                  <FileUpload
                    fileType="document"
                    folder="documents"
                    maxSize={25}
                    onUploadComplete={(result) => handleFileUpload(result as any, 'documents')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>
              </div>
            </TabsContent>

            {['images', 'videos', 'audio', 'documents'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={`Buscar ${tab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => fetchFiles({
                    resourceType: tab === 'documents' ? 'RAW' : tab.toUpperCase().slice(0, -1) as any
                  })}>
                    <Filter className="h-4 w-4 mr-2" />
                    Refrescar
                  </Button>
                </div>

                {renderFileGrid()}
                {renderPagination()}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
