'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Image as ImageIcon, Search, Check, Upload, Loader2 } from 'lucide-react'
import { listFiles, ServerFileAsset } from '@/lib/actions/file-manager'
import { FileResourceType } from '@prisma/client'
import Image from 'next/image'
import { toast } from 'sonner'
import { uploadImageFile } from '@/lib/actions/cloudinary'

interface ImageSelectorProps {
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function ImageSelector({ value, onChange, disabled }: ImageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<ServerFileAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | undefined>(value)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      loadImages()
    }
  }, [open])

  useEffect(() => {
    setSelectedImage(value)
  }, [value])

  const loadImages = async () => {
    try {
      setLoading(true)
      const result = await listFiles({
        resourceType: FileResourceType.IMAGE,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })

      if (result.success && result.data) {
        setImages(result.data.files)
      } else {
        toast.error('Error al cargar las imágenes')
      }
    } catch (error) {
      console.error('Error loading images:', error)
      toast.error('Error al cargar las imágenes')
    } finally {
      setLoading(false)
    }
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new window.Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Resize if image is too large (max 2000px)
          const maxDimension = 2000
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            'image/jpeg',
            0.85 // Quality 85%
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido')
      return
    }

    try {
      setUploading(true)
      
      let fileToUpload = file
      
      // Compress if file is larger than 10MB
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.info('Comprimiendo imagen...')
        try {
          fileToUpload = await compressImage(file)
          
          // Check if compressed file is still too large
          if (fileToUpload.size > maxSize) {
            toast.error('La imagen es demasiado grande incluso después de comprimirla. Intenta con una imagen más pequeña.')
            return
          }
          
          toast.success('Imagen comprimida exitosamente')
        } catch (compressionError) {
          console.error('Compression error:', compressionError)
          toast.error('Error al comprimir la imagen. Intenta con una imagen más pequeña.')
          return
        }
      }
      
      // Create FormData
      const formData = new FormData()
      formData.append('file', fileToUpload)

      // Upload using server action (more secure)
      const result = await uploadImageFile(formData, 'products')

      if (result.success && result.data) {
        // Set the uploaded image as selected
        setSelectedImage(result.data.secure_url)
        toast.success('Imagen cargada exitosamente')
        
        // Reload images list
        await loadImages()
      } else {
        toast.error(result.error || 'Error al subir la imagen')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error al cargar la imagen')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSelect = (url: string) => {
    setSelectedImage(url)
  }

  const handleConfirm = () => {
    if (selectedImage) {
      onChange(selectedImage)
      setOpen(false)
      toast.success('Imagen seleccionada')
    }
  }

  const filteredImages = images.filter((img) =>
    img.fileName.toLowerCase().includes(search.toLowerCase()) ||
    img.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {value ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Gestionar Imagen del Producto</DialogTitle>
          <DialogDescription>
            Carga una nueva imagen o selecciona una existente de la biblioteca
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Cargar Nueva
            </TabsTrigger>
            <TabsTrigger value="library">
              <ImageIcon className="mr-2 h-4 w-4" />
              Biblioteca
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4 overflow-y-auto flex-1">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="space-y-4">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando imagen...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Arrastra una imagen aquí o haz click para seleccionar</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF hasta 10MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Seleccionar Archivo
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selectedImage && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Imagen seleccionada:</p>
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={selectedImage}
                    alt="Imagen seleccionada"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-4 overflow-y-auto flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imágenes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Current selection preview */}
            {value && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Imagen actual:</p>
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={value}
                    alt="Imagen actual"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}

          {/* Images grid */}
          <ScrollArea className="flex-1 w-full rounded-md border p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Cargando imágenes...</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {search ? 'No se encontraron imágenes' : 'No hay imágenes disponibles'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => handleSelect(image.secureUrl)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedImage === image.secureUrl
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image.secureUrl}
                      alt={image.fileName}
                      fill
                      className="object-cover"
                    />
                    {selectedImage === image.secureUrl && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-1 text-xs truncate">
                      {image.fileName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedImage}
          >
            Confirmar selección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
