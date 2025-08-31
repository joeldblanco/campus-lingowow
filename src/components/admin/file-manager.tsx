'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/ui/file-upload'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Trash2, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCloudinaryFile } from '@/lib/actions/cloudinary'
import { FileUploadResult, UploadedFile } from '@/types/file'

export const FileManager: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder] = useState('all')

  const handleFileUpload = (result: FileUploadResult, folder: string) => {
    const newFile: UploadedFile = {
      id: result.public_id,
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format || 'unknown',
      resource_type: result.resource_type || 'raw',
      bytes: result.bytes || 0,
      created_at: result.created_at || new Date().toISOString(),
      folder: folder,
    }
    setUploadedFiles(prev => [newFile, ...prev])
  }

  const handleFileDelete = async (publicId: string) => {
    try {
      const result = await deleteCloudinaryFile(publicId)
      if (result.success) {
        setUploadedFiles(prev => prev.filter(file => file.public_id !== publicId))
        toast.success('File deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete file')
      }
    } catch {
      toast.error('Failed to delete file')
    }
  }

  const filteredFiles = uploadedFiles.filter(file => {
    const matchesSearch = file.public_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder
    return matchesSearch && matchesFolder
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Administrador de Archivos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Subir Archivos</TabsTrigger>
              <TabsTrigger value="images">Imágenes</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Imágenes</Label>
                  <FileUpload
                    fileType="image"
                    folder="images"
                    maxSize={10}
                    onUploadComplete={(result) => handleFileUpload(result, 'images')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Videos</Label>
                  <FileUpload
                    fileType="video"
                    folder="videos"
                    maxSize={100}
                    onUploadComplete={(result) => handleFileUpload(result, 'videos')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Audio</Label>
                  <FileUpload
                    fileType="audio"
                    folder="audio"
                    maxSize={50}
                    onUploadComplete={(result) => handleFileUpload(result, 'audio')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">Subir Documentos</Label>
                  <FileUpload
                    fileType="document"
                    folder="documents"
                    maxSize={25}
                    onUploadComplete={(result) => handleFileUpload(result, 'documents')}
                    onUploadError={(error) => toast.error(error)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar imágenes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles
                  .filter(file => file.resource_type === 'image')
                  .map((file) => (
                    <Card key={file.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <Image
                          src={file.secure_url}
                          alt={file.public_id}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => handleFileDelete(file.public_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{file.public_id}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="secondary">{file.format.toUpperCase()}</Badge>
                          <span className="text-xs text-gray-500">{formatFileSize(file.bytes)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar videos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredFiles
                  .filter(file => file.resource_type === 'video')
                  .map((file) => (
                    <Card key={file.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <video
                          src={file.secure_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => handleFileDelete(file.public_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{file.public_id}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="secondary">{file.format.toUpperCase()}</Badge>
                          <span className="text-xs text-gray-500">{formatFileSize(file.bytes)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {filteredFiles
                  .filter(file => file.resource_type === 'raw')
                  .map((file) => (
                    <Card key={file.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded">
                              <Badge variant="outline">{file.format.toUpperCase()}</Badge>
                            </div>
                            <div>
                              <p className="font-medium">{file.public_id}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(file.bytes)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Descargar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleFileDelete(file.public_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
