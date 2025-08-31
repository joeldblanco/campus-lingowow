'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createCourse } from '@/lib/actions/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FileUpload } from '@/components/ui/file-upload'
import Image from 'next/image'

interface CreateCourseDialogProps {
  children: React.ReactNode
  onCourseCreated?: () => void
}

export function CreateCourseDialog({ children, onCourseCreated }: CreateCourseDialogProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: '',
    level: '',
    image: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast.error('Debes estar autenticado para crear un curso')
      return
    }

    setIsLoading(true)
    try {
      const result = await createCourse({
        ...formData,
        createdById: session.user.id,
      })

      if (result.success) {
        toast.success('Curso creado exitosamente')
        setOpen(false)
        setFormData({
          title: '',
          description: '',
          language: '',
          level: '',
          image: '',
        })
        onCourseCreated?.()
      } else {
        toast.error(result.error || 'Error al crear el curso')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al crear el curso')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Curso</DialogTitle>
          <DialogDescription>
            Completa la información básica para crear un nuevo curso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título del Curso</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Programa Regular de Inglés"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el contenido y objetivos del curso..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inglés">Inglés</SelectItem>
                  <SelectItem value="Español">Español</SelectItem>
                  <SelectItem value="Francés">Francés</SelectItem>
                  <SelectItem value="Alemán">Alemán</SelectItem>
                  <SelectItem value="Italiano">Italiano</SelectItem>
                  <SelectItem value="Portugués">Portugués</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Nivel</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Principiante">Principiante</SelectItem>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzado">Avanzado</SelectItem>
                  <SelectItem value="Conversacional">Conversacional</SelectItem>
                  <SelectItem value="Especializado">Especializado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Imagen del curso</Label>
              <FileUpload
                fileType="image"
                folder="courses"
                onUploadComplete={(result) => {
                  setFormData({ ...formData, image: result.secure_url })
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error)
                  toast.error('Error al subir la imagen')
                }}
                className="mb-4"
              />
              {formData.image && (
                <div className="mt-2">
                  <Image 
                    src={formData.image} 
                    alt="Vista previa del curso" 
                    width={80}
                    height={80}
                    className="object-cover rounded border"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Curso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
