'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateModule } from '@/lib/actions/modules'
import { EditModuleSchema } from '@/schemas/modules'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

interface ModuleData {
  id: string
  title: string
  description: string | null
  level: string
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
type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

const VALID_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function getValidLevel(level: string | number | null | undefined): CEFRLevel {
  if (typeof level === 'string' && VALID_LEVELS.includes(level as CEFRLevel)) {
    return level as CEFRLevel
  }
  return 'A1'
}

export function EditModuleDialog({ children, module, onModuleUpdated }: EditModuleDialogProps) {
  const [open, setOpen] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(EditModuleSchema),
    defaultValues: {
      title: module.title || '',
      description: module.description || '',
      level: getValidLevel(module.level),
      order: module.order || 1,
      objectives: '',
    },
  })

  // Reset form values when module changes
  useEffect(() => {
    form.reset({
      title: module.title || '',
      description: module.description || '',
      level: getValidLevel(module.level),
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
                      <FormLabel>Nivel MCER</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
