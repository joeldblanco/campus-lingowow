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
import { createLesson, getCoursesForLessons, getModulesByCourse } from '@/lib/actions/lessons'
import { toast } from 'sonner'
import { CreateLessonSchema } from '@/schemas/lessons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface CreateLessonDialogProps {
  children: React.ReactNode
  onLessonCreated: () => void
}

type FormData = z.infer<typeof CreateLessonSchema>

export function CreateLessonDialog({ children, onLessonCreated }: CreateLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [modules, setModules] = useState<Array<{ id: string; title: string; order?: number }>>([])
  
  const form = useForm<FormData>({
    resolver: zodResolver(CreateLessonSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      moduleId: '',
      order: 1,
      duration: 30,
      videoUrl: '',
      resources: '',
    },
  })

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [coursesData] = await Promise.all([getCoursesForLessons()])
        setCourses(coursesData)
      } catch (error) {
        console.error('Error loading courses:', error)
        toast.error('Error al cargar los cursos')
      }
    }

    if (open) {
      loadInitialData()
    }
  }, [open])

  // When a course is selected, fetch its modules in order
  useEffect(() => {
    const loadModulesByCourse = async () => {
      if (!selectedCourseId) {
        setModules([])
        form.setValue('moduleId', '')
        return
      }
      try {
        const modulesData = await getModulesByCourse(selectedCourseId)
        setModules(modulesData)
        // Reset module selection when course changes
        form.setValue('moduleId', '')
      } catch (error) {
        console.error('Error loading modules by course:', error)
        toast.error('Error al cargar los módulos del curso')
      }
    }

    loadModulesByCourse()
  }, [selectedCourseId, form])

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true)
      await createLesson(values)
      toast.success('Lección creada exitosamente')
      setOpen(false)
      form.reset()
      setSelectedCourseId('')
      setModules([])
      onLessonCreated()
    } catch (error) {
      console.error('Error creating lesson:', error)
      toast.error('Error al crear la lección')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Lección</DialogTitle>
          <DialogDescription>
            Crea una nueva lección dentro de un curso y módulo específicos.
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
                        placeholder="Ej: Introducción a los Saludos"
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
                    <FormLabel>Descripción *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de la lección..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contenido detallado de la lección..."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="course">Curso *</label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={(value) => setSelectedCourseId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
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
                </div>

                <FormField
                  control={form.control}
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Módulo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar módulo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!selectedCourseId ? (
                            <SelectItem value="no-modules" disabled>
                              Selecciona un curso primero
                            </SelectItem>
                          ) : modules.length === 0 ? (
                            <SelectItem value="no-modules" disabled>
                              No hay módulos disponibles para este curso
                            </SelectItem>
                          ) : (
                            modules.map((module) => (
                              <SelectItem key={module.id} value={module.id}>
                                {module.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Video (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resources"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recursos (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enlaces a recursos adicionales, archivos, etc..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Lección'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
