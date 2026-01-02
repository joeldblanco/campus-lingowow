'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createCourse } from '@/lib/actions/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { FileUpload } from '@/components/ui/file-upload'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import { CreateCourseSchema } from '@/schemas/courses'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface CreateCourseDialogProps {
  children: React.ReactNode
  onCourseCreated?: () => void
}

export function CreateCourseDialog({ children, onCourseCreated }: CreateCourseDialogProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof CreateCourseSchema>>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: {
      title: '',
      description: '',
      language: '',
      level: '',
      classDuration: 40,
      image: '',
      isPersonalized: false,
      isSynchronous: false,
      createdById: session?.user?.id || '',
    },
  })

  const onSubmit = async (values: z.infer<typeof CreateCourseSchema>) => {
    if (!session?.user?.id) {
      toast.error('Debes estar autenticado para crear un curso')
      return
    }

    setIsLoading(true)
    try {
      const result = await createCourse({
        ...values,
        createdById: session.user.id,
      })

      if (result.success) {
        toast.success('Curso creado exitosamente')
        setOpen(false)
        form.reset()
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
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto" data-testid="create-course-dialog">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Curso</DialogTitle>
          <DialogDescription>
            Completa la información básica para crear un nuevo curso.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Curso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Programa Regular de Inglés"
                        data-testid="title-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="title-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el contenido y objetivos del curso..."
                        data-testid="description-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="description-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="language-input">
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Inglés">Inglés</SelectItem>
                        <SelectItem value="Español">Español</SelectItem>
                        <SelectItem value="Francés" disabled>Francés (Próximamente)</SelectItem>
                        <SelectItem value="Alemán" disabled>Alemán (Próximamente)</SelectItem>
                        <SelectItem value="Italiano" disabled>Italiano (Próximamente)</SelectItem>
                        <SelectItem value="Portugués" disabled>Portugués (Próximamente)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="language-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="level-input">
                          <SelectValue placeholder="Selecciona un nivel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Principiante">Principiante</SelectItem>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Intermedio">Intermedio</SelectItem>
                        <SelectItem value="Avanzado">Avanzado</SelectItem>
                        <SelectItem value="Conversacional">Conversacional</SelectItem>
                        <SelectItem value="Especializado">Especializado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="level-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración de Clase</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="class-duration-input">
                          <SelectValue placeholder="Selecciona la duración" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="40">40 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                        <SelectItem value="90">90 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="class-duration-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen del curso</FormLabel>
                    <FormControl>
                      <FileUpload
                        fileType="image"
                        folder="courses"
                        onUploadComplete={(result) => {
                          field.onChange(result.secure_url)
                        }}
                        onUploadError={(error) => {
                          console.error('Upload error:', error)
                          toast.error('Error al subir la imagen')
                        }}
                        className="mb-4"
                      />
                    </FormControl>
                    {field.value && (
                      <div className="mt-2">
                        <Image
                          src={field.value}
                          alt="Vista previa del curso"
                          width={80}
                          height={80}
                          className="object-cover rounded border"
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSynchronous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Curso Sincrónico</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Activa si el curso requiere clases en vivo con horario programado.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPersonalized"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Programa Personalizado</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Activa esta opción si cada estudiante tendrá contenido único creado por su profesor.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="save-course-button">
                {isLoading ? 'Creando...' : 'Crear Curso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
