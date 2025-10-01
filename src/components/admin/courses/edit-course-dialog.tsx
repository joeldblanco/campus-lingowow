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
      <DialogContent className="sm:max-w-[425px]" data-testid="edit-course-dialog">
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
