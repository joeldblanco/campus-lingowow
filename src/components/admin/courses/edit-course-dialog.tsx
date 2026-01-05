'use client'

import { useState } from 'react'
import { updateCourse } from '@/lib/actions/courses'
import { CourseWithDetails } from '@/types/course'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { toast } from 'sonner'
import { EditCourseSchema } from '@/schemas/courses'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { FileUpload } from '@/components/ui/file-upload'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import { DollarSign } from 'lucide-react'

interface EditCourseDialogProps {
  course: CourseWithDetails
  children: React.ReactNode
  onCourseUpdated?: () => void
}

type FormData = z.infer<typeof EditCourseSchema>

export function EditCourseDialog({ course, children, onCourseUpdated }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(EditCourseSchema),
    defaultValues: {
      title: course.title,
      description: course.description,
      language: course.language,
      level: course.level,
      classDuration: course.classDuration || 40,
      image: course.image || '',
      isPersonalized: course.isPersonalized || false,
      isSynchronous: course.isSynchronous || false,
      defaultPaymentPerClass: course.defaultPaymentPerClass ?? null,
    },
  })

  const onSubmit = async (values: FormData) => {
    try {
      const result = await updateCourse(course.id, values)

      if (result.success) {
        toast.success('Curso actualizado exitosamente')
        setOpen(false)
        onCourseUpdated?.()
      } else {
        toast.error(result.error || 'Error al actualizar el curso')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al actualizar el curso')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto" data-testid="edit-course-dialog">
        <DialogHeader>
          <DialogTitle>Editar Curso</DialogTitle>
          <DialogDescription>Modifica la información del curso.</DialogDescription>
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
                        data-testid="title-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                        data-testid="description-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                          <SelectValue />
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
                    <FormMessage />
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
                          <SelectValue />
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
                    <FormMessage />
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="40">40 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                        <SelectItem value="90">90 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                name="defaultPaymentPerClass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pago por Clase (Por Defecto)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Ej: 10.00"
                          className="pl-9"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === '' ? null : parseFloat(value))
                          }}
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Monto que recibirá el profesor por cada clase de este curso. Puede personalizarse por profesor.
                    </p>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="cancel-button">
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} data-testid="save-course-button">
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
