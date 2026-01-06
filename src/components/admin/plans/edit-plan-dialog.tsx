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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePlan, updatePlanFeatures, getFeatures, getPlanPricing, upsertPlanPricing } from '@/lib/actions/commercial'
import { getAllCourses } from '@/lib/actions/courses'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { toast } from 'sonner'
import { Loader2, Globe } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

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
  paypalSku: z.string().optional(),
  includesClasses: z.boolean().default(false),
  classesPerPeriod: z.number().optional(),
  classesPerWeek: z.number().optional(),
  allowProration: z.boolean().default(true),
  autoRenewal: z.boolean().default(true),
  billingCycle: z.string().optional(),
})

type PlanFormData = z.infer<typeof planSchema>

interface PlanPricingData {
  id?: string
  language: string
  price: number
  comparePrice: number | null
  currency: string
  isActive: boolean
  paypalSku: string | null
  courseId: string | null
}

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
  paypalSku: string | null
  includesClasses: boolean
  classesPerPeriod: number | null
  classesPerWeek: number | null
  allowProration: boolean
  autoRenewal: boolean
  billingCycle: string | null
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
  pricing?: PlanPricingData[]
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
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string; language: string }>>([])
  const [pricingByLanguage, setPricingByLanguage] = useState<Record<string, PlanPricingData>>(() => {
    const initial: Record<string, PlanPricingData> = {}
    for (const lang of SUPPORTED_LANGUAGES) {
      const existing = plan.pricing?.find(p => p.language === lang.code)
      initial[lang.code] = existing ? {
        ...existing,
        courseId: existing.courseId || null,
      } : {
        language: lang.code,
        price: plan.price,
        comparePrice: plan.comparePrice,
        currency: 'USD',
        isActive: false,
        paypalSku: null,
        courseId: null,
      }
    }
    return initial
  })
  const [activePricingTab, setActivePricingTab] = useState<string>(SUPPORTED_LANGUAGES[0].code)

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
      paypalSku: plan.paypalSku || '',
      includesClasses: plan.includesClasses,
      classesPerPeriod: plan.classesPerPeriod || undefined,
      classesPerWeek: plan.classesPerWeek || undefined,
      allowProration: plan.allowProration,
      autoRenewal: plan.autoRenewal,
      billingCycle: plan.billingCycle || undefined,
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
      paypalSku: plan.paypalSku || '',
      includesClasses: plan.includesClasses,
      classesPerPeriod: plan.classesPerPeriod || undefined,
      classesPerWeek: plan.classesPerWeek || undefined,
      allowProration: plan.allowProration,
      autoRenewal: plan.autoRenewal,
      billingCycle: plan.billingCycle || undefined,
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
    
    // Load pricing data
    const loadPricing = async () => {
      const pricingData = await getPlanPricing(plan.id)
      const newPricing: Record<string, PlanPricingData> = {}
      for (const lang of SUPPORTED_LANGUAGES) {
        const existing = pricingData.find(p => p.language === lang.code)
        newPricing[lang.code] = existing ? {
          id: existing.id,
          language: existing.language,
          price: existing.price,
          comparePrice: existing.comparePrice,
          currency: existing.currency,
          isActive: existing.isActive,
          paypalSku: existing.paypalSku,
          courseId: existing.courseId || null,
        } : {
          language: lang.code,
          price: plan.price,
          comparePrice: plan.comparePrice,
          currency: 'USD',
          isActive: false,
          paypalSku: null,
          courseId: null,
        }
      }
      setPricingByLanguage(newPricing)
    }
    
    // Load available courses
    const loadCourses = async () => {
      const courses = await getAllCourses()
      setAvailableCourses(courses.map((c: { id: string; title: string; language: string }) => ({ id: c.id, title: c.title, language: c.language })))
    }
    
    if (open) {
      loadFeatures()
      loadPricing()
      loadCourses()
    }
  }, [plan, form, open])

  const onSubmit = async (data: PlanFormData) => {
    setIsLoading(true)
    try {
      // Update plan basic data
      const result = await updatePlan(plan.id, {
        ...data,
        comparePrice: data.comparePrice || null,
        paypalSku: data.paypalSku || null,
        classesPerPeriod: data.classesPerPeriod || null,
        classesPerWeek: data.classesPerWeek || null,
        billingCycle: data.billingCycle || null,
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
      
      if (!featuresResult.success) {
        toast.error(featuresResult.error || 'Error al actualizar las características')
        return
      }
      
      // Update pricing by language
      for (const langCode of Object.keys(pricingByLanguage)) {
        const pricing = pricingByLanguage[langCode]
        // Update if active OR if it already exists in DB (to allow deactivation)
        if (pricing.isActive || pricing.id) {
          await upsertPlanPricing({
            planId: plan.id,
            language: pricing.language,
            price: pricing.price,
            comparePrice: pricing.comparePrice,
            currency: pricing.currency,
            isActive: pricing.isActive,
            paypalSku: pricing.paypalSku,
            courseId: pricing.courseId,
          })
        }
      }
      
      toast.success('Plan actualizado correctamente')
      onOpenChange(false)
    } catch {
      toast.error('Error inesperado al actualizar el plan')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePricingChange = (
    language: string,
    field: keyof PlanPricingData,
    value: string | number | boolean | null
  ) => {
    setPricingByLanguage(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        [field]: value,
      },
    }))
  }
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Solo mostrar duración si el plan NO tiene curso asociado */}
            {!plan.includesClasses && (
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
            )}
            {plan.includesClasses && (
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
            )}
            {/* PayPal SKU */}
            <FormField
              control={form.control}
              name="paypalSku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PayPal SKU</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="sku-plan-regular (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    SKU configurado en PayPal para identificar este plan automáticamente
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Sección de Clases */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-4">Configuración de Clases</h3>
              
              <FormField
                control={form.control}
                name="includesClasses"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mb-4">
                    <div className="space-y-0.5">
                      <FormLabel>Incluye Clases</FormLabel>
                      <FormDescription>
                        Este plan incluye clases programadas
                      </FormDescription>
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

              {form.watch('includesClasses') && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="classesPerPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clases por Período</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="8"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>Total de clases en el período</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="classesPerWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clases por Semana</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="2"
                              min="1"
                              max="7"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>Máximo de clases semanales</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="billingCycle"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Ciclo de Facturación</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'no-cycle' ? undefined : value)} 
                          value={field.value || 'no-cycle'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un ciclo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no-cycle">Sin ciclo</SelectItem>
                            <SelectItem value="WEEKLY">Semanal</SelectItem>
                            <SelectItem value="MONTHLY">Mensual</SelectItem>
                            <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                            <SelectItem value="ANNUAL">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="allowProration"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Permite Prorateo</FormLabel>
                            <FormDescription>
                              Ajustar precio a mitad de período
                            </FormDescription>
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
                      name="autoRenewal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Renovación Automática</FormLabel>
                            <FormDescription>
                              Renovar al finalizar período
                            </FormDescription>
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
                </>
              )}
            </div>
            
            <Separator className="my-4" />
            
            {/* Sección de Precios por Idioma */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4" />
                <h3 className="text-sm font-medium">Precios por Idioma</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Configura precios diferentes para cada idioma. Si un idioma no está activo, se usará el precio base.
              </p>
              
              <Tabs value={activePricingTab} onValueChange={setActivePricingTab}>
                <TabsList className="grid w-full grid-cols-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
                      <span>{lang.flag}</span>
                      {lang.name}
                      {pricingByLanguage[lang.code]?.isActive && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {formatPrice(pricingByLanguage[lang.code].price)}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <TabsContent key={lang.code} value={lang.code} className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">Precio para {lang.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Activo</span>
                        <Switch
                          checked={pricingByLanguage[lang.code]?.isActive || false}
                          onCheckedChange={(checked) => handlePricingChange(lang.code, 'isActive', checked)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Precio</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingByLanguage[lang.code]?.price || 0}
                          onChange={(e) => handlePricingChange(lang.code, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <FormLabel>Precio de Comparación</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingByLanguage[lang.code]?.comparePrice || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                            handlePricingChange(lang.code, 'comparePrice', val)
                          }}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <FormLabel>PayPal SKU (opcional)</FormLabel>
                      <Input
                        value={pricingByLanguage[lang.code]?.paypalSku || ''}
                        onChange={(e) => handlePricingChange(lang.code, 'paypalSku', e.target.value || null)}
                        placeholder={`sku-${plan.slug}-${lang.code}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        SKU específico para PayPal para clases de {lang.name.toLowerCase()}
                      </p>
                    </div>
                    
                    <div>
                      <FormLabel>Curso Asociado</FormLabel>
                      <Select
                        value={pricingByLanguage[lang.code]?.courseId || 'none'}
                        onValueChange={(value) => handlePricingChange(lang.code, 'courseId', value === 'none' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar curso..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin curso asignado</SelectItem>
                          {availableCourses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title} ({course.language})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Curso al que se inscribirá el estudiante que compre este plan en {lang.name.toLowerCase()}
                      </p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
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
