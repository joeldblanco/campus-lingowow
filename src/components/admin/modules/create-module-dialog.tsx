'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createModule, getAllCourses } from '@/lib/actions/modules'
import { toast } from 'sonner'
import { CreateModuleSchema } from '@/schemas/modules'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface Course {
  id: string
  title: string
  isPublished: boolean
}

interface CreateModuleDialogProps {
  children: React.ReactNode
  onModuleCreated: () => void
}

type FormData = z.infer<typeof CreateModuleSchema>

export function CreateModuleDialog({ children, onModuleCreated }: CreateModuleDialogProps) {
  const [open, setOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  
  const form = useForm<FormData>({
    resolver: zodResolver(CreateModuleSchema),
    defaultValues: {
      title: '',
      description: '',
      level: 'A1',
      order: 1,
      courseId: '',
      objectives: '',
      isPublished: false,
    },
  })

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesData = await getAllCourses()
        setCourses(coursesData)
      } catch (error) {
        console.error('Error loading courses:', error)
        toast.error('Error al cargar los cursos')
      }
    }

    if (open) {
      loadCourses()
    }
  }, [open])

  const onSubmit = async (values: FormData) => {
    try {
      await createModule(values)
      toast.success('Módulo creado exitosamente')
      setOpen(false)
      form.reset()
      onModuleCreated()
    } catch (error) {
      console.error('Error creating module:', error)
      toast.error('Error al crear el módulo')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Módulo</DialogTitle>
          <DialogDescription>
            Crea un nuevo módulo para organizar el contenido del curso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Introducción al Inglés Básico"
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
                        placeholder="Descripción del módulo..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar curso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses.length === 0 ? (
                            <SelectItem value="no-courses" disabled>
                              No hay cursos disponibles
                            </SelectItem>
                          ) : (
                            courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))
                          )}
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
                      <FormLabel>Nivel MCER</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar nivel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A1">A1 - Principiante</SelectItem>
                          <SelectItem value="A2">A2 - Elemental</SelectItem>
                          <SelectItem value="B1">B1 - Intermedio</SelectItem>
                          <SelectItem value="B2">B2 - Intermedio Alto</SelectItem>
                          <SelectItem value="C1">C1 - Avanzado</SelectItem>
                          <SelectItem value="C2">C2 - Maestría</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Publicar inmediatamente</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creando...' : 'Crear Módulo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
