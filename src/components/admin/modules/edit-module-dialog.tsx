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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateModule, getAllCourses } from '@/lib/actions/modules'
import { toast } from 'sonner'
import { EditModuleSchema } from '@/schemas/modules'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

interface ModuleData {
  id: string
  title: string
  description: string | null
  level: number
  order: number
  isPublished: boolean
  courseId: string
}

interface EditModuleDialogProps {
  children: React.ReactNode
  module: ModuleData
  onModuleUpdated: () => void
}

type FormData = z.infer<typeof EditModuleSchema>

export function EditModuleDialog({ children, module, onModuleUpdated }: EditModuleDialogProps) {
  const [open, setOpen] = useState(false)
  const [courses, setCourses] = useState<
    Array<{
      id: string
      title: string
    }>
  >([])
  
  const form = useForm<FormData>({
    resolver: zodResolver(EditModuleSchema),
    defaultValues: {
      title: module.title || '',
      description: module.description || '',
      level: module.level || 1,
      order: module.order || 1,
      objectives: '',
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

  // Reset form values when module changes
  useEffect(() => {
    form.reset({
      title: module.title || '',
      description: module.description || '',
      level: module.level || 1,
      order: module.order || 1,
      objectives: '',
    })
  }, [module, form])

  const onSubmit = async (values: FormData) => {
    try {
      await updateModule(module.id, values)
      toast.success('Módulo actualizado exitosamente')
      setOpen(false)
      onModuleUpdated()
    } catch (error) {
      console.error('Error updating module:', error)
      toast.error('Error al actualizar el módulo')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Módulo</DialogTitle>
          <DialogDescription>Modifica los detalles del módulo.</DialogDescription>
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
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              Nivel {level}
                            </SelectItem>
                          ))}
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
