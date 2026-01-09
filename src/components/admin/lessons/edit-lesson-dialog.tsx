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
import { updateLesson, getCoursesForLessons, getModulesByCourse, getCourseIdByModule } from '@/lib/actions/lessons'
import { toast } from 'sonner'
import { EditLessonSchema } from '@/schemas/lessons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface LessonData {
  id: string
  title: string
  description: string
  order: number
  moduleId: string | null
}

interface EditLessonDialogProps {
  children: React.ReactNode
  lesson: LessonData
  onLessonUpdated: () => void
  onOptimisticUpdate?: (lessonId: string, moduleId: string, updates: { title: string; description: string; order: number; moduleId: string }) => Promise<void>
}

type FormData = z.infer<typeof EditLessonSchema>

export function EditLessonDialog({ children, lesson, onLessonUpdated, onOptimisticUpdate }: EditLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [modules, setModules] = useState<Array<{ id: string; title: string; order?: number }>>([])
  
  const form = useForm<FormData>({
    resolver: zodResolver(EditLessonSchema),
    defaultValues: {
      title: lesson.title || '',
      description: lesson.description || '',
      content: '',
      moduleId: lesson.moduleId || '',
      order: lesson.order || 1,
      duration: 30,
      videoUrl: '',
      resources: '',
    },
  })

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [coursesData, courseId] = await Promise.all([
          getCoursesForLessons(),
          lesson.moduleId ? getCourseIdByModule(lesson.moduleId) : Promise.resolve(null)
        ])
        setCourses(coursesData)
        if (courseId) {
          setSelectedCourseId(courseId)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Error al cargar los datos')
      }
    }

    if (open) {
      loadInitialData()
    }
  }, [open, lesson.moduleId])

  // When a course is selected, fetch its modules in order
  useEffect(() => {
    const loadModulesByCourse = async () => {
      if (!selectedCourseId) {
        setModules([])
        return
      }
      try {
        const modulesData = await getModulesByCourse(selectedCourseId)
        setModules(modulesData)
      } catch (error) {
        console.error('Error loading modules by course:', error)
        toast.error('Error al cargar los módulos del curso')
      }
    }

    loadModulesByCourse()
  }, [selectedCourseId])

  // Reset form values when lesson changes
  useEffect(() => {
    form.reset({
      title: lesson.title || '',
      description: lesson.description || '',
      content: '',
      moduleId: lesson.moduleId || '',
      order: lesson.order || 1,
      duration: 30,
      videoUrl: '',
      resources: '',
    })
  }, [lesson, form])

  const onSubmit = async (values: FormData) => {
    try {
      if (onOptimisticUpdate && values.moduleId) {
        await onOptimisticUpdate(lesson.id, values.moduleId, {
          title: values.title,
          description: values.description || '',
          order: values.order,
          moduleId: values.moduleId,
        })
      } else {
        await updateLesson(lesson.id, values)
        onLessonUpdated()
      }
      toast.success('Lección actualizada exitosamente')
      setOpen(false)
    } catch (error) {
      console.error('Error updating lesson:', error)
      toast.error('Error al actualizar la lección')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Lección</DialogTitle>
          <DialogDescription>Modifica los detalles de la lección.</DialogDescription>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FormLabel>Curso *</FormLabel>
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
              </div>
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
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
