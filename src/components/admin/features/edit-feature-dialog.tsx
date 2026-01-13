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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateFeature } from '@/lib/actions/commercial'
import { toast } from 'sonner'
const featureSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

type FeatureFormData = z.infer<typeof featureSchema>

interface Feature {
  id: string
  name: string
  description: string | null
  icon: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    planFeatures: number
  }
}

interface EditFeatureDialogProps {
  feature: Feature
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditFeatureDialog({ feature, open, onOpenChange }: EditFeatureDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      name: feature.name,
      description: feature.description || '',
      isActive: feature.isActive,
    },
  })

  useEffect(() => {
    form.reset({
      name: feature.name,
      description: feature.description || '',
      isActive: feature.isActive,
    })
  }, [feature, form])

  const onSubmit = async (data: FeatureFormData) => {
    setIsLoading(true)
    try {
      const result = await updateFeature(feature.id, {
        ...data,
        description: data.description || null,
        icon: null,
      })
      if (result.success) {
        toast.success('Característica actualizada correctamente')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar la característica')
      }
    } catch {
      toast.error('Error inesperado al actualizar la característica')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Característica</DialogTitle>
          <DialogDescription>
            Modifica los datos de la característica.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la característica" {...field} />
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
                      placeholder="Descripción de la característica (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Estado Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      La característica estará disponible para los planes
                    </div>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
