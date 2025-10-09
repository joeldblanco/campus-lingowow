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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePlan, updatePlanFeatures, getFeatures } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor a 0'),
  comparePrice: z.number().optional(),
  duration: z.number().min(1, 'La duración debe ser mayor a 0'),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().min(0).default(0),
})

type PlanFormData = z.infer<typeof planSchema>

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  duration: number
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  features: Array<{
    planId: string
    featureId: string
    included: boolean
    value: string | null
    feature: {
      id: string
      name: string
      description: string | null
      icon: string | null
    }
  }>
  _count: {
    invoiceItems: number
  }
}

interface EditPlanDialogProps {
  plan: Plan
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPlanDialog({ plan, open, onOpenChange }: EditPlanDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [allFeatures, setAllFeatures] = useState<Array<{
    id: string
    name: string
    description: string | null
    icon: string | null
  }>>([])
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())
  const [loadingFeatures, setLoadingFeatures] = useState(true)

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price: plan.price,
      comparePrice: plan.comparePrice || undefined,
      duration: plan.duration,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
    },
  })

  useEffect(() => {
    form.reset({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price: plan.price,
      comparePrice: plan.comparePrice || undefined,
      duration: plan.duration,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
    })
    
    // Load features and set selected ones
    const loadFeatures = async () => {
      setLoadingFeatures(true)
      const features = await getFeatures()
      setAllFeatures(features)
      
      // Set currently selected features
      const selected = new Set(plan.features.map(f => f.featureId))
      setSelectedFeatures(selected)
      setLoadingFeatures(false)
    }
    
    if (open) {
      loadFeatures()
    }
  }, [plan, form, open])

  const onSubmit = async (data: PlanFormData) => {
    setIsLoading(true)
    try {
      // Update plan basic data
      const result = await updatePlan(plan.id, {
        ...data,
        comparePrice: data.comparePrice || null,
      })
      
      if (!result.success) {
        toast.error(result.error || 'Error al actualizar el plan')
        return
      }
      
      // Update plan features
      const features = Array.from(selectedFeatures).map(featureId => ({
        featureId,
        included: true,
        value: null,
      }))
      
      const featuresResult = await updatePlanFeatures(plan.id, features)
      
      if (featuresResult.success) {
        toast.success('Plan actualizado correctamente')
        onOpenChange(false)
      } else {
        toast.error(featuresResult.error || 'Error al actualizar las características')
      }
    } catch {
      toast.error('Error inesperado al actualizar el plan')
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleFeature = (featureId: string) => {
    const newSelected = new Set(selectedFeatures)
    if (newSelected.has(featureId)) {
      newSelected.delete(featureId)
    } else {
      newSelected.add(featureId)
    }
    setSelectedFeatures(newSelected)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Plan</DialogTitle>
          <DialogDescription>
            Modifica los datos del plan.
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
                    <Input placeholder="Nombre del plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="slug-del-plan" {...field} />
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
                      placeholder="Descripción del plan (opcional)"
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comparePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Comparación</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00 (opcional)"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (días)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Estado Activo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        El plan estará visible
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
              <FormField
                control={form.control}
                name="isPopular"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Plan Popular</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Destacar como popular
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
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-3">
              <FormLabel>Características del Plan</FormLabel>
              {loadingFeatures ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-3">
                    {allFeatures.map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`feature-${feature.id}`}
                          checked={selectedFeatures.has(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`feature-${feature.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            {feature.icon && <span>{feature.icon}</span>}
                            {feature.name}
                          </label>
                          {feature.description && (
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">
                Selecciona las características incluidas en este plan
              </p>
            </div>
            
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
